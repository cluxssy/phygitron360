from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from backend.modules.deploy.api.auth import require_role, get_current_user
from backend.modules.deploy.services.admin_service import AdminService
from backend.modules.deploy.schemas.admin import UserCreate, UserResponse, LogResponse, RolePermissionsUpdate, UserOverrideUpdate, RoleUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_role(["Admin"]))])

def get_service():
    return AdminService()

@router.get("/users", response_model=List[UserResponse])
def list_users(service: AdminService = Depends(get_service)):
    return service.list_users()

@router.post("/users")
def add_new_user(user: UserCreate, current_user: dict = Depends(get_current_user), service: AdminService = Depends(get_service)):
    try:
        return service.create_user(user.username, user.password, user.role, current_user['username'], user.employee_code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/users/{user_id}")
def delete_existing_user(user_id: int, current_user: dict = Depends(get_current_user), service: AdminService = Depends(get_service)):
    try:
        return service.delete_user(user_id, current_user['username'])
    except ValueError as e:
        if "not found" in str(e).lower():
             raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs", response_model=List[LogResponse])
def view_logs(service: AdminService = Depends(get_service)):
    return service.get_logs()

@router.get("/permissions/roles")
def get_role_permissions(service: AdminService = Depends(get_service)):
    return service.get_role_permissions()

@router.post("/permissions/roles")
def update_role_permissions(update: RolePermissionsUpdate, current_user: dict = Depends(get_current_user), service: AdminService = Depends(get_service)):
    try:
        return service.update_role_permissions(update.role, update.permissions, current_user['username'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/permissions/users/{user_id}")
def get_user_overrides(user_id: int, service: AdminService = Depends(get_service)):
    return service.get_user_overrides(user_id)

@router.post("/permissions/users/{user_id}")
def update_user_overrides(user_id: int, update: UserOverrideUpdate, current_user: dict = Depends(get_current_user), service: AdminService = Depends(get_service)):
    try:
        return service.update_user_overrides(user_id, update.overrides, current_user['username'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class EmployeeCodeUpdate(BaseModel):
    employee_code: Optional[str] = None

@router.patch("/users/{user_id}/employee-code")
def update_user_employee_code(
    user_id: int,
    data: EmployeeCodeUpdate,
    current_user: dict = Depends(get_current_user),
    service: AdminService = Depends(get_service)
):
    try:
        return service.update_employee_code(user_id, data.employee_code, current_user['username'])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    data: RoleUpdate,
    current_user: dict = Depends(get_current_user),
    service: AdminService = Depends(get_service)
):
    try:
        return service.update_role(user_id, data.role, current_user['username'])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
