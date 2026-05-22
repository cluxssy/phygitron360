import asyncio
import json
import logging
from typing import List, Dict, Any, Optional

from backend.modules.verify.repositories.assignment_repo import AssignmentRepository
from backend.modules.verify.repositories.assessment_repo import AssessmentRepository
from backend.common.services.ai.agents import AIAgents

logger = logging.getLogger(__name__)

class AssignmentService:
    def __init__(self, tenant_id: str = 'public'):
        self.tenant_id = tenant_id
        self.repo = AssignmentRepository(tenant_id=tenant_id)
        self.assessment_repo = AssessmentRepository(tenant_id=tenant_id)
        self.ai = AIAgents()

    def get_user_assignments(self, user_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_user_assignments(user_id)

    def get_assignment_candidates(self, asm_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_assignment_candidates(asm_id)

    async def assign_assessment(
        self, asm_id: int, user_ids: List[int], assigned_by: int, 
        deadline: Optional[str] = None, generate_variants: bool = False
    ) -> int:
        """Assign users to an assessment, optionally triggering AI variant generation."""
        # Check if assessment exists
        asm = self.assessment_repo.get_assessment_by_id(asm_id)
        if not asm:
            raise ValueError("Assessment not found")

        assigned_count = 0
        for uid in user_ids:
            existing = self.repo.get_assignment(asm_id, uid)
            if existing:
                self.repo.update_assignment_status(asm_id, uid, 'pending', deadline)
            else:
                self.repo.create_assignment(asm_id, uid, assigned_by, deadline)
                assigned_count += 1

        # Best-effort email notification
        try:
            from backend.core.email_service_extended import send_assessment_notification_email
            for uid in user_ids:
                send_assessment_notification_email(uid, asm_id, self.tenant_id)
        except Exception as e:
            logger.warning(f"Assessment notification email failed (non-blocking): {e}")

        # Generate AI variants in background
        if generate_variants and asm.get('questions'):
            asyncio.create_task(
                self._generate_variants_background(asm_id, user_ids, asm['questions'])
            )

        return assigned_count

    async def _generate_variants_background(
        self, asm_id: int, user_ids: List[int], questions: List[Dict[str, Any]]
    ):
        system_prompt = """You are an assessment anti-cheating AI.
Rewrite each question with different wording (same concept and difficulty).
For MCQ questions, shuffle the options but keep correct_answer pointing to the correct content.
Respond ONLY with valid JSON: {"questions": [ ...reworded questions... ]}"""

        for user_id in user_ids:
            try:
                prompt = f"Randomize these questions for user {user_id}:\n{json.dumps(questions, default=str)}"
                result = await self.ai.ai.generate_json(prompt, system_prompt)
                variant_questions = result.get("questions", questions)
                self.repo.update_custom_questions(asm_id, user_id, variant_questions)
            except Exception as e:
                logger.error(f"Variant generation failed for user {user_id}: {e}")
