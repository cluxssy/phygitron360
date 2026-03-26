from typing import List, Dict, Any, Optional
from backend.modules.deploy.repositories.notification_repo import NotificationRepository

class NotificationService:
    def __init__(self):
        self.repo = NotificationRepository()

    def notify_user(self, employee_code: str, title: str, message: str, n_type: str = 'Info'):
        self.repo.create_notification(employee_code, title, message, n_type)

    def notify_admins(self, title: str, message: str, n_type: str = 'AdminAlert'):
        # Passing None as employee_code makes it a global/admin notification
        self.repo.create_notification(None, title, message, n_type)

    def get_user_notifications(self, employee_code: str, limit: int = 10, unread_only: bool = False):
        return self.repo.get_notifications_for_user(employee_code, limit, unread_only)

    def get_admin_notifications(self, limit: int = 15, unread_only: bool = False):
        return self.repo.get_admin_notifications(limit, unread_only)

    def mark_read(self, notif_id: int):
        self.repo.mark_as_read(notif_id)

    def mark_all_read(self, employee_code: str, is_admin: bool = False):
        self.repo.mark_all_as_read(employee_code, is_admin)

    def get_unread_count(self, employee_code: Optional[str], is_admin: bool = False):
        return self.repo.get_unread_count(employee_code, is_admin)

    def mark_relevant_as_read(self, title: str, message_part: str):
        self.repo.mark_notifications_by_query(title, message_part)

# Global helper for easy import
def add_notification(title: str, message: str, employee_code: Optional[str] = None, n_type: str = 'Info'):
    service = NotificationService()
    if employee_code:
        service.notify_user(employee_code, title, message, n_type)
    else:
        service.notify_admins(title, message, n_type)
