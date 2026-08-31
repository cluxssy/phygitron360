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

    def get_recent_assignments(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.repo.get_recent_assignments(limit)

    def get_assignable_users(self) -> List[Dict[str, Any]]:
        return self.repo.get_assignable_users()

    async def assign_assessment(
        self, asm_id: int, user_ids: List[int], assigned_by: int, 
        deadline: Optional[str] = None, generate_variants: bool = False,
        question_ids: Optional[List[int]] = None, shuffle_questions: bool = False
    ) -> int:
        """Assign users to an assessment, optionally triggering AI variant generation."""
        # Check if assessment exists
        asm = self.assessment_repo.get_assessment_by_id(asm_id)
        if not asm:
            raise ValueError("Assessment not found")

        assigned_count = 0
        base_questions = asm.get('questions', [])
        
        # Pre-filter by subset if provided
        if question_ids:
            base_questions = [q for q in base_questions if q.get('id') in question_ids]

        for uid in user_ids:
            existing = self.repo.get_assignment(asm_id, uid)
            if existing:
                self.repo.update_assignment_status(asm_id, uid, 'pending', deadline)
            else:
                self.repo.create_assignment(asm_id, uid, assigned_by, deadline)
                assigned_count += 1

            # If shuffling is requested without generating AI variants, shuffle locally
            if shuffle_questions and not generate_variants and base_questions:
                import random
                shuffled = base_questions.copy()
                random.shuffle(shuffled)
                self.repo.update_custom_questions(asm_id, uid, shuffled)
            elif question_ids and not generate_variants:
                self.repo.update_custom_questions(asm_id, uid, base_questions)

        # Best-effort email + in-app notification
        try:
            from backend.core.email_service_extended import send_assessment_notification_email
            from backend.modules.deploy.services.notification_service import add_notification
            import os
            asm_title = asm.get('title', 'a new assessment')
            duration = asm.get('time_limit_minutes', 60)
            question_count = len(base_questions) if base_questions else None
            company_name = os.getenv("COMPANY_NAME", "Phygitron 360")
            
            for uid in user_ids:
                u_info = self.repo.get_user_info(uid)
                if u_info and u_info.get("email"):
                    c_name = u_info.get("name") or u_info.get("email", "").split("@")[0]
                    send_assessment_notification_email(
                        to_email=u_info["email"],
                        candidate_name=c_name,
                        assessment_title=asm_title,
                        company_name=company_name,
                        deadline=deadline or "Within 48 hours",
                        duration_mins=duration,
                        question_count=question_count
                    )

                add_notification(
                    title="New Assessment Assigned",
                    message=f"You have been assigned: {asm_title}. Please complete it before the deadline.",
                    user_id=uid,
                    n_type="Alert",
                    tenant_id=self.tenant_id
                )
        except Exception as e:
            logger.warning(f"Assessment notification failed (non-blocking): {e}")

        # Generate AI variants in background
        if generate_variants and base_questions:
            asyncio.create_task(
                self._generate_variants_background(asm_id, user_ids, base_questions)
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

    def start_session(self, asm_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Start or resume a session. Returns session metadata dict or None if not assigned.
        On a fresh start: stamps started_at, sets status='in_progress'.
        On a resume: increments resume_count only.
        """
        return self.repo.start_session(asm_id, user_id)

    def record_strike(
        self,
        asm_id: int,
        user_id: int,
        violation_name: str = "proctoring_violation",
        flag_type: str = "proctoring_violation",
        is_terminal: bool = False,
    ) -> Dict[str, Any]:
        """Record a proctoring strike and persist the violation reason."""
        return self.repo.record_strike(
            asm_id=asm_id,
            user_id=user_id,
            violation_name=violation_name,
            flag_type=flag_type,
            is_terminal=is_terminal,
        )
