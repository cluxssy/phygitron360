from fastapi import APIRouter, HTTPException, Depends
from backend.modules.deploy.services.assessment_service import AssessmentService
from backend.modules.deploy.api.auth import get_current_user
from backend.modules.deploy.schemas.assessment import SaveAssessmentRequest, RequestAssessmentRequest

router = APIRouter(prefix="/api/assessments", tags=["Performance Metrics"])

def get_service(user=Depends(get_current_user)):
    return AssessmentService(tenant_id=user.get('tenant_id', 'public'))

@router.get("/{employee_code}/{year}")
def get_assessments(employee_code: str, year: int, user=Depends(get_current_user), service: AssessmentService = Depends(get_service)):
    try:
        # service handles authorization
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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/request")
def request_review(req: RequestAssessmentRequest, user=Depends(get_current_user), service: AssessmentService = Depends(get_service)):
    if user['role'] not in ['Admin', 'HR', 'Management', 'org_admin', 'manager']:
        raise HTTPException(status_code=403, detail="Authority override required for this action")
    return service.request_review(req.employee_code, req.year, req.period_type, req.period_value)
