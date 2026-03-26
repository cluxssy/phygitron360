from typing import List, Dict, Any, Optional
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class AdminRepository:
    def get_all_users(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT id, username, role, employee_code FROM users ORDER BY id")
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def log_action(self, username: str, action: str, details: str, ip: str = None):
        conn = get_db_connection()
        try:
             cur = conn.cursor()
             cur.execute("INSERT INTO audit_logs (username, action, details, ip_address) VALUES (%s, %s, %s, %s)", 
                          (username, action, details, ip))
             conn.commit()
        finally:
            conn.close()

    def get_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT %s", (limit,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_role_permissions(self) -> Dict[str, List[str]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT role, permission FROM role_permissions WHERE is_allowed = 1")
            rows = cur.fetchall()
            perms = {}
            for r in rows:
                if r['role'] not in perms:
                    perms[r['role']] = []
                perms[r['role']].append(r['permission'])
            return perms
        finally:
            conn.close()

    def update_role_permissions(self, role: str, permissions: List[str]):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            # First set all to 0
            cur.execute("UPDATE role_permissions SET is_allowed = 0 WHERE role = %s", (role,))
            # Then insert/update to 1
            for p in permissions:
                cur.execute('''
                    INSERT INTO role_permissions (role, permission, is_allowed) 
                    VALUES (%s, %s, 1)
                    ON CONFLICT(role, permission) DO UPDATE SET is_allowed = 1
                ''', (role, p))
            conn.commit()
        finally:
            conn.close()

    def get_user_overrides(self, user_id: int) -> Dict[str, bool]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT permission, is_allowed FROM user_permissions WHERE user_id = %s", (user_id,))
            rows = cur.fetchall()
            return {r['permission']: bool(r['is_allowed']) for r in rows}
        finally:
            conn.close()

    def update_user_overrides(self, user_id: int, permissions: Dict[str, Optional[bool]]):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            for p, allowed in permissions.items():
                if allowed is None:
                    cur.execute("DELETE FROM user_permissions WHERE user_id = %s AND permission = %s", (user_id, p))
                else:
                    is_allowed = 1 if allowed else 0
                    cur.execute('''
                        INSERT INTO user_permissions (user_id, permission, is_allowed) 
                        VALUES (%s, %s, %s)
                        ON CONFLICT(user_id, permission) DO UPDATE SET is_allowed = %s
                    ''', (user_id, p, is_allowed, is_allowed))
            conn.commit()
        finally:
            conn.close()

    def update_employee_code(self, user_id: int, employee_code: Optional[str]):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE users SET employee_code = %s WHERE id = %s", (employee_code, user_id))
            conn.commit()
        finally:
            conn.close()

    def update_role(self, user_id: int, role: str):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("UPDATE users SET role = %s WHERE id = %s", (role, user_id))
            conn.commit()
        finally:
            conn.close()

