from fastapi import APIRouter, Depends, HTTPException
from backend.core.dependencies import get_current_user, require_permission
from backend.modules.deploy.services.notification_service import NotificationService

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

def get_service():
    return NotificationService()

@router.get("")
def get_my_notifications(user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    # Check if user has permission to see global admin notifications
    user_perms = user.get('permissions', {})
    is_admin_viewer = user_perms.get('deploy.notifications.view_admin', False)
    
    if is_admin_viewer:
        return service.get_admin_notifications()
    return service.get_user_notifications(user['employee_code'])

@router.get("/unread-count")
def get_unread_count(user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    user_perms = user.get('permissions', {})
    is_admin_viewer = user_perms.get('deploy.notifications.view_admin', False)
    emp_code = user.get('employee_code')
    return {"count": service.get_unread_count(emp_code, is_admin_viewer)}

@router.get("/unread-details")
def get_unread_details(user=Depends(get_current_user), service: NotificationService = Depends(get_service)):
    user_perms = user.get('permissions', {})
    is_admin_viewer = user_perms.get('deploy.notifications.view_admin', False)
    emp_code = user.get('employee_code')
    
    # We want ALL relevant unread notifications
    if is_admin_viewer:
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
    user_perms = user.get('permissions', {})
    is_admin_viewer = user_perms.get('deploy.notifications.view_admin', False)
    service.mark_all_read(user['employee_code'], is_admin_viewer)
    return {"success": True}
