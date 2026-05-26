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
        self.UPLOAD_DIR = os.path.join(self.BASE_DIR, "data", "resumes")
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
            candidate_id = existing["id"]
            self.repo.update_candidate(candidate_id, candidate_data)
            self.repo.log_activity(candidate_id, 'System', 'profile_updated', 'Profile updated via AI re-parsing')
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
        extracted_text = ""
        try:
            if ext == ".pdf":
                import fitz
                with fitz.open(file_path) as pdf:
                    for page in pdf:
                        extracted_text += page.get_text() + "\n"
            elif ext == ".txt":
                with open(file_path, "r", encoding="utf-8") as f:
                    extracted_text = f.read()
            elif ext == ".docx":
                from docx import Document
                doc = Document(file_path)
                extracted_text = '\n'.join([para.text for para in doc.paragraphs if para.text.strip()])
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
        return extracted_text

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

    def update_status(self, candidate_id: int, new_status: str) -> bool:
        return self.repo.update_candidate_status(candidate_id, new_status)

    def add_note(self, candidate_id: int, author_name: str, content: str) -> Dict[str, Any]:
        return self.repo.add_candidate_note(candidate_id, author_name, content)

    def create_manual_candidate(self, data: Dict[str, Any], actor_name: str) -> int:
        candidate_id = self.repo.create_candidate(data)
        self.repo.log_activity(candidate_id, actor_name, "profile_created", "Manual candidate entry")
        return candidate_id

    def delete_candidate(self, candidate_id: int) -> bool:
        return self.repo.delete_candidate(candidate_id)

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
            search=search, sort_by=sort_by, limit=limit
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
                cand["ats_score"] = fit["score"]
                cand["ats_detail"] = fit
            else:
                cand["ats_score"] = compute_resume_ats_score(cand)

        return candidates

    def get_active_candidates(self) -> List[Dict[str, Any]]:
        return self.repo.get_active_candidates()

    def get_full_candidate_profile(self, candidate_id: int, role_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        cand = self.repo.get_candidate_by_id(candidate_id)
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

    async def bulk_upload_resumes(self, files: List[tuple], user_id: int) -> Dict[str, Any]:
        """files is a list of tuples: (filename, content_bytes)"""
        job_id = self.repo.create_bulk_upload_job(user_id, len(files))
        succeeded = []
        failed = []
        skipped = []
        allowed_exts = (".pdf", ".docx", ".doc", ".txt")

        for fn, content in files:
            if not fn.lower().endswith(allowed_exts):
                skipped.append(fn)
                continue
            try:
                result = await self.process_and_save_resume(content, fn)
                succeeded.append({
                    "filename": fn,
                    "candidate_id": result["candidate_id"],
                    "full_name": result["parsed_data"].get("name")
                })
            except Exception as e:
                logger.error(f"Bulk upload failed for {fn}: {e}")
                failed.append({"filename": fn, "error": str(e)})

        self.repo.update_bulk_upload_job(
            job_id,
            processed=len(succeeded),
            details=json.dumps(succeeded + failed),
            status="completed"
        )
        return {
            "job_id": job_id,
            "succeeded": succeeded,
            "failed": failed,
            "skipped": skipped
        }

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

    def get_global_activity(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.repo.get_global_activity(limit=limit)
