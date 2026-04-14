import os
import uuid
import math
import logging
from typing import List, Dict, Any, Optional
from backend.modules.source.repositories.candidate_repo import CandidateRepository
from backend.modules.source.repositories.skill_repo import SkillRepository
from backend.modules.source.repositories.ai_score_repo import AIScoreRepository
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

    def create_manual_candidate(self, data: Dict[str, Any]) -> int:
        return self.repo.create_candidate(data)

    def delete_candidate(self, candidate_id: int) -> bool:
        return self.repo.delete_candidate(candidate_id)
