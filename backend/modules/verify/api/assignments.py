import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from backend.core.dependencies import get_current_user, require_permission
from backend.modules.verify.services.assignment_service import AssignmentService
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/assignments", tags=["Verify - Assignments"])

class AssignRequest(BaseModel):
    user_ids: List[int]
    deadline: Optional[str] = None

def get_service(current_user: dict = Depends(get_current_user)):
    return AssignmentService(tenant_id=current_user.get("tenant_id", "public"))

@router.post("/{asm_id}/send")
def assign_assessment(
    asm_id: int,
    body: AssignRequest,
    current_user: dict = Depends(require_permission("verify.assessments.assign")),
    service: AssignmentService = Depends(get_service)
):
    """Broadcasts a specific assessment to multiple users."""
    try:
        hr_id = current_user.get("id")
        result = service.assign_assessment(asm_id, body.user_ids, hr_id, body.deadline)
        return result
    except Exception as e:
        logger.error(f"Failed to assign assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}")
def get_user_assignments(
    user_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.view_results")),
    service: AssignmentService = Depends(get_service)
):
    """Fetches all tests assigned to a specific person for HR review."""
    return {"success": True, "data": service.get_user_assignments(user_id)}
