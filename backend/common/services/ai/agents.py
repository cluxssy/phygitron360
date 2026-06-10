import json
import logging
from typing import List, Dict, Any, Optional
from backend.common.services.ai.base import AIService

logger = logging.getLogger(__name__)

# --- System Prompts ---

PARSE_RESUME_SYSTEM = """You are a resume parsing AI. Extract structured data from the resume text.
Respond ONLY with valid JSON.
CRITICAL: For `confidence_signals`, rigorously check if mentioned skills are ACTUALLY used in the project descriptions or work history. If a skill is listed but not backed by project history, flag it as potentially fake.
Return this exact structure:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "current_designation": "",
  "current_company": "",
  "linkedin_url": "",
  "portfolio_url": "",
  "experience_years_total": 0.0,
  "expected_salary": "",
  "notice_period": "",
  "availability": "available|open_to_opportunities|not_available",
  "ai_summary": "",
  "experience": [{
     "company": "",
     "designation": "",
     "start_date": "YYYY-MM or null",
     "end_date": "YYYY-MM or null",
     "is_current": false,
     "description": ""
  }],
  "skills": [{"name": "", "normalized_name": "", "level": "beginner|intermediate|advanced|expert", "evidence": "", "years_of_use": 0}],
  "education": [{"degree": "", "institution": "", "field_of_study": "", "start_date": "YYYY-MM", "end_date": "YYYY-MM"}],
  "certifications": [{"name": "", "issuer": "", "year": 0}],
  "languages": [{"name": "", "proficiency": "basic|conversational|fluent|native"}],
  "achievements": [""],
  "confidence_signals": [{"skill": "", "claimed_years": 0, "supported_years": 0, "flag": false, "reason": ""}]
}"""

ROLE_FIT_SYSTEM = """You are a talent assessment AI. Score a candidate's fit for a job role.
Respond ONLY with valid JSON.
Return this exact structure:
{
  "score": 0,
  "summary": "",
  "matched_skills": [],
  "missing_skills": [],
  "partially_matched": [{"skill": "", "candidate_level": "", "required_level": ""}],
  "interview_questions": []
}"""

FEEDBACK_SYSTEM = """You are an assessment feedback AI. Generate personalised learning feedback.
Respond ONLY with valid JSON.
Return this exact structure:
{
  "summary": "",
  "strengths": [],
  "improvement_areas": [],
  "study_recommendations": [],
  "weak_skill_ids": []
}"""

GENERATE_OFFER_LETTER_SYSTEM = """You are a professional HR assistant.
Write a warm, personalized internship or job offer letter for the company specified in the details (e.g. ACER, Phygitron 360).
The letter should be professional yet human-like, unique for each candidate.
Respond ONLY with valid JSON.
Return this structure:
{
  "subject": "Offer for [Position] - [Candidate Name]",
  "salutation": "Dear [Name],",
  "body_paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "closing": "Sincerely,",
  "signatory_name": "HR Operations Team",
  "signatory_title": "Manager - Talent Acquisition"
}"""

class AIAgents:
    def __init__(self):
        self.ai = AIService()

    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume text with AI and store skills."""
        return await self.ai.generate_json(
            prompt=f"Parse this resume:\n\n{resume_text[:8000]}",
            system_prompt=PARSE_RESUME_SYSTEM
        )

    async def score_role_fit(self, candidate_profile: Dict, job_role_profile: Dict) -> Dict[str, Any]:
        """Score a candidate's fit for a job role using full profiles for context."""
        prompt = json.dumps({
            "candidate": {
                "name": candidate_profile.get("full_name"),
                "designation": candidate_profile.get("current_designation"),
                "experience_years": candidate_profile.get("total_experience_years"),
                "skills": candidate_profile.get("skills_list", []), # Formatted skills list
                "summary": candidate_profile.get("ai_summary")
            },
            "job_role": {
                "title": job_role_profile.get("title"),
                "description": job_role_profile.get("description"),
                "required_skills": job_role_profile.get("required_skills"),
                "min_experience": job_role_profile.get("min_experience")
            }
        })
        return await self.ai.generate_json(
            prompt=f"Analyze and score this candidate's fit for the job role. Be rigorous and objective. Ranking should be 1-100.\n\n{prompt}",
            system_prompt=ROLE_FIT_SYSTEM
        )

    async def generate_assessment_feedback(self, questions: List[Dict], answers: Dict, scores: Dict, total_score: float, passed: bool) -> Dict[str, Any]:
        """Generate personalised learning feedback for an assessment."""
        prompt = json.dumps({
            "questions": questions,
            "candidate_answers": answers,
            "scores_per_question": scores,
            "total_score": total_score,
            "passed": passed
        })
        return await self.ai.generate_json(
            prompt=f"Generate assessment feedback:\n\n{prompt}",
            system_prompt=FEEDBACK_SYSTEM
        )

    async def generate_offer_letter(self, candidate_name: str, details: Dict) -> Dict[str, Any]:
        """Generate a personalized offer letter."""
        prompt = json.dumps({
            "candidate_name": candidate_name,
            "details": details
        })
        return await self.ai.generate_json(
            prompt=f"Generate a personalized offer letter for:\n\n{prompt}",
            system_prompt=GENERATE_OFFER_LETTER_SYSTEM
        )
