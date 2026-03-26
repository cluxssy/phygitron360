from fastapi import APIRouter, Depends, HTTPException
from backend.modules.deploy.api.auth import get_current_user, require_role
from backend.modules.deploy.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

def get_service():
    return NotificationService()

@router.get("")
def get_my_notifications(user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    # If admin, show admin notifications + their personal ones
    if user['role'] in ['Admin', 'HR']:
        return service.get_admin_notifications()
    return service.get_user_notifications(user['employee_code'])

@router.get("/unread-count")
def get_unread_count(user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    is_admin = user['role'] in ['Admin', 'HR']
    emp_code = user.get('employee_code')
    return {"count": service.get_unread_count(emp_code, is_admin)}

@router.get("/unread-details")
def get_unread_details(user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    is_admin = user['role'] in ['Admin', 'HR']
    emp_code = user.get('employee_code')
    
    # We want ALL relevant unread notifications
    if is_admin:
        unread = service.get_admin_notifications(limit=100, unread_only=True)
    else:
        unread = service.get_user_notifications(emp_code, limit=100, unread_only=True)
        
    return {"count": len(unread), "items": unread}

@router.post("/{notif_id}/read")
def mark_read(notif_id: int, user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    service.mark_read(notif_id)
    return {"success": True}

@router.post("/read-all")
def mark_all_read(user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    is_admin = user['role'] in ['Admin', 'HR']
    service.mark_all_read(user['employee_code'], is_admin)
    return {"success": True}
