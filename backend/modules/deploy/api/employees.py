from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Body
from typing import List
from backend.modules.deploy.api.auth import require_role, get_current_user
from backend.modules.deploy.services.employee_service import EmployeeService
from backend.modules.deploy.schemas.employee import UpdateEmployeeRequest, OffboardRequest
from backend.core.database import DATA_DIR
from backend.common.services.storage_service import save_uploaded_file
import os
import shutil

router = APIRouter(prefix="/api", tags=["employees"])

def get_service():
    return EmployeeService()

@router.get("/employees", dependencies=[Depends(require_role(["Admin", "HR", "Management", "Employee"]))])
def get_employees(service: EmployeeService = Depends(get_service)):
    return service.get_all_employees()

@router.get("/employee/{employee_code}", dependencies=[Depends(require_role(["Admin", "HR", "Management", "Employee"]))])
def get_employee(employee_code: str, service: EmployeeService = Depends(get_service)):
    employee = service.get_employee_full_details(employee_code)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.post("/employee", dependencies=[Depends(require_role(["Admin", "HR"]))])
async def create_employee(
    code: str = Form(...),
    name: str = Form(...),
    dob: str = Form(...),
    phone: str = Form(...),
    emergency: str = Form(...),
    email: str = Form(...),
    doj: str = Form(...),
    team: str = Form(...),
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
    service: EmployeeService = Depends(get_service)
):
    # File handling logic moved to utils/storage.py
    photo_path = save_uploaded_file(photo_file, 'pfps', code, 'pfp')
    cv_path = save_uploaded_file(cv_file, 'cvs', code, 'cv')
    id_proofs_path = save_uploaded_file(id_proof_file, 'id', code, 'id_proof')

    data = {
        "code": code, "name": name, "dob": dob, "phone": phone, "emergency": emergency,
        "email": email, "doj": doj, "team": team, "role": role, "type": type,
        "manager": manager, "location": location, "current_address": current_address,
        "permanent_address": permanent_address, "pf": pf, "mediclaim": mediclaim, "notes": notes,
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

@router.put("/employee/{employee_code}", dependencies=[Depends(require_role(["Admin", "HR", "Employee"]))])
def update_employee(employee_code: str, data: dict = Body(...), service: EmployeeService = Depends(get_service)):
    try:
        return service.update_employee(employee_code, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/employee/{employee_code}/documents", dependencies=[Depends(require_role(["Admin", "HR", "Employee"]))])
async def upload_documents(
    employee_code: str,
    photo_file: UploadFile = File(None),
    cv_file: UploadFile = File(None),
    id_proof_file: UploadFile = File(None),
    service: EmployeeService = Depends(get_service)
):
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

@router.delete("/employee/{employee_code}", dependencies=[Depends(require_role(["Admin", "HR"]))])
def delete_employee(employee_code: str, service: EmployeeService = Depends(get_service)):
    try:
        return service.delete_employee(employee_code)
    except ValueError as e:
         raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/options", dependencies=[Depends(require_role(["Admin", "HR", "Management", "Employee"]))])
def get_dropdown_options(service: EmployeeService = Depends(get_service)):
     return service.get_options()

@router.post("/employee/{employee_code}/offboard", dependencies=[Depends(require_role(["Admin", "HR"]))])
def offboard_employee(employee_code: str, data: OffboardRequest, service: EmployeeService = Depends(get_service)):
    try:
        return service.offboard_employee(employee_code, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
