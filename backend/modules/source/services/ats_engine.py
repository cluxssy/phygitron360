"""
Phygitron 360 — ATS Scoring Engine
===================================
Pure Python deterministic skill-matching engine for candidate-to-role fit scoring.
No external dependencies, no DB access — all logic is stateless and testable.
"""
from typing import Optional, List, Dict, Any

LEVEL_WEIGHTS = {"beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4}
NOISE_TOKENS = {"and", "or", "the", "of", "for", "with", "in", "at", "a", "an", "to", "on", "is", "are"}
MIN_TOKEN_LEN = 1

ROLE_SKILL_PRESETS = {
    "cyber": ["Cyber Security", "Network Security", "SIEM", "Penetration Testing", "Linux", "Python"],
    "security": ["Cyber Security", "Network Security", "SIEM", "Penetration Testing", "Linux", "Python"],
    "ai": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP"],
    "ml": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn", "SQL"],
    "data": ["Python", "SQL", "Pandas", "NumPy", "Power BI", "Machine Learning"],
    "frontend": ["JavaScript", "React", "HTML", "CSS", "TypeScript"],
    "backend": ["Python", "FastAPI", "SQL", "API", "Docker"],
}


def _clean_skill_name(value) -> str:
    return str(value or "").strip()


def _normalise_level(value, fallback="intermediate") -> str:
    level = str(value or fallback).lower().strip()
    return level if level in LEVEL_WEIGHTS else fallback


def _skill_tokens(value: str) -> set:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in str(value or ""))
    return {token for token in cleaned.split() if len(token) >= MIN_TOKEN_LEN and token not in NOISE_TOKENS}


def _skill_similarity(required: str, candidate: str) -> float:
    """Return similarity score 0..1 between a required skill and a candidate's skill."""
    import re
    req = " ".join(str(required or "").lower().split())
    cand = " ".join(str(candidate or "").lower().split())
    if not req or not cand:
        return 0.0

    if req == cand:
        return 1.0

    pattern = r'\b' + re.escape(req) + r'\b'
    if re.search(pattern, cand) or re.search(r'\b' + re.escape(cand) + r'\b', req):
        return 0.95

    req_tokens = _skill_tokens(req)
    cand_tokens = _skill_tokens(cand)
    if not req_tokens or not cand_tokens:
        return 0.0

    overlap = req_tokens & cand_tokens
    if not overlap:
        return 0.0

    coverage = len(overlap) / len(req_tokens)
    jaccard = len(overlap) / len(req_tokens | cand_tokens)

    if coverage >= 1.0:
        return 0.9
    if coverage >= 0.5:
        return 0.5 * coverage + 0.2

    return 0.1


def normalise_required_skills(required_skills_raw: Optional[list], title: str = "", description: str = "") -> List[Dict]:
    """
    Convert raw required_skills data into a canonical list of {skill, level} dicts.
    Priority:
    1. Explicitly defined skills in required_skills field
    2. Inferred from title/description using presets
    3. Last resort: tokenise the title
    """
    import json
    if isinstance(required_skills_raw, str):
        try:
            required_skills_raw = json.loads(required_skills_raw)
        except Exception:
            if "," in required_skills_raw:
                required_skills_raw = [s.strip() for s in required_skills_raw.split(",") if s.strip()]
            else:
                required_skills_raw = [required_skills_raw]

    normalised = []
    raw = required_skills_raw or []
    for item in raw:
        if isinstance(item, str):
            name = item.strip()
            level = "intermediate"
        elif isinstance(item, dict):
            name = (
                item.get("skill") or item.get("name") or
                item.get("title") or item.get("normalized_name") or ""
            ).strip()
            level = (
                item.get("level") or item.get("min_level") or
                item.get("required_level") or "intermediate"
            )
        else:
            continue
        name = _clean_skill_name(name)
        if name:
            normalised.append({"skill": name, "level": _normalise_level(level)})

    if normalised:
        return normalised

    import re
    haystack = f"{title or ''}".lower()
    inferred = []
    for keyword, skills in ROLE_SKILL_PRESETS.items():
        if re.search(r'\b' + re.escape(keyword) + r'\b', haystack):
            inferred.extend(skills)

    if not inferred and title:
        inferred = [
            part.strip() for part in
            title.replace("/", " ").replace("-", " ").split()
            if len(part.strip()) > 2
        ]

    seen = set()
    fallback = []
    for skill in inferred:
        key = skill.lower()
        if key not in seen:
            fallback.append({"skill": skill, "level": "intermediate"})
            seen.add(key)
    return fallback


def calculate_role_fit(
    cand_skills: List[Dict],
    req_skills: List[Dict],
    exp_years: float = 0.0,
    min_exp: float = 0.0,
    cand_experience_text: str = "",
    **kwargs
) -> Dict[str, Any]:
    """Calculate ATS role-fit score between a candidate's skills and job requirements using matrix normalization."""
    if not req_skills:
        return {"score": 0.0, "matched_skills": [], "missing_skills": [], "partial_skills": []}

    matched = []
    missing = []
    partial = []
    
    max_possible_points = 0.0
    earned_points = 0.0

    candidates = [
        {"name": _clean_skill_name(s.get("name") or s.get("skill"))}
        for s in cand_skills
        if _clean_skill_name(s.get("name") or s.get("skill"))
    ]

    import re

    for req in req_skills:
        req_name = _clean_skill_name(req.get("skill") or req.get("name"))
        if not req_name:
            continue
            
        req_level = (req.get("level") or "required").lower()
        is_required = req_level != "optional"
        
        # Calculate max possible points for this skill
        max_pts = 5.0 if is_required else 3.0
        max_possible_points += max_pts

        best_cand = None
        best_similarity = 0.0
        for cand in candidates:
            sim = _skill_similarity(req_name, cand["name"])
            if sim > best_similarity:
                best_similarity = sim
                best_cand = cand

        if best_similarity >= 0.8:
            matched.append(req_name)

            # Check if skill was demonstrated in experience text
            in_experience = False
            if cand_experience_text and re.search(
                r'\b' + re.escape(best_cand["name"]) + r'\b',
                cand_experience_text,
                re.IGNORECASE
            ):
                in_experience = True

            # 3-tier multiplier:
            # - Demonstrated in work experience  → full points (5 req / 3 opt)
            # - Fresher (0 exp) listing a skill  → near-full benefit of doubt (4 req / 2.5 opt)
            # - Listed in skills section only     → partial credit (3 req / 2 opt)
            if in_experience:
                points = 5.0 if is_required else 3.0
            elif exp_years == 0:
                points = 4.0 if is_required else 2.5
            else:
                points = 3.0 if is_required else 2.0

            earned_points += (points * best_similarity)

        elif best_similarity > 0.4:
            partial.append({
                "skill": req_name,
                "candidate_skill": best_cand["name"]
            })
            # Award partial credit for near-matches too
            partial_pts = 1.5 if is_required else 0.8
            earned_points += (partial_pts * best_similarity)
        else:
            missing.append(req_name)

    # Normalize skill score to a maximum of 80 points
    if max_possible_points > 0:
        skill_score = (earned_points / max_possible_points) * 80.0
    else:
        skill_score = 80.0

    # Smooth sliding experience score (max 20 points)
    # Avoids the brutal cliff where 4.9 yrs for a 5-yr role scores the same as 0 yrs
    if min_exp <= 0:
        # No experience requirement — full 20 points for anyone
        exp_score = 20.0
    elif exp_years <= 0:
        exp_score = 2.0
    elif exp_years < min_exp * 0.5:
        exp_score = 8.0
    elif exp_years < min_exp:
        # Smooth ramp: e.g. 4 of 5 required yrs → 14 pts
        ratio = exp_years / min_exp
        exp_score = 8.0 + (ratio * 10.0)
    elif exp_years == min_exp:
        exp_score = 18.0
    else:
        exp_score = 20.0

    final_score = skill_score + exp_score

    return {
        "score": round(min(final_score, 100.0), 1),
        "matched_skills": matched,
        "missing_skills": missing,
        "partial_skills": partial,
    }


def compute_resume_ats_score(candidate: Dict) -> float:
    """Compute a simple ATS readiness score based on profile completeness."""
    num_skills = len(candidate.get("skills", []))
    exp = candidate.get("total_experience_years") or candidate.get("exp_years") or 0
    loc_points = 10 if candidate.get("location") else 0
    skill_points = min(num_skills * 5, 50)
    exp_points = min(exp * 5, 40)
    return skill_points + exp_points + loc_points
