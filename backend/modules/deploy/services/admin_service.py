from typing import List, Dict, Any, Optional
from backend.modules.deploy.repositories.admin_repo import AdminRepository
from backend.modules.deploy.services.auth_service import AuthService # Reuse for create/delete user logic

class AdminService:
    def __init__(self):
        self.repo = AdminRepository()
        self.auth_service = AuthService()

    def list_users(self):
        return self.repo.get_all_users()

    def create_user(self, username: str, password: str, role: str, actor: str, employee_code: str = None):
        if role not in ['Admin', 'HR', 'Management']:
             raise ValueError("Invalid role")
             
        # Use auth service to create user (handles password hashing)
        # Note: AuthService.create_user handles 'username exists' check
        try:
             self.auth_service.create_user(username, password, role, employee_code)
             self.repo.log_action(actor, "CREATE_USER", f"Created user {username} with role {role}")
             return {"message": "User created successfully"}
        except ValueError as e:
             raise ValueError(str(e))

    def delete_user(self, user_id: int, actor: str):
        user = self.repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        username = user['username']
        if username == actor:
            raise ValueError("Cannot delete your own account")
            
        self.auth_service.delete_user(username)
        self.repo.log_action(actor, "DELETE_USER", f"Deleted user {username}")
        
        return {"message": f"User {username} deleted"}

    def get_logs(self):
        return self.repo.get_logs()

    def get_role_permissions(self):
        return self.repo.get_role_permissions()

    def update_role_permissions(self, role: str, permissions: List[str], actor: str):
        self.repo.update_role_permissions(role, permissions)
        self.repo.log_action(actor, "UPDATE_ROLE_PERMISSIONS", f"Updated permissions for role {role}")
        return {"success": True}

    def get_user_overrides(self, user_id: int):
        return self.repo.get_user_overrides(user_id)

    def update_user_overrides(self, user_id: int, overrides: Dict[str, Optional[bool]], actor: str):
        self.repo.update_user_overrides(user_id, overrides)
        self.repo.log_action(actor, "UPDATE_USER_PERMISSIONS", f"Updated permissions overrides for user ID {user_id}")
        return {"success": True}

    def update_employee_code(self, user_id: int, employee_code: Optional[str], actor: str):
        user = self.repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        self.repo.update_employee_code(user_id, employee_code or None)
        self.repo.log_action(actor, "UPDATE_EMPLOYEE_CODE", f"Linked user ID {user_id} to employee code: {employee_code or 'None'}")
        return {"success": True}

    def update_role(self, user_id: int, role: str, actor: str):
        valid_roles = ['Admin', 'HR', 'Management', 'Employee']
        if role not in valid_roles:
            raise ValueError(f"Invalid role. Must be one of {valid_roles}")
            
        user = self.repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
            
        self.repo.update_role(user_id, role)
        self.repo.log_action(actor, "UPDATE_USER_ROLE", f"Changed role for user ID {user_id} ({user['username']}) to {role}")
        return {"success": True, "message": f"Role updated to {role}"}
