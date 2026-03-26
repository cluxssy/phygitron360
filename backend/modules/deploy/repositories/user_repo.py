from typing import Optional, Dict, Any, List
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor
from datetime import datetime

class UserRepository:
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT u.*, e.name as employee_name
                    FROM users u
                    LEFT JOIN employees e ON u.employee_code = e.employee_code
                    WHERE u.username = %s
                """, (username,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT u.*, e.name as employee_name
                    FROM users u
                    LEFT JOIN employees e ON u.employee_code = e.employee_code
                    WHERE u.id = %s
                """, (user_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def create_user(self, username: str, password_hash: str, role: str, employee_code: Optional[str] = None):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (username, password_hash, role, employee_code) VALUES (%s, %s, %s, %s)",
                    (username, password_hash, role, employee_code)
                )
                conn.commit()
        finally:
            conn.close()

    def update_password(self, username: str, new_hash: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET password_hash = %s WHERE username = %s", (new_hash, username))
                conn.commit()
        finally:
            conn.close()

    def update_last_login(self, username: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE username = %s", (username,))
                conn.commit()
        finally:
            conn.close()

    def get_all_users(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM users")
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    def delete_user(self, username: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE username = %s", (username,))
                conn.commit()
        finally:
            conn.close()
            
    def get_user_permissions(self, user_id: int, role: str) -> List[str]:
        conn = get_db_connection()
        try:
            # 1. Get role-based permissions
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT permission FROM role_permissions WHERE role = %s AND is_allowed = 1", (role,))
                rows_role = cur.fetchall()
                role_perms = {r['permission'] for r in rows_role}
                
                # 2. Get user overrides
                cur.execute("SELECT permission, is_allowed FROM user_permissions WHERE user_id = %s", (user_id,))
                rows_user = cur.fetchall()
                for r in rows_user:
                    if r['is_allowed']:
                        role_perms.add(r['permission'])
                    else:
                        role_perms.discard(r['permission'])
                        
                return list(role_perms)
        finally:
            conn.close()

    # Session Management
    def create_session(self, session_token: str, user_id: int, expires_at: datetime):
        conn = get_db_connection()
        try:
             with conn.cursor() as cur:
                 cur.execute("INSERT INTO sessions (session_token, user_id, expires_at) VALUES (%s, %s, %s)", 
                              (session_token, user_id, expires_at))
                 conn.commit()
        finally:
              conn.close()

    def get_session_with_user(self, session_token: str):
        conn = get_db_connection()
        try:
             with conn.cursor(cursor_factory=RealDictCursor) as cur:
                 cur.execute("""
                    SELECT s.*, u.username, u.role, u.employee_code, u.is_active, e.name as employee_name
                    FROM sessions s
                    JOIN users u ON s.user_id = u.id
                    LEFT JOIN employees e ON u.employee_code = e.employee_code
                    WHERE s.session_token = %s
                 """, (session_token,))
                 row = cur.fetchone()
                 return dict(row) if row else None
        finally:
              conn.close()

    def delete_session(self, session_token: str):
        conn = get_db_connection()
        try:
             with conn.cursor() as cur:
                 cur.execute("DELETE FROM sessions WHERE session_token = %s", (session_token,))
                 conn.commit()
        finally:
            conn.close()

