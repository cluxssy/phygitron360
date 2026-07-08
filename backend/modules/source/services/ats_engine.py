"""
Phygitron 360 — ATS Scoring Engine
===================================
Pure Python deterministic skill-matching engine for candidate-to-role fit scoring.
No external dependencies, no DB access — all logic is stateless and testable.

Scoring Model (Excel Fuzzy Logic):
- 5-tier skill levels: critical=5, expert=4, advanced=3, intermediate=2, beginner=1
- Per-skill score = SQRT(candidate_level / required_level) * required_level
- If candidate_level >= required_level -> full points (required_level)
- Weights: mandatory_skills=5, optional_skills=1, experience=5
- Final % = (mand_ratio*5 + opt_ratio*1 + exp_ratio*5) / 11 * 100
"""
from typing import Optional, List, Dict, Any
import math

# 5-tier level map
LEVEL_WEIGHTS = {
    "critical":     5,
    "expert":       4,
    "advanced":     3,
    "intermediate": 2,
    "beginner":     1,
}

_COMPAT_MAP = {
    "required": "expert",
    "optional": "intermediate",
}

NOISE_TOKENS = {"and", "or", "the", "of", "for", "with", "in", "at", "a", "an", "to", "on", "is", "are"}
MIN_TOKEN_LEN = 1

ROLE_SKILL_PRESETS = {
    "cyber":    ["Cyber Security", "Network Security", "SIEM", "Penetration Testing", "Linux", "Python"],
    "security": ["Cyber Security", "Network Security", "SIEM", "Penetration Testing", "Linux", "Python"],
    "ai":       ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP"],
    "ml":       ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn", "SQL"],
    "data":     ["Python", "SQL", "Pandas", "NumPy", "Power BI", "Machine Learning"],
    "frontend": ["JavaScript", "React", "HTML", "CSS", "TypeScript"],
    "backend":  ["Python", "FastAPI", "SQL", "API", "Docker"],
}

WEIGHT_MANDATORY  = 5
WEIGHT_OPTIONAL   = 1
WEIGHT_EXPERIENCE = 5
WEIGHT_TOTAL      = WEIGHT_MANDATORY + WEIGHT_OPTIONAL + WEIGHT_EXPERIENCE  # 11


def _clean_skill_name(value) -> str:
    return str(value or "").strip()


def _normalise_level(value, fallback="intermediate") -> str:
    raw = str(value or fallback).lower().strip()
    if raw in _COMPAT_MAP:
        return _COMPAT_MAP[raw]
    return raw if raw in LEVEL_WEIGHTS else fallback


def _skill_tokens(value: str) -> set:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in str(value or ""))
    return {token for token in cleaned.split() if len(token) >= MIN_TOKEN_LEN and token not in NOISE_TOKENS}


def _skill_similarity(required: str, candidate: str) -> float:
    import re
    req  = " ".join(str(required  or "").lower().split())
    cand = " ".join(str(candidate or "").lower().split())
    if not req or not cand:
        return 0.0
    if req == cand:
        return 1.0
    pattern = r'\b' + re.escape(req) + r'\b'
    if re.search(pattern, cand) or re.search(r'\b' + re.escape(cand) + r'\b', req):
        return 0.95
    req_tokens  = _skill_tokens(req)
    cand_tokens = _skill_tokens(cand)
    if not req_tokens or not cand_tokens:
        return 0.0
    overlap  = req_tokens & cand_tokens
    if not overlap:
        return 0.0
    coverage = len(overlap) / len(req_tokens)
    if coverage >= 1.0:
        return 0.9
    if coverage >= 0.5:
        return 0.5 * coverage + 0.2
    return 0.1


def _fuzzy_skill_score(cand_level_num: float, req_level_num: float) -> float:
    if req_level_num <= 0:
        return 0.0
    if cand_level_num >= req_level_num:
        return req_level_num
    if cand_level_num <= 0:
        return 0.0
    return math.sqrt(cand_level_num / req_level_num) * req_level_num


def normalise_required_skills(required_skills_raw: Optional[list], title: str = "", description: str = "") -> List[Dict]:
    import json, re
    if isinstance(required_skills_raw, str):
        try:
            required_skills_raw = json.loads(required_skills_raw)
        except Exception:
            if "," in required_skills_raw:
                required_skills_raw = [s.strip() for s in required_skills_raw.split(",") if s.strip()]
            else:
                required_skills_raw = [required_skills_raw]

    normalised = []
    for item in (required_skills_raw or []):
        if isinstance(item, str):
            name, level = item.strip(), "intermediate"
        elif isinstance(item, dict):
            name  = (item.get("skill") or item.get("name") or item.get("title") or item.get("normalized_name") or "").strip()
            level = (item.get("level") or item.get("min_level") or item.get("required_level") or "intermediate")
        else:
            continue
        name = _clean_skill_name(name)
        if name:
            normalised.append({"skill": name, "level": _normalise_level(level)})

    if normalised:
        return normalised

    haystack = f"{title or ''}".lower()
    inferred = []
    for keyword, skills in ROLE_SKILL_PRESETS.items():
        if re.search(r'\b' + re.escape(keyword) + r'\b', haystack):
            inferred.extend(skills)

    if not inferred and title:
        inferred = [p.strip() for p in title.replace("/", " ").replace("-", " ").split() if len(p.strip()) > 2]

    seen, fallback = set(), []
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
    """
    Calculate ATS role-fit score using the Excel SQRT fuzzy model.

    Mandatory skills = levels critical/expert/advanced
    Optional  skills = levels intermediate/beginner

    Final % = (mand_ratio * 5 + opt_ratio * 1 + exp_ratio * 5) / 11 * 100
    """
    import re

    if not req_skills:
        return {"score": 0.0, "matched_skills": [], "missing_skills": [], "partial_skills": []}

    MANDATORY_LEVELS = {"critical", "expert", "advanced"}
    mandatory_reqs = [r for r in req_skills if _normalise_level(r.get("level")) in MANDATORY_LEVELS]
    optional_reqs  = [r for r in req_skills if _normalise_level(r.get("level")) not in MANDATORY_LEVELS]

    cand_lookup: Dict[str, int] = {}
    for s in cand_skills:
        raw_name  = _clean_skill_name(s.get("name") or s.get("skill"))
        raw_level = _normalise_level(s.get("level") or "intermediate")
        if raw_name:
            cand_lookup[raw_name] = LEVEL_WEIGHTS.get(raw_level, 2)

    def _score_group(req_group):
        earned, max_pts = 0.0, 0.0
        m, miss, p = [], [], []
        for req in req_group:
            req_name  = _clean_skill_name(req.get("skill") or req.get("name"))
            req_level = _normalise_level(req.get("level") or "intermediate")
            req_num   = LEVEL_WEIGHTS.get(req_level, 2)
            if not req_name:
                continue
            max_pts += req_num
            best_sim, best_cname, best_cnum = 0.0, None, 0
            for cname, cnum in cand_lookup.items():
                sim = _skill_similarity(req_name, cname)
                if sim > best_sim:
                    best_sim, best_cname, best_cnum = sim, cname, cnum
            if best_sim >= 0.8:
                in_exp = bool(
                    cand_experience_text and best_cname and
                    re.search(r'\b' + re.escape(best_cname) + r'\b', cand_experience_text, re.IGNORECASE)
                )
                effective = min(best_cnum + (1 if in_exp else 0), req_num)
                earned += _fuzzy_skill_score(effective * best_sim, req_num)
                m.append(req_name)
            elif best_sim > 0.4:
                effective = max(best_cnum // 2, 1)
                earned += _fuzzy_skill_score(effective * best_sim, req_num)
                p.append({"skill": req_name, "candidate_skill": best_cname})
            else:
                miss.append(req_name)
        return earned, max_pts, m, miss, p

    mand_earned, mand_max, mand_m, mand_miss, mand_p = _score_group(mandatory_reqs)
    opt_earned,  opt_max,  opt_m,  opt_miss,  opt_p  = _score_group(optional_reqs)

    mand_ratio = (mand_earned / mand_max) if mand_max > 0 else 1.0
    opt_ratio  = (opt_earned  / opt_max)  if opt_max  > 0 else 1.0
    exp_ratio  = min(exp_years / min_exp, 1.0) if min_exp > 0 else 1.0

    weighted  = mand_ratio * WEIGHT_MANDATORY + opt_ratio * WEIGHT_OPTIONAL + exp_ratio * WEIGHT_EXPERIENCE
    final_pct = (weighted / WEIGHT_TOTAL) * 100.0

    return {
        "score":          round(min(final_pct, 100.0), 1),
        "matched_skills": mand_m + opt_m,
        "missing_skills": mand_miss + opt_miss,
        "partial_skills": mand_p + opt_p,
    }


def compute_resume_ats_score(candidate: Dict) -> float:
    """Compute a simple ATS readiness score based on profile completeness."""
    num_skills   = len(candidate.get("skills", []))
    exp          = candidate.get("total_experience_years") or candidate.get("exp_years") or 0
    loc_points   = 10 if candidate.get("location") else 0
    skill_points = min(num_skills * 5, 50)
    exp_points   = min(exp * 5, 40)
    return skill_points + exp_points + loc_points
