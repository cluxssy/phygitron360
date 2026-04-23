from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Body
from typing import List
from backend.core.dependencies import require_permission, get_current_user
from backend.modules.deploy.services.employee_service import EmployeeService
from backend.modules.deploy.schemas.employee import UpdateEmployeeRequest, OffboardRequest
from backend.core.database import DATA_DIR
from backend.common.services.storage_service import save_uploaded_file
import os
import shutil

router = APIRouter(prefix="/api", tags=["employees"])

def get_service(tenant_id: str = 'public'):
    return EmployeeService(tenant_id=tenant_id)

@router.get("/employees", dependencies=[Depends(require_permission("deploy.employees.view"))])
def get_employees(current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    return service.get_all_employees()

@router.get("/employee/{employee_code}", dependencies=[Depends(require_permission("deploy.employees.view"))])
def get_employee(employee_code: str, current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    employee = service.get_employee_full_details(employee_code)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.post("/employee", dependencies=[Depends(require_permission("deploy.employees.create"))])
async def create_employee(
    code: str = Form(...),
    name: str = Form(...),
    dob: str = Form(...),
    phone: str = Form(...),
    emergency: str = Form(...),
    email: str = Form(...),
    doj: str = Form(...),
    team: str = Form(...),
    designation: str = Form(...),
    role: str = Form(...),
    type: str = Form(...),
    manager: str = Form(...),
    location: str = Form(...),
    current_address: str = Form(None),
    permanent_address: str = Form(None),
    pf: str = Form(None),
    mediclaim: str = Form(None),
    notes: str = Form(None),
    primary_skillset: str = Form(None),
    secondary_skillset: str = Form(None),
    experience_years: float = Form(None),
    photo_file: UploadFile = File(None),
    cv_file: UploadFile = File(None),
    id_proof_file: UploadFile = File(None),
    education_details: str = Form(None),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    
    photo_path = save_uploaded_file(photo_file, 'pfps', code, 'pfp')
    cv_path = save_uploaded_file(cv_file, 'cvs', code, 'cv')
    id_proofs_path = save_uploaded_file(id_proof_file, 'id', code, 'id_proof')

    data = {
        "code": code, "name": name, "dob": dob, "phone": phone, "emergency": emergency,
        "email": email, "doj": doj, "team": team, "designation": designation, "role": role, "type": type,
        "manager": manager, "location": location, "current_address": current_address,
        "permanent_address": permanent_address, "pf": pf, "mediclaim": mediclaim, "notes": notes,
        "education_details": education_details,
        "primary_skillset": primary_skillset, "secondary_skillset": secondary_skillset,
        "experience_years": experience_years, "photo_path": photo_path, "cv_path": cv_path,
        "id_proofs": id_proofs_path
    }

    try:
        return service.create_employee(data)
    except ValueError as e:
         raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.put("/employee/{employee_code}", dependencies=[Depends(require_permission("deploy.employees.edit"))])
def update_employee(employee_code: str, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    try:
        return service.update_employee(employee_code, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/employee/{employee_code}/documents", dependencies=[Depends(require_permission("deploy.employees.edit"))])
async def upload_documents(
    employee_code: str,
    photo_file: UploadFile = File(None),
    cv_file: UploadFile = File(None),
    id_proof_file: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    updates = {}
    
    if photo_file:
        updates['photo_path'] = save_uploaded_file(photo_file, 'pfps', employee_code, 'pfp')
    if cv_file:
        updates['cv_path'] = save_uploaded_file(cv_file, 'cvs', employee_code, 'cv')
    if id_proof_file:
        updates['id_proofs'] = save_uploaded_file(id_proof_file, 'id', employee_code, 'id_proof')
        
    if not updates:
        return {"message": "No files received"}

    try:
        return service.update_employee(employee_code, updates)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/employee/{employee_code}", dependencies=[Depends(require_permission("deploy.employees.delete"))])
def delete_employee(employee_code: str, current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    try:
        return service.delete_employee(employee_code)
    except ValueError as e:
         raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/options", dependencies=[Depends(require_permission("deploy.employees.view"))])
def get_dropdown_options(current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    return service.get_options()

@router.post("/employee/{employee_code}/offboard", dependencies=[Depends(require_permission("deploy.employees.offboard"))])
def offboard_employee(employee_code: str, data: OffboardRequest, current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    try:
        return service.offboard_employee(employee_code, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
