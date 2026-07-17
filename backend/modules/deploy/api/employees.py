from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Body
from typing import List, Optional
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
    # Only name is mandatory, all others optional
    name: str = Form(...),
    code: Optional[str] = Form(None),
    dob: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    emergency: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    doj: Optional[str] = Form(None),
    team: Optional[str] = Form(None),
    designation: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    manager: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    current_address: Optional[str] = Form(None),
    permanent_address: Optional[str] = Form(None),
    pf: Optional[str] = Form(None),
    mediclaim: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    primary_skillset: Optional[str] = Form(None),
    secondary_skillset: Optional[str] = Form(None),
    experience_years: Optional[float] = Form(None),
    photo_file: Optional[UploadFile] = File(None),
    cv_file: Optional[UploadFile] = File(None),
    id_proof_file: Optional[UploadFile] = File(None),
    education_details: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    
    # Save files only if they exist
    photo_path = None
    if photo_file and photo_file.filename:
        photo_path = save_uploaded_file(photo_file, tenant_id, 'deploy', 'pfp', code or 'unknown', 'pfp')
    
    cv_path = None
    if cv_file and cv_file.filename:
        cv_path = save_uploaded_file(cv_file, tenant_id, 'deploy', 'resume', code or 'unknown', 'cv')
    
    id_proofs_path = None
    if id_proof_file and id_proof_file.filename:
        id_proofs_path = save_uploaded_file(id_proof_file, tenant_id, 'deploy', 'identification_docs', code or 'unknown', 'id_proof')

    data = {
        "name": name,  # name is mandatory
        "code": code,
        "dob": dob,
        "phone": phone,
        "emergency": emergency,
        "email": email,
        "doj": doj,
        "team": team,
        "designation": designation,
        "role": role,
        "type": type,
        "manager": manager,
        "location": location,
        "current_address": current_address,
        "permanent_address": permanent_address,
        "pf": pf,
        "mediclaim": mediclaim,
        "notes": notes,
        "education_details": education_details,
        "primary_skillset": primary_skillset,
        "secondary_skillset": secondary_skillset,
        "experience_years": experience_years,
        "photo_path": photo_path,
        "cv_path": cv_path,
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
    photo_file: Optional[UploadFile] = File(None),
    cv_file: Optional[UploadFile] = File(None),
    id_proof_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    updates = {}
    
    if photo_file and photo_file.filename:
        updates['photo_path'] = save_uploaded_file(photo_file, tenant_id, 'deploy', 'pfp', employee_code, 'pfp')
    if cv_file and cv_file.filename:
        updates['cv_path'] = save_uploaded_file(cv_file, tenant_id, 'deploy', 'resume', employee_code, 'cv')
    if id_proof_file and id_proof_file.filename:
        updates['id_proofs'] = save_uploaded_file(id_proof_file, tenant_id, 'deploy', 'identification_docs', employee_code, 'id_proof')
        
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

import io
import json
import pandas as pd
from fastapi.responses import StreamingResponse

@router.get("/employees/bulk-upload/template", dependencies=[Depends(require_permission("deploy.employees.create"))])
def get_bulk_upload_template():
    columns = [
        "Employee Code", "Name", "Email ID", "Role", "Date of Joining", 
        "Designation", "Team / Department", "Employment Type", "Reporting Manager", 
        "Base Location", "Employment Status", "Date of Birth", "Contact Number", 
        "Emergency Contact Name", "Emergency Contact", "Current Address", "Permanent Address", 
        "Primary Skills", "Secondary Skills", "Experience Years", "Education Details",
        "Bank Name", "Bank Account No.", "PAN No.", "PF Included", "Mediclaim Included", "Notes"
    ]
    df = pd.DataFrame(columns=columns)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Template')
        
        workbook = writer.book
        worksheet = writer.sheets['Template']
        header_format = workbook.add_format({
            'bold': True,
            'bg_color': '#D7E4BC',
            'border': 1
        })
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, 20)
            
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="employee_bulk_upload_template.xlsx"'
    }
    
    return StreamingResponse(output, headers=headers, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@router.post("/employees/bulk", dependencies=[Depends(require_permission("deploy.employees.create"))])
def bulk_upload_employees(employees: List[dict] = Body(...), current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get('tenant_id', 'public')
    service = get_service(tenant_id)
    
    results = {
        "total": len(employees),
        "success": 0,
        "failed": 0,
        "errors": []
    }
    
    for idx, row in enumerate(employees):
        try:
            # Only name is mandatory - everything else can be blank/None
            name = str(row.get("Name", "")).strip()
            if not name:
                raise ValueError("Name is mandatory")
            
            # Build data dict with safe defaults for ALL fields
            data = {
                "code": str(row.get("Employee Code", "")).strip() or None,
                "name": name,
                "dob": str(row.get("Date of Birth", "")).strip() or None,
                "phone": str(row.get("Contact Number", "")).strip() or None,
                "emergency": str(row.get("Emergency Contact", "")).strip() or None,
                "email": str(row.get("Email ID", "")).strip() or None,
                "doj": str(row.get("Date of Joining", "")).strip() or None,
                "team": str(row.get("Team / Department", "")).strip() or None,
                "designation": str(row.get("Designation", "")).strip() or None,
                "role": str(row.get("Role", "employee")).strip().lower() or "employee",
                "type": str(row.get("Employment Type", "Full-time")).strip() or "Full-time",
                "manager": str(row.get("Reporting Manager", "")).strip() or None,
                "location": str(row.get("Base Location", "")).strip() or None,
                "employment_status": str(row.get("Employment Status", "Active")).strip() or "Active",
                "current_address": str(row.get("Current Address", "")).strip() or None,
                "permanent_address": str(row.get("Permanent Address", "")).strip() or None,
                "pf": "Yes" if str(row.get("PF Included", "")).strip().lower() in ['yes', 'true', '1'] else "No",
                "mediclaim": "Yes" if str(row.get("Mediclaim Included", "")).strip().lower() in ['yes', 'true', '1'] else "No",
                "notes": str(row.get("Notes", "")).strip() or None,
                "primary_skillset": str(row.get("Primary Skills", "")).strip() or None,
                "secondary_skillset": str(row.get("Secondary Skills", "")).strip() or None,
                "experience_years": None,  # Will be handled below
                "bank_name": str(row.get("Bank Name", "")).strip() or None,
                "bank_account_no": str(row.get("Bank Account No.", "")).strip() or None,
                "pan_no": str(row.get("PAN No.", "")).strip() or None,
                "photo_path": None,
                "cv_path": None,
                "id_proofs": None,
                "education_details": []
            }
            
            # Handle experience years safely
            exp_years = row.get("Experience Years")
            if exp_years is not None and str(exp_years).strip():
                try:
                    data["experience_years"] = float(exp_years)
                except (ValueError, TypeError):
                    data["experience_years"] = None
            else:
                data["experience_years"] = None
            
            # Handle education details safely
            edu_details = str(row.get("Education Details", "")).strip()
            if edu_details:
                try:
                    education_details = json.loads(edu_details)
                    if isinstance(education_details, list):
                        data["education_details"] = education_details
                except json.JSONDecodeError:
                    data["education_details"] = []
            else:
                data["education_details"] = []
            
            # Remove None values so service uses defaults
            # But keep name and any other fields that might have values
            clean_data = {}
            for k, v in data.items():
                if v is not None:
                    clean_data[k] = v
                elif k == "name":  # Always keep name
                    clean_data[k] = v
                elif k == "employment_status":  # Keep defaults
                    clean_data[k] = v
                elif k == "type":  # Keep defaults
                    clean_data[k] = v
                elif k == "role":  # Keep defaults
                    clean_data[k] = v
                elif k == "pf":  # Keep defaults
                    clean_data[k] = v
                elif k == "mediclaim":  # Keep defaults
                    clean_data[k] = v
                elif k == "education_details":  # Keep empty list
                    clean_data[k] = v
            
            # Make sure we have at least the mandatory fields
            if "name" not in clean_data:
                clean_data["name"] = name
            
            service.create_employee(clean_data)
            results["success"] += 1
            
        except Exception as e:
            results["failed"] += 1
            error_detail = str(e)
            # Log the error for debugging
            print(f"Error on row {idx + 1}: {error_detail}")
            print(f"Row data: {row}")
            results["errors"].append({
                "row": idx + 1,
                "code": str(row.get("Employee Code", "Unknown")),
                "name": str(row.get("Name", "Unknown")),
                "error": error_detail
            })
            
    return results