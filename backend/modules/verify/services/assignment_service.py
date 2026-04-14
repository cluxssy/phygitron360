import logging
from typing import List, Dict, Any, Optional
from backend.modules.verify.repositories.assessment_repo import AssessmentRepository

logger = logging.getLogger(__name__)

class AssignmentService:
    def __init__(self, tenant_id: str = 'public'):
        self.tenant_id = tenant_id
        self.repo = AssessmentRepository(tenant_id=tenant_id)

    def assign_assessment(self, asm_id: int, user_ids: List[int], hr_id: int, deadline: str = None) -> Dict[str, Any]:
        """Assign an assessment to multiple users."""
        asm_obj = self.repo.get_assessment_by_id(asm_id)
        if not asm_obj:
            raise ValueError("Assessment not found")
            
        success_count = 0
        for uid in user_ids:
            try:
                self.repo.create_assignment(asm_id, uid, hr_id, deadline)
                success_count += 1
            except Exception as e:
                logger.error(f"Failed to assign asm {asm_id} to user {uid}: {e}")
                
        return {"success": True, "assigned_count": success_count, "failed_count": len(user_ids) - success_count}

    def get_user_assignments(self, user_id: int) -> List[Dict[str, Any]]:
        """Fetch all assignments for a specific candidate/employee."""
        return self.repo.get_user_assignments(user_id)
