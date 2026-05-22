import json
import logging
import secrets
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.modules.source.repositories.job_role_repo import JobRoleRepository
from backend.modules.source.repositories.candidate_repo import CandidateRepository
from backend.modules.source.repositories.ai_score_repo import AIScoreRepository
from backend.modules.source.services.ats_engine import normalise_required_skills, calculate_role_fit
from backend.common.services.ai.agents import AIAgents
from backend.core.email_service_extended import send_invite_email

logger = logging.getLogger(__name__)

class JobService:
    def __init__(self, tenant_id: str = "public"):
        self.tenant_id = tenant_id
        self.repo = JobRoleRepository(tenant_id=tenant_id)
        self.candidate_repo = CandidateRepository(tenant_id=tenant_id)
        self.ai_score_repo = AIScoreRepository(tenant_id=tenant_id)
        self.ai_agents = AIAgents()

    def get_all_job_roles(self) -> List[Dict[str, Any]]:
        return self.repo.get_all_job_roles()

    async def create_job_role(self, data: Dict[str, Any]) -> int:
        required_skills = data.get("required_skills")
        description = data.get("description")
        title = data.get("title")
        
        if not required_skills and description:
            try:
                if hasattr(self.ai_agents, "extract_jd_skills"):
                    required_skills = await self.ai_agents.extract_jd_skills(description)
                else:
                    required_skills = normalise_required_skills(None, title=title, description=description)
            except Exception as exc:
                logger.warning(f"AI skill extraction failed (non-fatal): {exc}")
                required_skills = normalise_required_skills(None, title=title, description=description)
                
        data["required_skills"] = required_skills or []
        return self.repo.create_job_role(data)

    def update_job_role(self, role_id: int, updates: Dict[str, Any]) -> bool:
        return self.repo.update_job_role(role_id, updates)

    def delete_job_role(self, role_id: int) -> bool:
        return self.repo.delete_job_role(role_id)

    def delete_all_job_roles(self):
        self.repo.delete_all_job_roles()

    def get_candidate_rankings(self, role_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_candidate_rankings(role_id)

    def _score_candidate(self, candidate: Dict[str, Any], req_skills: List[Dict], min_exp: int, role_id: int) -> Dict[str, Any]:
        cid = candidate["id"]
        exp = int(candidate.get("total_experience_years") or 0)
        
        cand_skills_raw = self.candidate_repo.get_candidate_skills(cid)
        cand_skills = [{"name": s.get("skill_name") or s.get("name"), "level": s["level"]} for s in cand_skills_raw]
        
        fit = calculate_role_fit(cand_skills, req_skills, exp_years=exp, min_exp=min_exp)
        
        reasoning = json.dumps({
            "matched": fit["matched_skills"],
            "missing": fit["missing_skills"],
        })
        
        try:
            self.ai_score_repo.upsert_role_fit_score(cid, role_id, fit["score"], reasoning)
        except Exception:
            self.ai_score_repo.create_ai_score({
                "entity_type": "candidate",
                "entity_id": cid,
                "job_role_id": role_id,
                "score_type": "role_fit",
                "score": fit["score"],
                "reasoning": reasoning,
            })
            
        return {"candidate_id": cid, "score": fit["score"], "detail": fit}

    def auto_rank_candidates(self, role_id: int) -> List[Dict[str, Any]]:
        role = self.repo.get_job_role_by_id(role_id)
        if not role:
            raise ValueError("Job role not found")

        req_skills = normalise_required_skills(
            role["required_skills"],
            title=role.get("title") or "",
            description=role.get("description") or "",
        )
        min_exp = role.get("min_experience") or 0

        candidates = self.repo.get_all_candidates_for_scoring()
        results = []
        for cand in candidates:
            try:
                res = self._score_candidate(cand, req_skills, min_exp, role_id)
                results.append({"candidate_id": cand["id"], "score": res["score"]})
            except Exception as e:
                logger.error(f"Failed scoring candidate {cand['id']}: {e}")
                
        return results

    def score_selected_candidates(self, role_id: int, candidate_ids: List[int]) -> List[Dict[str, Any]]:
        role = self.repo.get_job_role_by_id(role_id)
        if not role:
            raise ValueError("Job role not found")

        req_skills = normalise_required_skills(
            role["required_skills"],
            title=role.get("title") or "",
            description=role.get("description") or "",
        )
        min_exp = role.get("min_experience") or 0
        
        results = []
        for cid in candidate_ids:
            cand = self.repo.get_candidate_for_scoring(cid)
            if not cand:
                results.append({"candidate_id": cid, "error": "Candidate not found"})
                continue
                
            try:
                res = self._score_candidate(cand, req_skills, min_exp, role_id)
                results.append(res)
            except Exception as exc:
                logger.error(f"Scoring failed for candidate {cid}: {exc}")
                results.append({"candidate_id": cid, "error": str(exc)})
                
        return results

    def send_invites(self, role_id: int, hr_id: int, candidate_ids: List[int], email_addresses: Optional[List[str]] = None, deadline: Optional[str] = None) -> Dict[str, Any]:
        role = self.repo.get_job_role_by_id(role_id)
        if not role:
            raise ValueError("Job role not found")
        
        role_name = role["title"]
        sent_count = 0
        errors = []
        
        from backend.core.security import hash_password

        for i, cid in enumerate(candidate_ids):
            try:
                cand = self.candidate_repo.get_candidate_by_id(cid)
                if not cand:
                    errors.append({"candidate_id": cid, "error": "Not found"})
                    continue
                    
                temp_password = secrets.token_urlsafe(10)
                to_email = email_addresses[i] if email_addresses and i < len(email_addresses) else cand["email"]

                try:
                    self.repo.upsert_user_password_by_candidate(cid, hash_password(temp_password))
                except Exception:
                    pass

                self.repo.create_invite_if_not_exists(cid, role_id, hr_id)

                try:
                    send_invite_email(
                        to_email=to_email,
                        candidate_name=cand["full_name"],
                        role_name=role_name,
                        company_name="Phygitron 360",
                        temp_password=temp_password,
                        deadline=deadline,
                    )
                except Exception as exc:
                    logger.warning(f"Invite email failed for {to_email}: {exc}")

                sent_count += 1
            except Exception as exc:
                logger.error(f"Invite failed for candidate {cid}: {exc}")
                errors.append({"candidate_id": cid, "error": str(exc)})
                
        return {"sent": sent_count, "errors": errors}

    def get_invite_status(self, job_role_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_invite_status(job_role_id)
