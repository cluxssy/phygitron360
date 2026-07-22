from fastapi import APIRouter, HTTPException, Depends, Body, Form, File, UploadFile
from backend.modules.deploy.services.onboarding_service import OnboardingService
from backend.core.dependencies import require_role, require_module, require_permission
from backend.modules.deploy.schemas.onboarding import InviteRequest
from backend.core.database import DATA_DIR
from backend.common.services.storage_service import save_uploaded_file
import os
import shutil
import uuid

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

def get_service():
    return OnboardingService()

@router.post("/invite", dependencies=[Depends(require_module("deploy"))])
def send_invite(invite: InviteRequest, current_user: dict = Depends(require_permission("deploy.onboarding.send_invite")), service: OnboardingService = Depends(get_service)):
    try:
        tenant_id = current_user.get("tenant_id", "public")
        return service.create_invite(invite.dict(), tenant_id=tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invites", dependencies=[Depends(require_module("deploy"))])
def get_invites(current_user: dict = Depends(require_permission("deploy.onboarding.view")), service: OnboardingService = Depends(get_service)):
    tenant_id = current_user.get("tenant_id", "public")
    return service.get_all_invites(tenant_id=tenant_id)

@router.delete("/invite/{invite_id}", dependencies=[Depends(require_permission("deploy.onboarding.cancel_invite")), Depends(require_module("deploy"))])
def revoke_invite(invite_id: int, service: OnboardingService = Depends(get_service)):
    return service.revoke_invite(invite_id)

@router.delete("/invite/{invite_id}/delete", dependencies=[Depends(require_permission("deploy.onboarding.cancel_invite")), Depends(require_module("deploy"))])
def delete_invite(invite_id: int, service: OnboardingService = Depends(get_service)):
    return service.delete_invite(invite_id)

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
    location: str = Form(None),
    doj: str = Form(None),
    education_details: str = Form(None),
    primary_skills: str = Form(None),
    secondary_skills: str = Form(None),
    bank_name: str = Form(...),
    bank_account_no: str = Form(...),
    pan_no: str = Form(...),
    photo_file: UploadFile = File(None),
    cv_file: UploadFile = File(None),
    id_proof_file: UploadFile = File(None),
    service: OnboardingService = Depends(get_service)
):
    temp_id = token
    
    # For unauthenticated completion, files go to a public temp directory until approved
    p_path = save_uploaded_file(photo_file, 'public', 'deploy', 'temp_onboarding', temp_id, 'pfp') if photo_file else ''
    c_path = save_uploaded_file(cv_file, 'public', 'deploy', 'temp_onboarding', temp_id, 'cv') if cv_file else ''
    i_path = save_uploaded_file(id_proof_file, 'public', 'deploy', 'temp_onboarding', temp_id, 'id') if id_proof_file else ''
    
    emp_data = {
        "contact_number": contact_number,
        "emergency_contact": emergency_contact,
        "dob": dob,
        "current_address": current_address,
        "permanent_address": permanent_address,
        "location": location,
        "doj": doj,
        "education_details": education_details,
        "primary_skills": primary_skills,
        "secondary_skills": secondary_skills,
        "bank_name": bank_name,
        "bank_account_no": bank_account_no,
        "pan_no": pan_no
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

from backend.core.dependencies import get_current_user

@router.post("/admin-unification")
def onboard_admin(
    contact_number: str = Form(...),
    emergency_contact: str = Form(...),
    dob: str = Form(...),
    current_address: str = Form(...),
    permanent_address: str = Form(None),
    first_name: str = Form(None),
    middle_name: str = Form(None),
    last_name: str = Form(None),
    location: str = Form(None),
    education_details: str = Form(None),
    primary_skills: str = Form(None),
    secondary_skills: str = Form(None),
    bank_name: str = Form(...),
    bank_account_no: str = Form(...),
    pan_no: str = Form(...),
    pf_included: str = Form("No"),
    mediclaim_included: str = Form("No"),
    photo_file: UploadFile = File(None),
    cv_file: UploadFile = File(None),
    id_proof_file: UploadFile = File(None),
    current_user: dict = Depends(require_permission("deploy.onboarding.review_submissions")),
    service: OnboardingService = Depends(get_service)
):
    user_id = current_user['id']
    tenant_id = current_user['tenant_id']
    username = current_user['username']
    
    p_path = save_uploaded_file(photo_file, tenant_id, 'deploy', 'pfp', str(user_id), 'pfp') if photo_file else ''
    c_path = save_uploaded_file(cv_file, tenant_id, 'deploy', 'resume', str(user_id), 'cv') if cv_file else ''
    i_path = save_uploaded_file(id_proof_file, tenant_id, 'deploy', 'identification_docs', str(user_id), 'id') if id_proof_file else ''
    
    file_metadata = {
        "photo": p_path,
        "cv": c_path,
        "id_proof": i_path
    }
    
    emp_data = {
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "contact_number": contact_number,
        "emergency_contact": emergency_contact,
        "dob": dob,
        "current_address": current_address,
        "permanent_address": permanent_address or current_address,
        "location": location,
        "education_details": education_details,
        "primary_skills": primary_skills,
        "secondary_skills": secondary_skills,
        "bank_name": bank_name,
        "bank_account_no": bank_account_no,
        "pan_no": pan_no,
        "pf_included": pf_included,
        "mediclaim_included": mediclaim_included
    }
    
    try:
        return service.unify_admin_identity(user_id, username, emp_data, file_metadata, tenant_id=tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/approvals", dependencies=[Depends(require_module("deploy"))])
def get_pending_approvals(current_user: dict = Depends(require_permission("deploy.onboarding.view")), service: OnboardingService = Depends(get_service)):
    tenant_id = current_user.get("tenant_id", "public")
    return service.get_pending_approvals(tenant_id=tenant_id)

@router.put("/approval/{employee_code}", dependencies=[Depends(require_module("deploy"))])
def update_pending_approval(
    employee_code: str,
    data: dict = Body(...),
    current_user: dict = Depends(require_permission("deploy.onboarding.manage"))
):
    """Edit a pending-approval employee's details before final approval.

    Bank name/account number are intentionally excluded here regardless of
    what the client sends — HR cannot edit those fields from this panel.
    """
    from backend.modules.deploy.services.employee_service import EmployeeService
    tenant_id = current_user.get("tenant_id", "public")
    data.pop("bank_name", None)
    data.pop("bank_account_no", None)
    try:
        return EmployeeService(tenant_id=tenant_id).update_employee(employee_code, data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reject/{employee_code}", dependencies=[Depends(require_module("deploy"))])
def reject_pending_approval(
    employee_code: str,
    current_user: dict = Depends(require_permission("deploy.onboarding.manage")),
    service: OnboardingService = Depends(get_service)
):
    """Reject a pending-approval profile: deletes the submitted record and
    revokes its invite so HR can send a fresh onboarding link."""
    tenant_id = current_user.get("tenant_id", "public")
    try:
        return service.reject_pending_approval(employee_code, tenant_id=tenant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/approve/{employee_code}", dependencies=[Depends(require_module("deploy"))])
def approve_onboarding(
    employee_code: str,
    new_employee_code: str = Form(None),
    doj: str = Form(None),
    reporting_manager: str = Form(None),
    employment_type: str = Form("Full Time"),
    pf_included: str = Form("No"),
    mediclaim_included: str = Form("No"),
    location: str = Form(None),
    notes: str = Form(None),
    current_user: dict = Depends(require_permission("deploy.onboarding.review_submissions")),
    service: OnboardingService = Depends(get_service)
):
    approval_data = {
        "new_code": new_employee_code,
        "doj": doj,
        "manager": reporting_manager,
        "type": employment_type,
        "pf": pf_included,
        "mediclaim": mediclaim_included,
        "location": location,
        "notes": notes
    }
    try:
        tenant_id = current_user.get("tenant_id", "public")
        return service.approve_onboarding(employee_code, approval_data, tenant_id=tenant_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
