import json
from typing import Optional, List, Dict, Any
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class JobRoleRepository:
    def __init__(self, tenant_id: str = 'public'):
        self.tenant_id = tenant_id

    def _set_search_path(self, cur):
        cur.execute(f'SET search_path TO "{self.tenant_id}"')

    def create_job_role(self, data: Dict[str, Any]) -> int:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute('''
                    INSERT INTO job_roles (title, description, required_skills, min_experience)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                ''', (
                    data.get("title"),
                    data.get("description"),
                    json.dumps(data.get("required_skills", [])),
                    data.get("min_experience", 0)
                ))
                role_id = cur.fetchone()[0]
                conn.commit()
                return role_id
        finally:
            conn.close()

    def get_all_job_roles(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute("SELECT * FROM job_roles ORDER BY created_at DESC")
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_job_role_by_id(self, role_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute("SELECT * FROM job_roles WHERE id = %s", (role_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()
            
    def create_candidate_invite(self, data: Dict[str, Any]) -> int:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute('''
                    INSERT INTO candidate_invites 
                    (candidate_id, job_role_id, hr_user_id, temp_password_hash, email_sent_at, status)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    data.get("candidate_id"),
                    data.get("job_role_id"),
                    data.get("hr_user_id"),
                    data.get("temp_password_hash"),
                    data.get("email_sent_at"),
                    data.get("status", "sent")
                ))
                invite_id = cur.fetchone()[0]
                conn.commit()
                return invite_id
        finally:
            conn.close()

    def get_invites_by_role(self, job_role_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute('''
                    SELECT i.*, c.full_name as candidate_name, c.email as candidate_email
                    FROM candidate_invites i
                    JOIN candidates c ON i.candidate_id = c.id
                    WHERE i.job_role_id = %s
                ''', (job_role_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def update_invite_status(self, invite_id: int, status: str, timestamp_field: str = None):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                sql = f"UPDATE candidate_invites SET status = %s"
                params = [status]
                if timestamp_field:
                    sql += f", {timestamp_field} = CURRENT_TIMESTAMP"
                sql += " WHERE id = %s"
                params.append(invite_id)
                cur.execute(sql, params)
                conn.commit()
        finally:
            conn.close()
