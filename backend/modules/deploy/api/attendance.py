from fastapi import APIRouter, HTTPException, Depends, Request, Form
from typing import List, Optional
from backend.core.database import get_db_connection
from backend.modules.deploy.api.auth import get_current_user, require_role
from backend.modules.deploy.services.attendance_service import AttendanceService
from backend.modules.deploy.schemas.attendance import (
    ClockOutRequest, LeaveRequest, AttendanceStatus, 
    LeaveBalance, LeaveRecord, AttendanceRecord
)

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

# Dependency Injection for Service
def get_service(user=Depends(get_current_user)):
    return AttendanceService(tenant_id=user.get('tenant_id', 'public'))

# Helper — raises a clear error if the user is not linked to an employee profile
def _require_employee_code(user: dict) -> str:
    code = user.get('employee_code')
    if not code:
        raise HTTPException(
            status_code=400,
            detail="Your account is not linked to an employee profile. Contact your administrator."
        )
    return code

# --- Attendance Endpoints ---

@router.get("/status")
def get_attendance_status(user=Depends(get_current_user), service: AttendanceService = Depends(get_service)):
    emp_code = _require_employee_code(user)
    return service.get_status(emp_code)

@router.post("/clock-in")
def clock_in(request: Request, user=Depends(get_current_user), service: AttendanceService = Depends(get_service)):
    emp_code = _require_employee_code(user)
    try:
        return service.clock_in(emp_code, request.client.host)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clock-out")
def clock_out(data: ClockOutRequest, user=Depends(get_current_user), service: AttendanceService = Depends(get_service)):
    emp_code = _require_employee_code(user)
    try:
        return service.clock_out(emp_code, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_attendance_history(user=Depends(get_current_user), service: AttendanceService = Depends(get_service)):
    emp_code = _require_employee_code(user)
    return service.get_history(emp_code)

# --- Leave Management Endpoints ---

@router.get("/leave/balance")
def get_leave_balance(user=Depends(get_current_user), service: AttendanceService = Depends(get_service)):
    emp_code = _require_employee_code(user)
    return service.get_leave_balance(emp_code)

@router.post("/leave/apply")
def apply_leave(req: LeaveRequest, user=Depends(get_current_user), service: AttendanceService = Depends(get_service)):
    emp_code = _require_employee_code(user)
    try:
        return service.apply_leave(emp_code, req, user['role'])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leave/my-requests")
def get_my_leaves(user=Depends(get_current_user), service: AttendanceService = Depends(get_service)):
    emp_code = _require_employee_code(user)
    return service.get_my_leaves(emp_code)

# --- Admin/HR Endpoints ---

@router.get("/leave/all-requests")
def get_all_leave_requests(user=Depends(require_role(["org_admin", "manager", "super_admin"])), service: AttendanceService = Depends(get_service)):
    return service.get_all_pending_leaves(user['role'], user.get('employee_code'))

@router.get("/admin/today")
def get_daily_attendance_log(date: Optional[str] = None, user=Depends(require_role(["org_admin", "manager", "super_admin"])), service: AttendanceService = Depends(get_service)):
    return service.get_daily_log(date)

@router.post("/leave/action/{leave_id}")
def approve_reject_leave(
    leave_id: int, 
    action: str = Form(...), 
    reason: str = Form(None), 
    user=Depends(require_role(["org_admin", "manager", "super_admin"])),
    service: AttendanceService = Depends(get_service)
):
    if action not in ['Approved', 'Rejected']:
         raise HTTPException(status_code=400, detail="Invalid action")

    try:
        return service.approve_reject_leave(leave_id, action, reason, user['role'], user.get('employee_code'))
    except ValueError as e:
        # Check against specific messages to determine 403 vs 404 vs 400
        msg = str(e)
        if "not found" in msg:
             raise HTTPException(status_code=404, detail=msg)
        elif "cannot approve" in msg or "only be approved" in msg:
             raise HTTPException(status_code=403, detail=msg)
        else:
             raise HTTPException(status_code=400, detail=msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/summary")
def get_monthly_attendance_summary(year: int, month: int, user=Depends(require_role(["org_admin", "manager", "super_admin"])), service: AttendanceService = Depends(get_service)):
    return service.get_monthly_summary(year, month)
