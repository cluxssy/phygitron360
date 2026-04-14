import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Body
from backend.modules.deploy.api.auth import get_current_user, require_role
from backend.modules.verify.services.assessment_service import AssessmentService
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/builder", tags=["Verify - Builder"])

class AssessmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str = "mcq"
    time_limit_minutes: Optional[int] = None
    pass_score: float = 70.0
    shuffle_questions: bool = False
    show_result_immediately: bool = True
    questions: List[Dict[str, Any]] = []

def get_service(current_user: dict = Depends(get_current_user)):
    return AssessmentService(tenant_id=current_user.get("tenant_id", "public"))

@router.post("/assessments")
def create_assessment(
    body: AssessmentCreate,
    current_user: dict = Depends(require_role(["HR", "Admin"])),
    service: AssessmentService = Depends(get_service)
):
    """Saves a new assessment template to the system."""
    try:
        asm_data = body.dict()
        asm_data["created_by"] = current_user.get("id")
        asm_id = service.create_assessment(asm_data)
        return {"success": True, "data": {"id": asm_id}}
    except Exception as e:
        logger.error(f"Failed to create assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
def list_templates(
    current_user: dict = Depends(require_role(["HR", "Admin"])),
    service: AssessmentService = Depends(get_service)
):
    """Returns all available assessment templates."""
    return {"success": True, "data": service.get_all_assessments()}

@router.get("/templates/{asm_id}")
def get_template(
    asm_id: int, 
    service: AssessmentService = Depends(get_service)
):
    """Returns a specific assessment template."""
    asm = service.get_assessment(asm_id)
    if not asm:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True, "data": asm}

@router.post("/templates/{asm_id}/publish")
def publish_assessment(
    asm_id: int,
    current_user: dict = Depends(require_role(["HR", "Admin"])),
    service: AssessmentService = Depends(get_service)
):
    """Publishes a template, making it available for assignment."""
    success = service.publish_assessment(asm_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True, "message": "Assessment published successfully"}

@router.post("/ai-generate-code")
async def generate_coding_meta(
    topic: str = Body(..., embed=True),
    difficulty: str = Body("medium", embed=True),
    current_user: dict = Depends(require_role(["HR", "Admin"])),
    service: AssessmentService = Depends(get_service)
):
    """Uses AI to generate coding problem boilerplate."""
    try:
        result = await service.generate_coding_meta(topic, difficulty)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
