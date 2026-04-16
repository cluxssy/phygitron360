from fastapi import APIRouter, HTTPException, Depends, Request, Body
from typing import List, Optional, Dict, Any
from backend.modules.deploy.api.auth import get_current_user
from backend.modules.deploy.services.performance_service import PerformanceService

router = APIRouter(prefix="/api/assessments", tags=["Performance"])

def get_service(user=Depends(get_current_user)):
    return PerformanceService(tenant_id=user.get('tenant_id', 'public'))

@router.get("/{employee_code}/{year}")
def get_assessments(employee_code: str, year: int, service: PerformanceService = Depends(get_service)):
    return service.get_assessments(employee_code, year)

@router.post("/save")
def save_assessment(
    data: Dict[str, Any] = Body(...), 
    user=Depends(get_current_user), 
    service: PerformanceService = Depends(get_service)
):
    try:
        return service.save_assessment(data, user['role'], user.get('employee_code'))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/request")
def request_review(
    data: Dict[str, Any] = Body(...),
    user=Depends(get_current_user),
    service: PerformanceService = Depends(get_service)
):
    if user['role'] not in ['Admin', 'HR', 'Management', 'org_admin', 'manager']:
        raise HTTPException(status_code=403, detail="Not authorized")
    return service.request_review(data['employee_code'], data['year'], data['period_type'], data['period_value'])
