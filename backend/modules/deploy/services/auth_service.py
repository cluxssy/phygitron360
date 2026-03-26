import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from backend.modules.deploy.repositories.user_repo import UserRepository
from passlib.hash import pbkdf2_sha256

# Removed in-memory ACTIVE_SESSIONS, now using DB sessions table via UserRepository

class AuthService:
    def __init__(self):
        self.repo = UserRepository()

    def get_password_hash(self, password: str) -> str:
        return pbkdf2_sha256.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pbkdf2_sha256.verify(plain_password, hashed_password)

    def create_session_token(self) -> str:
        return secrets.token_urlsafe(32)

    def login(self, username: str, password: str) -> Optional[dict]:
        user = self.repo.get_user_by_username(username)
        if not user:
            return None
        
        if not user['is_active']:
            raise ValueError("Account is deactivated")
        
        if not self.verify_password(password, user['password_hash']):
            return None
        
        # Update Last Login
        self.repo.update_last_login(username)
        
        # Create Session
        token = self.create_session_token()
        expires = datetime.now() + timedelta(days=1)
        
        # Persistent Session in DB
        self.repo.create_session(token, user['id'], expires)
        
        user_info = {
            "id": user['id'],
            "username": user['username'],
            "name": user.get('employee_name') or user['username'],
            "role": user['role'],
            "employee_code": user['employee_code'],
            "permissions": self.repo.get_user_permissions(user['id'], user['role'])
        }
        
        return {"token": token, "user": user_info, "expires": expires}

    def logout(self, token: str):
        if token:
            self.repo.delete_session(token)

    def get_session_user(self, token: str) -> Optional[dict]:
        if not token:
            return None
            
        session = self.repo.get_session_with_user(token)
        if not session:
            return None
            
        # Check Expiration
        expires_at = session['expires_at']
        if isinstance(expires_at, str):
            # Try to handle string if returned (though PG should return datetime)
            try:
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except:
                pass
        
        if datetime.now() > expires_at:
            self.repo.delete_session(token)
            return None
            
        if not session.get('is_active', 1):
            return None
            
        return {
            "id": session['user_id'],
            "username": session['username'],
            "name": session.get('employee_name') or session['username'],
            "role": session['role'],
            "employee_code": session['employee_code'],
            "permissions": self.repo.get_user_permissions(session['user_id'], session['role'])
        }

    def create_user(self, username: str, password: str, role: str, employee_code: str = None) -> dict:
        existing = self.repo.get_user_by_username(username)
        if existing:
            raise ValueError(f"User {username} already exists")
            
        password_hash = self.get_password_hash(password)
        self.repo.create_user(username, password_hash, role, employee_code)
        
        return {"success": True, "message": f"User {username} created successfully"}

    def delete_user(self, username: str):
        existing = self.repo.get_user_by_username(username)
        if not existing:
             raise ValueError("User not found")
        self.repo.delete_user(username)
        return True

