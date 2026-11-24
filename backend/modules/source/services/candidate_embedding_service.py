import logging
import json
import time
import threading
from functools import lru_cache
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types

from backend.common.services.ai.base import _get_gemini_key_list, get_gemini_api_key
from backend.core.database import get_db_connection

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768


class _EmbeddingKeyPool:
    """Thread-safe key pool that automatically rotates across all Gemini keys on 429 quota exhaustion."""
    def __init__(self):
        self._lock = threading.Lock()
        self._keys = _get_gemini_key_list()
        self._idx = 0
        self._cooldown_until = 0.0

    def is_cooling_down(self) -> bool:
        with self._lock:
            return time.time() < self._cooldown_until

    def mark_all_exhausted(self, cooldown_seconds: float = 120.0):
        with self._lock:
            self._cooldown_until = time.time() + cooldown_seconds
            logger.info(
                f"[EmbeddingKeyPool] All Gemini API keys reached daily quota. "
                f"Pausing semantic API calls for {int(cooldown_seconds)}s — search continues seamlessly using fast database text matching."
            )

    def refresh(self):
        with self._lock:
            self._keys = _get_gemini_key_list()

    def get_all_keys(self) -> List[str]:
        with self._lock:
            if not self._keys:
                self._keys = _get_gemini_key_list()
            return list(self._keys)

    def current_key(self) -> Optional[str]:
        with self._lock:
            if not self._keys:
                self._keys = _get_gemini_key_list()
            if not self._keys:
                return None
            return self._keys[self._idx % len(self._keys)]

    def rotate_on_failure(self, failed_key: Optional[str] = None) -> Optional[str]:
        with self._lock:
            if not self._keys:
                self._keys = _get_gemini_key_list()
            if not self._keys:
                return None
            curr = self._keys[self._idx % len(self._keys)]
            if failed_key and curr != failed_key:
                return curr
            self._idx = (self._idx + 1) % len(self._keys)
            new_key = self._keys[self._idx % len(self._keys)]
            masked = new_key[:6] + '...' + new_key[-4:] if len(new_key) > 10 else 'short_key'
            logger.info(f"[EmbeddingKeyPool] Rotated to key {self._idx + 1}/{len(self._keys)} ({masked})")
            return new_key


_KEY_POOL = _EmbeddingKeyPool()


@lru_cache(maxsize=2048)
def embed_text(text: str) -> Optional[List[float]]:
    """
    Generates a 768-dimensional semantic embedding using Gemini embedding model.
    Cached in memory so repeated search queries resolve in 0ms.
    Automatically rotates through all available Gemini API keys on 429 quota exhaustion.
    """
    cleaned = (text or "").strip()
    if not cleaned or len(cleaned) < 3:
        return None

    if _KEY_POOL.is_cooling_down():
        return None

    if len(cleaned) > 2000:
        cleaned = cleaned[:2000]

    keys = _KEY_POOL.get_all_keys()
    if not keys:
        logger.debug("No Gemini API keys available for semantic embedding.")
        return None

    attempts = len(keys)
    all_exhausted = True
    for _ in range(attempts):
        api_key = _KEY_POOL.current_key()
        if not api_key:
            break
        try:
            client = genai.Client(api_key=api_key)
            res = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=cleaned,
                config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM)
            )
            if res and res.embeddings:
                return list(res.embeddings[0].values)
        except Exception as exc:
            err_str = str(exc)
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                masked = api_key[:6] + '...' + api_key[-4:] if len(api_key) > 10 else 'key'
                logger.debug(f"Gemini key ({masked}) quota exhausted. Rotating to next key...")
                _KEY_POOL.rotate_on_failure(failed_key=api_key)
                continue
            else:
                all_exhausted = False
                logger.warning(f"Embedding generation failed: {exc}")
                return None

    if all_exhausted:
        _KEY_POOL.mark_all_exhausted(cooldown_seconds=180.0)

    return None


def embed_texts(texts: List[str]) -> List[Optional[List[float]]]:
    """
    Batch generate embeddings for multiple texts.
    Falls back to individual cached calls if batch fails.
    """
    results: List[Optional[List[float]]] = []
    if not texts:
        return results

    api_key = get_gemini_api_key()
    if not api_key:
        return [None] * len(texts)

    cleaned_texts = [(t or "").strip()[:4000] for t in texts]
    
    # Check cache first
    uncached_indices = []
    for i, t in enumerate(cleaned_texts):
        if not t:
            results.append(None)
        else:
            # Check lru_cache directly
            hit = embed_text(t)
            results.append(hit)

    return results


def build_candidate_embedding_text(
    candidate: Dict[str, Any],
    experience: Optional[List[Dict[str, Any]]] = None,
    education: Optional[List[Dict[str, Any]]] = None
) -> str:
    """
    Builds a comprehensive semantic profile text from candidate record,
    skills, experience, and education history for vector representation.
    """
    parts = []

    full_name = candidate.get("full_name") or ""
    designation = candidate.get("current_designation") or ""
    exp_years = candidate.get("total_experience_years") or 0
    location = candidate.get("location") or ""

    header_parts = []
    if designation:
        header_parts.append(f"Title: {designation}")
    if exp_years:
        header_parts.append(f"Experience: {exp_years} years")
    if location:
        header_parts.append(f"Location: {location}")
    if header_parts:
        parts.append(" | ".join(header_parts))

    # Skills
    primary = candidate.get("primary_skills") or []
    if isinstance(primary, str):
        primary = [s.strip() for s in primary.split(",") if s.strip()]
    secondary = candidate.get("secondary_skills") or []
    if isinstance(secondary, str):
        secondary = [s.strip() for s in secondary.split(",") if s.strip()]
    tags = candidate.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    all_skills = list(dict.fromkeys(primary + secondary + tags))
    if all_skills:
        parts.append(f"Skills: {', '.join(all_skills[:50])}")

    # Summary
    ai_summary = candidate.get("ai_summary") or ""
    if ai_summary:
        parts.append(f"Career Summary: {ai_summary}")

    # Certifications
    certs = candidate.get("certifications")
    if certs:
        cert_names = []
        if isinstance(certs, list):
            for c in certs:
                if isinstance(c, dict) and c.get("name"):
                    issuer = f" ({c.get('issuer')})" if c.get("issuer") else ""
                    cert_names.append(f"{c['name']}{issuer}")
                elif isinstance(c, str):
                    cert_names.append(c)
        elif isinstance(certs, str):
            cert_names.append(certs)
        if cert_names:
            parts.append(f"Certifications: {', '.join(cert_names[:10])}")

    # Experience details (Roles, Duties & Responsibilities)
    if experience:
        exp_lines = []
        for exp in experience[:8]:
            comp = exp.get("company") or ""
            desig = exp.get("designation") or ""
            desc = (exp.get("description") or "").strip()
            line = f"- Role: {desig} at {comp}" if comp or desig else ""
            if desc:
                line += f". Responsibilities & Projects: {desc[:500]}"
            if line:
                exp_lines.append(line)
        if exp_lines:
            parts.append("Work Experience & Responsibilities:\n" + "\n".join(exp_lines))

    # Education details
    if education:
        edu_lines = []
        for edu in education[:4]:
            deg = edu.get("degree") or ""
            inst = edu.get("institution") or ""
            fos = edu.get("field_of_study") or ""
            item = f"- {deg} in {fos} from {inst}".strip()
            if item != "-":
                edu_lines.append(item)
        if edu_lines:
            parts.append("Education:\n" + "\n".join(edu_lines))

    semantic_doc = "\n\n".join(parts).strip()
    return semantic_doc[:6000]


def save_candidate_embedding(candidate_id: int, tenant_id: str, embedding: List[float]) -> bool:
    """
    Persists a candidate's vector embedding into PostgreSQL with tenant isolation.
    """
    if not embedding or len(embedding) != EMBEDDING_DIM:
        return False

    vec_str = f"[{','.join(map(str, embedding))}]"
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f'SET search_path TO "{tenant_id}", public;')
            cur.execute(
                "UPDATE candidates SET embedding = %s::vector WHERE id = %s;",
                (vec_str, candidate_id)
            )
            conn.commit()
            return cur.rowcount > 0
    except Exception as e:
        logger.error(f"Failed to save candidate embedding (id={candidate_id}): {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def embed_and_save_candidate(candidate_id: int, tenant_id: str = "public") -> bool:
    """
    Fetches full candidate details, generates embedding, and persists it.
    """
    conn = get_db_connection()
    candidate = None
    experience = []
    education = []
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}", public;')
            cur.execute("SELECT * FROM candidates WHERE id = %s;", (candidate_id,))
            candidate = cur.fetchone()
            if not candidate:
                return False

            cur.execute(
                "SELECT * FROM candidate_experience WHERE candidate_id = %s ORDER BY id DESC LIMIT 10;",
                (candidate_id,)
            )
            experience = cur.fetchall() or []

            cur.execute(
                "SELECT * FROM candidate_education WHERE candidate_id = %s ORDER BY id DESC LIMIT 5;",
                (candidate_id,)
            )
            education = cur.fetchall() or []
    finally:
        conn.close()

    if not candidate:
        return False

    text_doc = build_candidate_embedding_text(candidate, experience, education)
    if not text_doc.strip():
        name = candidate.get("full_name") or candidate.get("email") or "Candidate"
        text_doc = f"Candidate Profile: {name}"

    vec = embed_text(text_doc)
    if not vec:
        return False

    return save_candidate_embedding(candidate_id, tenant_id, vec)
