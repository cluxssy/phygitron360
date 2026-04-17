from fastapi import APIRouter, HTTPException, Depends, Body
from backend.modules.deploy.services.password_service import PasswordService
from backend.modules.deploy.api.auth import require_role, get_current_user
from pydantic import BaseModel, EmailStr


router = APIRouter(prefix="/api/auth", tags=["password-reset"])


# Pydantic models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyTokenRequest(BaseModel):
    token: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class AdminResetRequest(BaseModel):
    employee_code: str
    reset_type: str  # 'temp_password' or 'reset_link'


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def get_service():
    return PasswordService()


@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    service: PasswordService = Depends(get_service)
):
    """
    User requests password reset (forgot password).
    Always returns success to prevent email enumeration.
    """
    try:
        result = service.request_password_reset(request.email)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-reset-token")
def verify_reset_token(
    request: VerifyTokenRequest,
    service: PasswordService = Depends(get_service)
):
    """Verify if password reset token is valid"""
    try:
        result = service.verify_reset_token(request.token)
        if not result['valid']:
            raise HTTPException(status_code=400, detail=result['message'])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    service: PasswordService = Depends(get_service)
):
    """Reset password using token"""
    try:
        result = service.reset_password(request.token, request.new_password)
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['message'])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin-reset-password", dependencies=[Depends(require_role(["org_admin", "manager"]))])
def admin_reset_password(
    request: AdminResetRequest,
    current_user: dict = Depends(get_current_user),
    service: PasswordService = Depends(get_service)
):
    """
    Admin/HR resets employee password.
    Returns temp password or sends reset link based on reset_type.
    """
    try:
        admin_email = current_user.get('username', 'Admin')
        result = service.admin_reset_password(
            employee_code=request.employee_code,
            reset_type=request.reset_type,
            admin_email=admin_email
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['message'])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    service: PasswordService = Depends(get_service)
):
    """Change password for logged-in user"""
    try:
        email = current_user.get('username')
        if not email:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        result = service.change_password_logged_in(
            email=email,
            current_password=request.current_password,
            new_password=request.new_password
        )
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['message'])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/check-must-change-password")
def check_must_change_password(
    current_user: dict = Depends(get_current_user),
    service: PasswordService = Depends(get_service)
):
    """Check if user must change password"""
    try:
        email = current_user.get('username')
        must_change = service.check_must_change_password(email)
        return {"must_change": must_change}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
