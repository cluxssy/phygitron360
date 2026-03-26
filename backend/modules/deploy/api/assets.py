from fastapi import APIRouter, HTTPException, Depends, Body
from backend.modules.deploy.api.auth import require_role 
from backend.modules.deploy.services.asset_service import AssetService
from backend.modules.deploy.schemas.asset import AssetChecklist

router = APIRouter(prefix="/api/assets", tags=["assets"], dependencies=[Depends(require_role(["Admin", "HR"]))])

def get_service():
    return AssetService()

@router.get("/{employee_code}")
def get_asset_checklist(employee_code: str, service: AssetService = Depends(get_service)):
    try:
        return service.get_checklist(employee_code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{employee_code}")
def upsert_asset_checklist(employee_code: str, data: dict = Body(...), service: AssetService = Depends(get_service)):
    # Using generic dict for body to allow flexibility, but we could use AssetChecklist schema
    try:
        return service.upsert_checklist(employee_code, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
