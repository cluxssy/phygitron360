from fastapi import APIRouter, HTTPException, Response, Request, Depends
from backend.modules.deploy.services.auth_service import AuthService
from backend.modules.deploy.schemas.auth import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_service():
    return AuthService()

# --- Dependencies ---
# Refactoring: define dependencies here so they can be imported by other routers
# BUT, other routers currently import 'backend.routers.auth.get_current_user' and 'backend.routers.auth.require_role'
# So we must expose them here with the exact same names to avoid breaking changes in other files during this phase.

def get_current_user(request: Request, service: AuthService = Depends(get_service)):
    session_token = request.cookies.get("session_token")
    user = service.get_session_user(session_token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated or session expired")
    
    return user

def require_role(allowed_roles: list[str]):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# --- Endpoints ---

@router.post("/login")
def login(credentials: LoginRequest, response: Response, service: AuthService = Depends(get_service)):
    try:
        result = service.login(credentials.username, credentials.password)
        if not result:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Set cookie
        response.set_cookie(
            key="session_token",
            value=result['token'],
            httponly=True,
            max_age=86400,  # 24 hours
            samesite="lax",
            path="/"
        )
        
        return {
            "success": True,
            "message": "Login successful",
            "user": result['user']
        }
    except ValueError as e: # Account deactivated
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
def logout(request: Request, response: Response, service: AuthService = Depends(get_service)):
    token = request.cookies.get("session_token")
    if token:
        service.logout(token)
    
    response.delete_cookie("session_token", path="/", samesite="lax")
    return {"success": True, "message": "Logged out successfully"}

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": current_user
    }

@router.get("/check")
def check_auth(request: Request, service: AuthService = Depends(get_service)):
    token = request.cookies.get("session_token")
    user = service.get_session_user(token)
    
    if not user:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "user": user
    }
