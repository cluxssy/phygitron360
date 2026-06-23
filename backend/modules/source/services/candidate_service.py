import os
import uuid
import math
import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.modules.source.repositories.candidate_repo import CandidateRepository
from backend.modules.source.repositories.skill_repo import SkillRepository
from backend.modules.source.repositories.ai_score_repo import AIScoreRepository
from backend.modules.source.services.ats_engine import calculate_role_fit, compute_resume_ats_score, normalise_required_skills
from backend.common.services.ai.agents import AIAgents

logger = logging.getLogger(__name__)

class CandidateService:
    def __init__(self, tenant_id: str = 'public'):
        self.tenant_id = tenant_id
        self.repo = CandidateRepository(tenant_id=tenant_id)
        self.skill_repo = SkillRepository(tenant_id=tenant_id)
        self.ai_score_repo = AIScoreRepository(tenant_id=tenant_id)
        self.ai_agents = AIAgents()
        
        # Define upload directory
        self.BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        self.UPLOAD_DIR = os.path.join(self.BASE_DIR, "data", self.tenant_id, "source", "resumes")
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)

    async def process_and_save_resume(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """
        Orchestrates resume upload, text extraction, AI parsing, and database saving.
        """
        # 1. Save File
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(filename)[1].lower()
        save_filename = f"{file_id}{ext}"
        file_path = os.path.join(self.UPLOAD_DIR, save_filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)

        # 2. Extract Text
        extracted_text = self._extract_text(file_path, ext)
        if not extracted_text.strip():
            raise ValueError("Could not extract any text from the file.")

        # 3. Parse with AI Engine (Using advanced AIAgents)
        ai_result = await self.ai_agents.parse_resume(extracted_text)
        if not ai_result or not ai_result.get("name"): # AI returns 'name'
            raise ValueError("AI could not parse useful data from this resume")

        # 4. Create or Update Candidate Record
        email = ai_result.get("email")
        if not email:
            email = f"unknown_{uuid.uuid4().hex[:8]}@phygitron.local"
            
        candidate_data = {
            "full_name": ai_result.get("name") or "Unknown Candidate",
            "email": email,
            "phone": ai_result.get("phone"),
            "location": ai_result.get("location"),
            "total_experience_years": ai_result.get("experience_years_total") or 0,
            "current_designation": ai_result.get("current_designation"),
            "current_company": ai_result.get("current_company"),
            "expected_salary": ai_result.get("expected_salary"),
            "notice_period": ai_result.get("notice_period"),
            "linkedin_url": ai_result.get("linkedin_url"),
            "portfolio_url": ai_result.get("portfolio_url"),
            "availability": ai_result.get("availability"),
            "ai_summary": ai_result.get("ai_summary"),
            "certifications": ai_result.get("certifications"),
            "languages": ai_result.get("languages"),
            "achievements": ai_result.get("achievements"),
            "resume_path": file_path,
            "source": "AI Resume Parse",
            "status": "New",
            "experience": ai_result.get("experience", []),
            "education": ai_result.get("education", [])
        }
        
        # We only try to upsert if we actually had a valid email from the AI.
        # If it's a generated unknown email, we force a new record so we don't accidentally overwrite.
        existing = None
        if "unknown_" not in candidate_data["email"]:
            existing = self.repo.get_candidate_by_email(candidate_data["email"])
            
        if existing:
            # Update existing candidate with freshly parsed data instead of failing
            candidate_id = existing["id"]
            self.repo.update_candidate(candidate_id, candidate_data)
            self.repo.log_activity(candidate_id, 'System', 'profile_updated', 'Profile updated via bulk resume re-upload')
        else:
            candidate_id = self.repo.create_candidate(candidate_data)
            self.repo.log_activity(candidate_id, 'System', 'profile_created', 'Profile created and parsed via AI')

        # 5. Process Skills from AI Result
        for skill_data in ai_result.get("skills", []):
            name = skill_data.get("name")
            if not name: continue
            
            # Get or create from taxonomy
            skill_record = self.skill_repo.get_skill_by_name(name)
            if not skill_record:
                skill_id = self.skill_repo.create_skill(name=name, category="extracted", aliases=[name])
            else:
                skill_id = skill_record['id']

            # Link to candidate
            self.repo.upsert_candidate_skill(candidate_id, skill_id, {
                "level": skill_data.get("level", "beginner"),
                "source": "resume",
                "years_of_use": skill_data.get("years_of_use"),
                "evidence": skill_data.get("evidence")
            })

        # 6. Process Confidence Signals
        confidence_signals = ai_result.get("confidence_signals", [])
        if confidence_signals:
            import json
            self.ai_score_repo.create_ai_score({
                "entity_type": "candidate",
                "entity_id": candidate_id,
                "job_role_id": None,
                "score_type": "confidence_signals",
                "score": 0,
                "reasoning": json.dumps(confidence_signals)
            })

        return {
            "candidate_id": candidate_id,
            "parsed_data": ai_result
        }

    def _extract_text(self, file_path: str, ext: str) -> str:
        """Extract plain text from a resume file. Always returns a clean string safe for DB storage."""
        extracted_text = ""
        try:
            if ext == ".pdf":
                import fitz
                try:
                    fitz.TOOLS.mupdf_display_errors(False)
                    fitz.TOOLS.mupdf_display_warnings(False)
                except Exception:
                    pass
                try:
                    with fitz.open(file_path) as pdf:
                        for page in pdf:
                            extracted_text += page.get_text() + "\n"
                except Exception as pdf_err:
                    logger.warning(f"PyMuPDF failed to parse {file_path}: {pdf_err}. Trying pdfplumber...")
                    extracted_text = ""
                
                # Fallback: if PyMuPDF extracted nothing, try pdfplumber
                if not extracted_text.strip():
                    try:
                        import pdfplumber
                        with pdfplumber.open(file_path) as pdf:
                            for page in pdf.pages:
                                extracted_text += (page.extract_text() or "") + "\n"
                    except Exception as pl_err:
                        logger.warning(f"pdfplumber fallback failed for {file_path}: {pl_err}")
            elif ext == ".txt":
                try:
                    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                        extracted_text = f.read()
                except Exception as e:
                    logger.warning(f"TXT read failed for {file_path}: {e}")
            elif ext in (".docx", ".doc"):
                try:
                    extracted_text = self._extract_docx_data(file_path)
                except Exception as e:
                    # Common case: Naukri exports HTML files but names them .doc
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        
                        # Binary .doc files contain random bytes that can accidentally match "<html" or "<table"
                        # in OLE metadata/headers. We check only the first 1024 characters to be safe.
                        content_lower_prefix = content[:1024].lower()
                        if "<html" in content_lower_prefix or "<table" in content_lower_prefix:
                            from bs4 import BeautifulSoup
                            soup = BeautifulSoup(content, "html.parser")
                            # Strip scripts and styles to avoid code extraction
                            for s in soup(["script", "style"]):
                                s.decompose()
                            extracted_text = soup.get_text(separator="\n", strip=True)
                        else:
                            # If it's a binary .doc and not HTML, try using system tools
                            import subprocess
                            import shutil
                            
                            cmd = None
                            if shutil.which("antiword"):
                                cmd = ["antiword", file_path]
                            elif shutil.which("catdoc"):
                                cmd = ["catdoc", file_path]
                            elif shutil.which("textutil"):
                                cmd = ["textutil", "-convert", "txt", "-stdout", file_path]
                                
                            if cmd:
                                result = subprocess.run(
                                    cmd, 
                                    capture_output=True, 
                                    text=True
                                )
                                if result.returncode == 0 and result.stdout.strip():
                                    extracted_text = result.stdout
                                else:
                                    logger.warning(f"System extraction tool failed for {file_path}")
                                    extracted_text = ""
                            else:
                                logger.warning(f"DOC extraction failed. Please install 'antiword' or 'catdoc' on your production server to parse legacy .doc files: {file_path}")
                                extracted_text = ""
                    except Exception as fallback_err:
                        logger.warning(f"DOCX/HTML extraction failed for {file_path}: {fallback_err} (Original error: {e})")
                        extracted_text = ""
        except Exception as e:
            logger.error(f"Text extraction failed for {file_path}: {e}")
            extracted_text = ""

        # Sanitize: strip NUL bytes and other control chars PostgreSQL rejects
        return self._sanitize_text(extracted_text)

    def _extract_docx_data(self, file_path: str) -> str:
        """Extracts text from paragraphs, tables, headers, footers, and textboxes inside a DOCX file."""
        from docx import Document
        doc = Document(file_path)
        full_text = []

        # 1. Extract from headers
        try:
            for section in doc.sections:
                if section.header:
                    for p in section.header.paragraphs:
                        if p.text.strip():
                            full_text.append(p.text.strip())
        except Exception as e:
            logger.debug(f"Header extraction skipped: {e}")

        # 2. Extract from main body paragraphs
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text.strip())

        # 3. Extract from tables (rows and cells)
        for table in doc.tables:
            for row in table.rows:
                row_text = []
                for cell in row.cells:
                    cell_paragraphs = [p.text.strip() for p in cell.paragraphs if p.text.strip()]
                    if cell_paragraphs:
                        row_text.append(" | ".join(cell_paragraphs))
                if row_text:
                    full_text.append(" | ".join(row_text))

        # 4. Extract from text boxes and shapes
        try:
            for txbx in doc.element.xpath('//w:txbxContent'):
                for p_elem in txbx.xpath('.//w:p'):
                    p_text = p_elem.text
                    if not p_text:
                        p_text = "".join([t.text for t in p_elem.xpath('.//w:t') if t.text])
                    if p_text.strip():
                        full_text.append(p_text.strip())
        except Exception as e:
            logger.debug(f"Textbox extraction skipped: {e}")

        # 5. Extract from footers
        try:
            for section in doc.sections:
                if section.footer:
                    for p in section.footer.paragraphs:
                        if p.text.strip():
                            full_text.append(p.text.strip())
        except Exception as e:
            logger.debug(f"Footer extraction skipped: {e}")

        return "\n".join(full_text)

    @staticmethod
    def _sanitize_text(text: str) -> str:
        """Remove NUL bytes and non-UTF8-safe characters before storing in PostgreSQL."""
        if not text:
            return ""
        # Remove NUL bytes (PostgreSQL TEXT columns reject \x00 entirely)
        text = text.replace('\x00', '')
        # Replace other non-printable control chars (except tab, newline, carriage return)
        import re
        text = re.sub(r'[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        return text.strip()

    def _extract_name_from_filename(self, filename: str) -> str:
        """Fallback to extract candidate name from file name if LLM couldn't find it."""
        if not filename:
            return ""
        # Remove extension
        name = os.path.splitext(filename)[0]
        # Remove Naukri_ prefix (case insensitive)
        name = re.sub(r'^naukri_', '', name, flags=re.I)
        # Remove bracketed experience e.g. [3y_8m]
        name = re.sub(r'\[.*?\]', '', name)
        # Remove common trailing terms like _SOC, _Resume, _CV, etc.
        name = re.sub(r'[-_](?:soc|resume|cv|new|latest|updated|profile|docs?)\b', '', name, flags=re.I)
        name = re.sub(r'\b(?:soc|resume|cv|new|latest|updated|profile|docs?)\b', '', name, flags=re.I)
        # Replace punctuation/spacing characters with spaces
        name = re.sub(r'[-_\.]', ' ', name)
        # Clean double spaces
        name = re.sub(r'\s+', ' ', name).strip()
        # Handle CamelCase: split words
        name = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', name)
        name = re.sub(r'\s+', ' ', name).strip()
        # Title case capitalization
        return name.title()

    def get_all_candidates(self, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        candidates = self.repo.get_all_candidates(page=page, page_size=page_size)
        total = self.repo.get_candidates_count()
        return {
            "candidates": candidates,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 0
        }

    def get_candidate(self, candidate_id: int) -> Optional[Dict[str, Any]]:
        return self.repo.get_candidate_by_id(candidate_id)

    def update_status(self, candidate_id: int, new_status: str, role_id: Optional[int] = None) -> bool:
        return self.repo.update_candidate_status(candidate_id, new_status, role_id=role_id)

    def add_note(self, candidate_id: int, author_name: str, content: str) -> Dict[str, Any]:
        return self.repo.add_candidate_note(candidate_id, author_name, content)

    def create_manual_candidate(self, data: Dict[str, Any], actor_name: str) -> int:
        candidate_id = self.repo.create_candidate(data)
        self.repo.log_activity(candidate_id, actor_name, "profile_created", "Manual candidate entry")
        return candidate_id

    def delete_candidate(self, candidate_id: int) -> bool:
        return self.repo.delete_candidate(candidate_id)

    def bulk_delete_candidates(self, candidate_ids: List[int]) -> int:
        return self.repo.bulk_delete_candidates(candidate_ids)

    def revert_employee(self, employee_id: int) -> bool:
        return self.repo.revert_employee(employee_id)

    # ── New Business Logic ───────────────────────────────────────────────────

    def search_candidates(
        self,
        pool: Optional[str] = None,
        location: Optional[str] = None,
        min_exp: Optional[float] = None,
        exp_range: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "newest",
        role_id: Optional[int] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        candidates = self.repo.search_candidates(
            pool=pool, location=location, min_exp=min_exp, exp_range=exp_range,
            search=search, sort_by=sort_by, limit=limit, role_id=role_id
        )

        req_skills = []
        role_min_exp = 0
        if role_id:
            from backend.modules.source.repositories.job_role_repo import JobRoleRepository
            role_repo = JobRoleRepository(tenant_id=self.tenant_id)
            role = role_repo.get_job_role_by_id(role_id)
            if role:
                req_skills = normalise_required_skills(
                    role.get("required_skills"),
                    title=role.get("title") or "",
                    description=role.get("description") or ""
                )
                role_min_exp = role.get("min_experience") or 0

        for cand in candidates:
            cand_skills = self.repo.get_candidate_skills(cand["id"])
            cand["structured_skills"] = cand_skills
            
            if role_id and req_skills:
                flat_skills = [{"name": s.get("skill_name") or s.get("name"), "level": s["level"]} for s in cand_skills]
                fit = calculate_role_fit(
                    flat_skills,
                    req_skills,
                    exp_years=int(cand.get("total_experience_years") or 0),
                    min_exp=role_min_exp
                )
                cand["fit_score"] = fit["score"]
                cand["ats_detail"] = fit
            else:
                cand["fit_score"] = compute_resume_ats_score(cand)

        if sort_by == "fit_score":
            candidates.sort(key=lambda c: c.get("fit_score", 0), reverse=True)

        return candidates

    def get_active_candidates(self) -> List[Dict[str, Any]]:
        rows = self.repo.get_active_candidates()
        
        # Dynamically calculate fit score if missing or 0, just like directory search does
        for row in rows:
            role_id = row.get("job_role_id")
            if role_id and (not row.get("insights") or not row["insights"].get("final_score")):
                try:
                    cand_skills = self.repo.get_candidate_skills(row["id"])
                    
                    from backend.modules.source.repositories.job_role_repo import JobRoleRepository
                    from backend.modules.source.services.ats_engine import normalise_required_skills, calculate_role_fit
                    
                    role_repo = JobRoleRepository(tenant_id=self.tenant_id)
                    role = role_repo.get_job_role_by_id(role_id)
                    
                    if role:
                        req_skills = normalise_required_skills(
                            role.get("required_skills"),
                            title=role.get("title") or "",
                            description=role.get("description") or ""
                        )
                        role_min_exp = role.get("min_experience") or 0
                        
                        flat_skills = [{"name": s.get("skill_name") or s.get("name"), "level": s.get("level", "intermediate")} for s in cand_skills]
                        fit = calculate_role_fit(
                            flat_skills,
                            req_skills,
                            exp_years=int(row.get("total_experience_years") or 0),
                            min_exp=role_min_exp
                        )
                        if "insights" not in row:
                            row["insights"] = {}
                        row["insights"]["final_score"] = fit["score"]
                except Exception as e:
                    logger.error(f"Failed to dynamically calculate fit score for candidate {row['id']}: {e}")
                    
        return rows

    def get_full_candidate_profile(self, candidate_id: int, role_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        cand = self.repo.get_candidate_by_id(candidate_id, role_id=role_id)
        if not cand:
            return None
            
        cand["structured_skills"] = self.repo.get_candidate_skills(candidate_id)
        cand["latest_offer"] = self.repo.get_candidate_latest_offer(candidate_id)
        cand["resume_ats_score"] = compute_resume_ats_score({**cand, "skills": cand["structured_skills"]})

        if role_id:
            from backend.modules.source.repositories.job_role_repo import JobRoleRepository
            role_repo = JobRoleRepository(tenant_id=self.tenant_id)
            role = role_repo.get_job_role_by_id(role_id)
            if role:
                req_skills = normalise_required_skills(
                    role.get("required_skills"),
                    title=role.get("title") or "",
                    description=role.get("description") or ""
                )
                flat_skills = [{"name": s.get("skill_name") or s.get("name"), "level": s["level"]} for s in cand["structured_skills"]]
                cand["role_fit"] = calculate_role_fit(
                    flat_skills,
                    req_skills,
                    exp_years=int(cand.get("total_experience_years") or 0),
                    min_exp=role.get("min_experience") or 0
                )
        return cand

    def update_candidate(self, candidate_id: int, data: Dict[str, Any], actor_name: str = "System") -> bool:
        from backend.core.database import get_db_connection
        # 1. Update candidate record in DB
        success = self.repo.update_candidate(candidate_id, data)
        if not success:
            return False

        self.repo.log_activity(candidate_id, actor_name, 'profile_updated', 'Profile details manually updated')

        # 2. Update skills list if provided
        if "skills" in data:
            # Get current candidate skills to know what to delete
            current_skills = self.repo.get_candidate_skills(candidate_id)
            current_skill_ids = {s['skill_id'] for s in current_skills}

            new_skill_ids = set()

            for skill_info in data["skills"]:
                if isinstance(skill_info, str):
                    name = skill_info.strip()
                    level = "intermediate"
                    years_of_use = None
                    evidence = None
                elif isinstance(skill_info, dict):
                    name = (skill_info.get("name") or skill_info.get("skill_name") or "").strip()
                    level = skill_info.get("level", "intermediate")
                    years_of_use = skill_info.get("years_of_use")
                    evidence = skill_info.get("evidence")
                else:
                    continue

                if not name:
                    continue

                # Get or create from taxonomy
                skill_record = self.skill_repo.get_skill_by_name(name)
                if not skill_record:
                    skill_id = self.skill_repo.create_skill(name=name, category="extracted", aliases=[name])
                else:
                    skill_id = skill_record['id']

                new_skill_ids.add(skill_id)

                # Upsert candidate skill
                self.repo.upsert_candidate_skill(candidate_id, skill_id, {
                    "level": level,
                    "source": "manual",
                    "years_of_use": years_of_use,
                    "evidence": evidence
                })

            # Delete skills that are no longer in the updated list
            skills_to_delete = current_skill_ids - new_skill_ids
            if skills_to_delete:
                conn = get_db_connection()
                try:
                    with conn.cursor() as cur:
                        self.repo._set_search_path(cur)
                        cur.execute(
                            "DELETE FROM candidate_skills WHERE candidate_id = %s AND skill_id = ANY(%s)",
                            (candidate_id, list(skills_to_delete))
                        )
                        conn.commit()
                finally:
                    conn.close()

        return True

    async def bulk_upload_resumes(self, files: List[tuple], user_id: int) -> Dict[str, Any]:
        """files is a list of tuples: (filename, content_bytes).
        Phase 1: extract text immediately at upload time, save to disk, batch-insert queue items.
        Phase 2: parallel workers pick up items and call AI asynchronously.
        """
        allowed_exts = (".pdf", ".docx", ".doc", ".txt")
        import zipfile
        import io
        import hashlib

        queue_items = []
        job_id = self.repo.create_bulk_upload_job(user_id, 0)
        job_dir = os.path.join(self.UPLOAD_DIR, f"job_{job_id}")
        os.makedirs(job_dir, exist_ok=True)

        total_files = 0
        for fn, content in files:
            if fn.lower().endswith(".zip"):
                try:
                    with zipfile.ZipFile(io.BytesIO(content)) as z:
                        for name in z.namelist():
                            if name.endswith("/") or name.split("/")[-1].startswith(".") or "__MACOSX" in name:
                                continue
                            if not name.lower().endswith(allowed_exts):
                                continue

                            file_bytes = z.read(name)
                            clean_fn = name.split("/")[-1]
                            file_hash = hashlib.sha256(file_bytes).hexdigest()
                            file_path = os.path.join(job_dir, f"{uuid.uuid4()}_{clean_fn}")
                            with open(file_path, "wb") as f:
                                f.write(file_bytes)

                            # Extract text at upload time — no AI needed yet
                            ext = os.path.splitext(clean_fn)[1].lower()
                            extracted_text = self._extract_text(file_path, ext)

                            queue_items.append({
                                "filename": clean_fn,
                                "file_path": file_path,
                                "file_hash": file_hash,
                                "extracted_text": extracted_text[:12000] if extracted_text else "",
                            })
                            total_files += 1
                except Exception as zip_err:
                    logger.error(f"Failed to extract zip file {fn}: {zip_err}")
            else:
                if not fn.lower().endswith(allowed_exts):
                    continue
                clean_fn = fn.split("/")[-1]
                file_hash = hashlib.sha256(content).hexdigest()
                file_path = os.path.join(job_dir, f"{uuid.uuid4()}_{clean_fn}")
                with open(file_path, "wb") as f:
                    f.write(content)

                ext = os.path.splitext(clean_fn)[1].lower()
                extracted_text = self._extract_text(file_path, ext)

                queue_items.append({
                    "filename": clean_fn,
                    "file_path": file_path,
                    "file_hash": file_hash,
                    "extracted_text": extracted_text[:12000] if extracted_text else "",
                })
                total_files += 1

        self.repo.update_bulk_upload_job(job_id, 0, "[]", "processing")

        if queue_items:
            self.repo.create_bulk_upload_job_items(job_id, queue_items)
            from backend.core.database import get_db_connection
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    self.repo._set_search_path(cur)
                    cur.execute("UPDATE bulk_upload_jobs SET total_files = %s WHERE id = %s", (total_files, job_id))
                    conn.commit()
            finally:
                conn.close()

        return {
            "job_id": job_id,
            "status": "processing",
            "message": f"Successfully queued {total_files} files for AI processing.",
        }

    async def process_bulk_upload_queue(self):
        """
        Parallel worker pool for AI resume parsing.

        - Spawns BULK_PARSE_WORKERS (default 8) independent async workers.
        - Each worker fetches ONE item at a time via SKIP LOCKED (no contention).
        - AI call runs in a thread executor (sync Groq/Gemini SDK, never blocks event loop).
        - 429 / 503 errors pause only that single worker; others keep running.
        - Cancel events per job allow instant stop without DB polling overhead.
        """
        import asyncio
        import re

        num_workers = int(os.getenv("BULK_PARSE_WORKERS", "2"))
        logger.info(f"[BulkWorker] Starting {num_workers} parallel AI parse workers for tenant {self.tenant_id}")

        # Per-job cancel registry: job_id -> asyncio.Event
        cancel_events: Dict[int, asyncio.Event] = {}

        def _get_cancel_event(job_id: int) -> asyncio.Event:
            if job_id not in cancel_events:
                cancel_events[job_id] = asyncio.Event()
            return cancel_events[job_id]

        async def _single_worker(worker_id: int):
            """One independent worker loop — fetches and processes items one at a time."""
            backoff = 0  # seconds to sleep before next attempt (per-worker)
            loop = asyncio.get_event_loop()

            while True:
                try:
                    if backoff > 0:
                        logger.info(f"[Worker-{worker_id}] API backoff: sleeping {backoff}s")
                        await asyncio.sleep(backoff)
                        backoff = 0

                    # Fetch exactly 1 pending item (SKIP LOCKED — no deadlocks between workers)
                    items = self.repo.get_pending_bulk_upload_job_items(limit=1)
                    if not items:
                        await asyncio.sleep(5)
                        continue
                    print(f"[Worker-{worker_id}][{self.tenant_id}] Picked up item {items[0].get('id')} filename={items[0].get('filename')}", flush=True)

                    item = items[0]
                    job_id = item.get("job_id")

                    # Check for job cancellation
                    if job_id and _get_cancel_event(job_id).is_set():
                        self.repo.update_bulk_upload_job_item(
                            item["id"], status="cancelled", error_message="Job was cancelled."
                        )
                        continue

                    try:
                        # 1. Duplicate hash check
                        if self.repo.check_file_hash_exists(item["file_hash"]):
                            self.repo.update_bulk_upload_job_item(
                                item["id"], status="duplicate", error_message="Exact file already uploaded before."
                            )
                            print(f"[Worker-{worker_id}][{self.tenant_id}] SKIPPED item {item['id']} ({item['filename']}): Duplicate file hash.", flush=True)
                            continue

                        # 2. Use pre-extracted text (stored at upload time) — avoids re-reading disk
                        extracted_text = item.get("extracted_text") or ""

                        # Fallback: if text is empty (old queue items), re-extract from disk
                        if not extracted_text and item.get("file_path") and os.path.exists(item["file_path"]):
                            ext = os.path.splitext(item["filename"])[1].lower()
                            extracted_text = self._extract_text(item["file_path"], ext)

                        if not extracted_text.strip():
                            print(f"[Worker-{worker_id}][{self.tenant_id}] Item {item['id']} FAILED: no text extracted. file_path={item.get('file_path')} exists={os.path.exists(item.get('file_path',''))}", flush=True)
                            self.repo.update_bulk_upload_job_item(
                                item["id"], status="failed", error_message="Could not extract text from file."
                            )
                            continue

                        # 3. Run AI parse in thread executor — sync SDK, never blocks event loop
                        from backend.common.services.ai.agents import PARSE_RESUME_SYSTEM
                        ai_service = self.ai_agents.ai

                        # Pre-extract trivial fields and construct compressed prompt
                        pre = ai_service.pre_extract_resume(extracted_text)
                        prompt = ai_service.build_bulk_prompt(extracted_text, pre)

                        # Use asyncio.wait_for to prevent hanging if the AI provider stalls
                        ai_result = await asyncio.wait_for(
                            loop.run_in_executor(
                                None,
                                lambda p=prompt: ai_service.generate_json_sync(p, PARSE_RESUME_SYSTEM)
                            ),
                            timeout=45.0
                        )

                        # Post-inject pre-extracted fields if the LLM skipped them or if we fell back to mock/offline
                        if ai_result:
                            for field, value in pre.items():
                                if value and not ai_result.get(field):
                                    ai_result[field] = value

                        # Fallback: if name is empty, try to extract it from the filename
                        if ai_result and not ai_result.get("name") and item.get("filename"):
                            inferred_name = self._extract_name_from_filename(item["filename"])
                            if inferred_name:
                                ai_result["name"] = inferred_name

                        # Only fail/re-queue if the parsed result is completely empty of key info (no name, no experience, and no skills)
                        if not ai_result or (not ai_result.get("name") and not ai_result.get("experience") and not ai_result.get("skills")):
                            print(f"[Worker-{worker_id}][{self.tenant_id}] ERROR on item {item['id']}: AI returned empty or invalid parse result. Re-queuing as pending. ai_result={ai_result}", flush=True)
                            await asyncio.sleep(10)
                            self.repo.update_bulk_upload_job_item(
                                item["id"], status="pending", error_message="AI returned empty or invalid parse result. Re-queued."
                            )
                            continue

                        # 4. Save candidate to DB (reuse existing logic)
                        file_content = b""
                        if item.get("file_path") and os.path.exists(item["file_path"]):
                            with open(item["file_path"], "rb") as f:
                                file_content = f.read()

                        result = await self._save_ai_parsed_candidate(ai_result, item["file_path"], file_content)
                        self.repo.update_bulk_upload_job_item(
                            item["id"], status="success", candidate_id=result["candidate_id"]
                        )
                        print(f"[Worker-{worker_id}][{self.tenant_id}] SUCCESS item {item['id']} → candidate {result['candidate_id']}", flush=True)

                        # Throttling to respect Free Tier rate limits (40k TPM on Groq, 15 RPM on Gemini)
                        provider = os.getenv("BULK_AI_PROVIDER") or os.getenv("AI_PROVIDER", "mock")
                        if provider == "groq":
                            await asyncio.sleep(6.0)
                        elif provider == "gemini":
                            await asyncio.sleep(4.5)
                        elif provider != "mock":
                            await asyncio.sleep(3.5)

                    except Exception as e:
                        err_str = str(e) or e.__class__.__name__
                        # Sanitize any API keys from the error message
                        ai_service = getattr(self.ai_agents, 'ai', None)
                        if ai_service:
                            for key in [getattr(ai_service, 'openai_api_key', None), getattr(ai_service, 'gemini_api_key', None), getattr(ai_service, 'groq_api_key', None)]:
                                if key and len(key) > 5 and key in err_str:
                                    err_str = err_str.replace(key, "******")

                        if any(err in err_str for err in ['413', '429', 'RESOURCE_EXHAUSTED', '503', 'UNAVAILABLE', 'rate_limit', 'timed out', 'nodename nor servname', 'ConnectionError', 'Timeout', 'TimeoutError']):
                            match = re.search(r'(?:retry in|try again in) (\d+\.?\d*)', err_str)
                            wait = int(float(match.group(1))) + 2 if match else 35
                            print(f"[Worker-{worker_id}][{self.tenant_id}] API busy, backing off {wait}s (holding item {item['id']} as processing to prevent other workers from picking it up immediately)...", flush=True)
                            await asyncio.sleep(wait)
                            self.repo.update_bulk_upload_job_item(item["id"], status="pending", error_message=None)
                            backoff = 0
                        else:
                            print(f"[Worker-{worker_id}][{self.tenant_id}] ERROR on item {item['id']}: {err_str[:300]}", flush=True)
                            self.repo.update_bulk_upload_job_item(
                                item["id"], status="failed", error_message=err_str[:500]
                            )
                            provider = os.getenv("BULK_AI_PROVIDER") or os.getenv("AI_PROVIDER", "mock")
                            if provider != "mock":
                                await asyncio.sleep(3.5)

                except Exception as outer_e:
                    outer_err_str = str(outer_e) or outer_e.__class__.__name__
                    ai_service = getattr(self.ai_agents, 'ai', None)
                    if ai_service:
                        for key in [getattr(ai_service, 'openai_api_key', None), getattr(ai_service, 'gemini_api_key', None), getattr(ai_service, 'groq_api_key', None)]:
                            if key and len(key) > 5 and key in outer_err_str:
                                outer_err_str = outer_err_str.replace(key, "******")
                    print(f"[Worker-{worker_id}][{self.tenant_id}] Outer loop error: {outer_err_str}", flush=True)
                    await asyncio.sleep(15)
        # Reset any stuck processing items on startup
        try:
            self.repo.reset_stuck_processing_items()
            logger.info(f"[BulkWorker][{self.tenant_id}] Cleaned up and reset stuck processing items to pending.")
        except Exception as e:
            logger.error(f"[BulkWorker][{self.tenant_id}] Error resetting stuck processing items: {e}")

        # Launch all workers as concurrent tasks
        await asyncio.gather(*[_single_worker(i) for i in range(num_workers)])

    async def _save_ai_parsed_candidate(self, ai_result: Dict[str, Any], file_path: str, file_content: bytes) -> Dict[str, Any]:
        """Save AI-parsed resume data to the database. Extracted from process_and_save_resume for reuse by bulk workers."""
        email = ai_result.get("email")
        if not email:
            email = f"unknown_{uuid.uuid4().hex[:8]}@phygitron.local"

        candidate_data = {
            "full_name": ai_result.get("name") or "Unknown Candidate",
            "email": email,
            "phone": ai_result.get("phone"),
            "location": ai_result.get("location"),
            "total_experience_years": ai_result.get("experience_years_total") or 0,
            "current_designation": ai_result.get("current_designation"),
            "current_company": ai_result.get("current_company"),
            "expected_salary": ai_result.get("expected_salary"),
            "notice_period": ai_result.get("notice_period"),
            "linkedin_url": ai_result.get("linkedin_url"),
            "portfolio_url": ai_result.get("portfolio_url"),
            "availability": ai_result.get("availability"),
            "ai_summary": ai_result.get("ai_summary"),
            "certifications": ai_result.get("certifications"),
            "languages": ai_result.get("languages"),
            "achievements": ai_result.get("achievements"),
            "resume_path": file_path,
            "source": "AI Resume Parse",
            "status": "New",
            "experience": ai_result.get("experience", []),
            "education": ai_result.get("education", []),
            "projects": ai_result.get("projects", []),
            "awards": ai_result.get("awards", []),
            "publications": ai_result.get("publications", []),
            "hobbies": ai_result.get("hobbies", []),
            "work_authorization": ai_result.get("work_authorization"),
            "github_url": ai_result.get("github_url"),
        }

        existing = None
        if "unknown_" not in candidate_data["email"]:
            existing = self.repo.get_candidate_by_email(candidate_data["email"])

        if existing:
            candidate_id = existing["id"]
            self.repo.update_candidate(candidate_id, candidate_data)
            self.repo.log_activity(candidate_id, 'System', 'profile_updated', 'Profile updated via bulk resume re-upload')
        else:
            candidate_id = self.repo.create_candidate(candidate_data)
            self.repo.log_activity(candidate_id, 'System', 'profile_created', 'Profile created and parsed via AI')

        # Process skills
        for skill_data in ai_result.get("skills", []):
            name = skill_data.get("name")
            if not name:
                continue
            skill_record = self.skill_repo.get_skill_by_name(name)
            if not skill_record:
                skill_id = self.skill_repo.create_skill(name=name, category="extracted", aliases=[name])
            else:
                skill_id = skill_record['id']
            self.repo.upsert_candidate_skill(candidate_id, skill_id, {
                "level": skill_data.get("level", "beginner"),
                "source": "resume",
                "years_of_use": skill_data.get("years_of_use"),
                "evidence": skill_data.get("evidence"),
            })

        # Store confidence signals
        confidence_signals = ai_result.get("confidence_signals", [])
        if confidence_signals:
            self.ai_score_repo.create_ai_score({
                "entity_type": "candidate",
                "entity_id": candidate_id,
                "job_role_id": None,
                "score_type": "confidence_signals",
                "score": 0,
                "reasoning": json.dumps(confidence_signals),
            })

        return {"candidate_id": candidate_id, "parsed_data": ai_result}



    async def generate_offer_preview(self, candidate_id: int, details: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cand = self.repo.get_candidate_by_id(candidate_id)
        if not cand:
            return None
            
        try:
            content = await self.ai_agents.generate_offer_letter(cand["full_name"], details)
            return content
        except Exception as e:
            logger.error(f"AI offer letter generation failed: {e}")
            return {
                "subject": f"Offer for {details.get('role_title')}",
                "salutation": f"Dear {cand['full_name']},",
                "body_paragraphs": [
                    f"We are pleased to offer you the position of {details.get('role_title')}.",
                    f"Offered salary: {details.get('salary')}."
                ],
                "closing": "Sincerely,",
                "signatory_name": "HR Operations Team",
                "signatory_title": "Manager - Talent Acquisition"
            }

    async def convert_to_offer(self, candidate_id: int, details: Dict[str, Any], offer_content: Optional[Dict[str, Any]] = None) -> bool:
        cand = self.repo.get_candidate_by_id(candidate_id)
        if not cand:
            raise ValueError("Candidate not found")
            
        if not offer_content:
            try:
                offer_content = await self.ai_agents.generate_offer_letter(cand["full_name"], details)
            except Exception as e:
                logger.error(f"AI offer generation failed (using fallback): {e}")
                offer_content = {}
                
        # This will be handled properly by OfferService, but for now we put it in CandidateRepo
        self.repo.create_offer(candidate_id, details, offer_content)
        self.repo.update_candidate_status(candidate_id, "Offered")
        return True

    def get_bulk_upload_job_progress(self, job_id: int) -> Dict[str, Any]:
        return self.repo.get_bulk_upload_job_progress(job_id)

    def cancel_bulk_upload_job(self, job_id: int) -> bool:
        self.repo.cancel_bulk_upload_job(job_id)
        return True

    def pause_bulk_upload_job(self, job_id: int) -> bool:
        self.repo.pause_bulk_upload_job(job_id)
        return True

    def resume_bulk_upload_job(self, job_id: int) -> bool:
        self.repo.resume_bulk_upload_job(job_id)
        return True

    def get_global_activity(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.repo.get_global_activity(limit=limit)
