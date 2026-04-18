import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from backend.modules.deploy.api.auth import get_current_user, require_role
from backend.modules.verify.services.grading_service import GradingService
from backend.modules.verify.services.assignment_service import AssignmentService
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/submissions", tags=["Verify - Submissions"])

class SubmitRequest(BaseModel):
    assessment_id: int
    answers: Dict[str, Any]
    time_taken_seconds: Optional[int] = None
    proctoring_events: Optional[List[Dict[str, Any]]] = None

def get_grading_service(current_user: dict = Depends(get_current_user)):
    return GradingService(tenant_id=current_user.get("tenant_id", "public"))

def get_assignment_service(current_user: dict = Depends(get_current_user)):
    return AssignmentService(tenant_id=current_user.get("tenant_id", "public"))

@router.get("/my-tests")
def get_my_assignments(
    current_user: dict = Depends(get_current_user),
    service: AssignmentService = Depends(get_assignment_service)
):
    """Lists all tests available for the currently logged-in candidate or employee."""
    user_id = current_user.get("id")
    assignments = service.get_user_assignments(user_id)
    return {"success": True, "data": assignments}

@router.post("/submit")
async def submit_assessment(
    body: SubmitRequest,
    current_user: dict = Depends(get_current_user),
    service: GradingService = Depends(get_grading_service)
):
    """Accepts a completed assessment and triggers logic for automated scoring and feedback."""
    try:
        user_id = current_user.get("id")
        result = await service.grade_submission(
            assessment_id=body.assessment_id,
            user_id=user_id,
            answers=body.answers,
            time_taken=body.time_taken_seconds or 0,
            proctoring_events=body.proctoring_events or []
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{result_id}")
def get_result_details(
    result_id: int,
    current_user: dict = Depends(get_current_user),
    service: GradingService = Depends(get_grading_service)
):
    """Fetches details, scores, and feedback for a finished assessment."""
    result = service.get_result(result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result report not found")
    return {"success": True, "data": result}

@router.get("/review/{asm_id}")
def get_assessment_submissions(
    asm_id: int,
    current_user: dict = Depends(require_role(["org_admin", "manager"])),
    service: GradingService = Depends(get_grading_service)
):
    """Lists all submissions for a template for internal HR review."""
    submissions = service.get_assessment_submissions(asm_id)
    return {"success": True, "data": submissions}
