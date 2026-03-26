from fastapi import APIRouter, HTTPException, Depends
from backend.modules.deploy.services.assessment_service import AssessmentService
from backend.modules.deploy.api.auth import get_current_user
from backend.modules.deploy.schemas.assessment import SaveAssessmentRequest

router = APIRouter(prefix="/api/assessments", tags=["Quarterly Assessments"])

def get_service():
    return AssessmentService()

@router.get("/{employee_code}/{year}")
def get_assessments(employee_code: str, year: int, user=Depends(get_current_user), service: AssessmentService = Depends(get_service)):
    try:
        return service.get_assessments(employee_code, year, user)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save")
def save_assessment(req: SaveAssessmentRequest, user=Depends(get_current_user), service: AssessmentService = Depends(get_service)):
    try:
        return service.save_assessment(req, user)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
