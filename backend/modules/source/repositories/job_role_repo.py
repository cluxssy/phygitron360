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

    def update_job_role(self, role_id: int, updates: Dict[str, Any]) -> bool:
        if not updates:
            return True
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                set_clause = ", ".join(f"{k} = %s" for k in updates)
                params = list(updates.values()) + [role_id]
                cur.execute(
                    f"UPDATE job_roles SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    params,
                )
                conn.commit()
                return cur.rowcount > 0
        finally:
            conn.close()

    def delete_job_role(self, role_id: int) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute("DELETE FROM candidate_invites WHERE job_role_id = %s", (role_id,))
                cur.execute("DELETE FROM ai_scores WHERE job_role_id = %s", (role_id,))
                cur.execute("DELETE FROM job_roles WHERE id = %s", (role_id,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
        finally:
            conn.close()

    def delete_all_job_roles(self):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute("DELETE FROM candidate_invites")
                cur.execute("DELETE FROM ai_scores WHERE job_role_id IS NOT NULL")
                cur.execute("DELETE FROM job_roles")
                conn.commit()
        finally:
            conn.close()

    def get_candidate_rankings(self, role_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute(
                    """SELECT a.*, c.full_name, c.email, c.current_designation, c.total_experience_years
                       FROM ai_scores a
                       JOIN candidates c ON a.entity_id = c.id
                       WHERE a.entity_type = 'candidate'
                         AND a.job_role_id = %s
                         AND a.score_type = 'role_fit'
                       ORDER BY a.score DESC""",
                    (role_id,),
                )
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_all_candidates_for_scoring(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute("SELECT id, total_experience_years FROM candidates WHERE status NOT IN ('Archived', 'Rejected')")
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_candidate_for_scoring(self, candidate_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute("SELECT id, total_experience_years FROM candidates WHERE id = %s", (candidate_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def upsert_user_password_by_candidate(self, candidate_id: int, password_hash: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute(
                    """UPDATE users SET password_hash = %s, password_must_change = 1
                       WHERE id = (SELECT user_id FROM candidates WHERE id = %s)""",
                    (password_hash, candidate_id),
                )
                conn.commit()
        finally:
            conn.close()

    def create_invite_if_not_exists(self, candidate_id: int, job_role_id: int, hr_id: int):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute(
                    """INSERT INTO candidate_invites
                       (candidate_id, job_role_id, hr_user_id, email_sent_at, status)
                       VALUES (%s, %s, %s, CURRENT_TIMESTAMP, 'sent')
                       ON CONFLICT DO NOTHING""",
                    (candidate_id, job_role_id, hr_id),
                )
                conn.commit()
        finally:
            conn.close()

    def get_invite_status(self, job_role_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute(
                    """SELECT ci.id, ci.status, ci.email_sent_at, ci.opened_at, ci.logged_in_at,
                              c.full_name as candidate_name, c.email as candidate_email,
                              u.last_login
                       FROM candidate_invites ci
                       JOIN candidates c ON ci.candidate_id = c.id
                       LEFT JOIN users u ON c.user_id = u.id
                       WHERE ci.job_role_id = %s
                       ORDER BY ci.email_sent_at DESC""",
                    (job_role_id,),
                )
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
