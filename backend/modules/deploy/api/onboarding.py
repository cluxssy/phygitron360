from fastapi import APIRouter, HTTPException, Depends, Body, Form, File, UploadFile
from backend.modules.deploy.services.onboarding_service import OnboardingService
from backend.modules.deploy.api.auth import require_role 
from backend.modules.deploy.schemas.onboarding import InviteRequest
from backend.core.database import DATA_DIR
import os
import shutil
import uuid

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

def get_service():
    return OnboardingService()

@router.post("/invite", dependencies=[Depends(require_role(["Admin", "HR", "org_admin", "hr_manager"]))])
def send_invite(invite: InviteRequest, service: OnboardingService = Depends(get_service)):
    try:
        return service.create_invite(invite.dict())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invites", dependencies=[Depends(require_role(["Admin", "HR", "org_admin", "hr_manager"]))])
def get_invites(service: OnboardingService = Depends(get_service)):
    return service.get_all_invites()

@router.delete("/invite/{invite_id}", dependencies=[Depends(require_role(["Admin", "HR", "org_admin", "hr_manager"]))])
def revoke_invite(invite_id: int, service: OnboardingService = Depends(get_service)):
    return service.revoke_invite(invite_id)

@router.post("/verify-token")
def verify_token(data: dict = Body(...), service: OnboardingService = Depends(get_service)):
    token = data.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Token required")
        
    try:
        return service.verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/complete")
def complete_onboarding(
    token: str = Form(...),
    password: str = Form(...),
    contact_number: str = Form(...),
    emergency_contact: str = Form(...),
    dob: str = Form(...),
    current_address: str = Form(...),
    permanent_address: str = Form(...),
    education_details: str = Form(None),
    primary_skills: str = Form(None),
    secondary_skills: str = Form(None),
    photo_file: UploadFile = File(None),
    cv_file: UploadFile = File(None),
    id_proof_file: UploadFile = File(None),
    service: OnboardingService = Depends(get_service)
):
    # File Saving Logic (Controller Layer)
    # Temporary placeholder code for file saving, similar to before.
    # In a perfect world this is a utility function.
    
    # We don't have the employee code yet, so we have to generate one or name files by token/temp ID.
    # However, standard practice: service generates code -> returns it -> we rename folder?
    # Or we pass the file objects to service? 
    # Or we save to a temp folder and let service move them?
    # Or simpler: just save using token as identifier for now, and rely on unique filenames.
    
    temp_id = token
    upload_base = os.path.join(DATA_DIR, 'uploads', 'temp_onboarding', temp_id)
    os.makedirs(upload_base, exist_ok=True)
    
    def save(f):
        if not f: return ''
        path = os.path.join(upload_base, f.filename)
        with open(path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)
        # Return relative path
        return f"uploads/temp_onboarding/{temp_id}/{f.filename}"
    
    # Wait! If we save to temp, the service needs to move them to final 'EMPXXX' folder if we follow that structure.
    # For now, let's keep it simple: Just save them.
    # Actually, the original code generated EMP code first, then saved files to `uploads/EMPXXX`.
    # That is cleaner.
    # So the Service needs to handle file saving or return the generated code so we can save.
    # BUT, the transaction happens in service.
    # Strategy: Pass UploadFile objects to Service? No, Pydantic/Service layer shouldn't depend on FastAPI UploadFile if possible.
    # Pragmatic Approach: Save to a temp location here, pass paths to service. 
    # Service generates EMP Code, creates DB records.
    # Return success.
    # Post-process: Move files? Or just leave them in `uploads/temp_onboarding`?
    # Better: Use the structure: `uploads/onboarding_docs/{filename}`.
    
    p_path = save(photo_file)
    c_path = save(cv_file)
    i_path = save(id_proof_file)
    
    emp_data = {
        "contact_number": contact_number,
        "emergency_contact": emergency_contact,
        "dob": dob,
        "current_address": current_address,
        "permanent_address": permanent_address,
        "education_details": education_details,
        "primary_skills": primary_skills,
        "secondary_skills": secondary_skills
    }
    
    file_metadata = {
        "photo": p_path,
        "cv": c_path,
        "id_proof": i_path
    }
    
    try:
        return service.complete_onboarding(token, password, emp_data, file_metadata)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/approvals", dependencies=[Depends(require_role(["Admin", "HR"]))])
def get_pending_approvals(service: OnboardingService = Depends(get_service)):
    return service.get_pending_approvals()

@router.post("/approve/{employee_code}", dependencies=[Depends(require_role(["Admin", "HR"]))])
def approve_onboarding(
    employee_code: str,
    reporting_manager: str = Form(None),
    employment_type: str = Form("Full Time"),
    pf_included: str = Form("No"),
    mediclaim_included: str = Form("No"),
    notes: str = Form(None),
    service: OnboardingService = Depends(get_service)
):
    approval_data = {
        "manager": reporting_manager,
        "type": employment_type,
        "pf": pf_included,
        "mediclaim": mediclaim_included,
        "notes": notes
    }
    try:
        return service.approve_onboarding(employee_code, approval_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
