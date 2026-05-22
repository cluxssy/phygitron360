import json
from typing import Optional, List, Dict, Any
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class OfferRepository:
    def __init__(self, tenant_id: str = 'public'):
        self.tenant_id = tenant_id

    def _set_search_path(self, cur):
        cur.execute(f'SET search_path TO "{self.tenant_id}"')

    def get_all_offers(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                query = """
                    SELECT o.*,
                           c.full_name AS candidate_name, c.email AS candidate_email,
                           u.name AS created_by_name,
                           a.name AS approved_by_name
                    FROM offer_letters o
                    JOIN candidates c ON c.id = o.candidate_id
                    LEFT JOIN users u ON u.id = o.created_by
                    LEFT JOIN users a ON a.id = o.approved_by
                """
                params = []
                if status:
                    query += " WHERE o.status = %s"
                    params.append(status)
                query += " ORDER BY o.created_at DESC"
                cur.execute(query, params)
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_offer_by_id(self, offer_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute(
                    """
                    SELECT o.*,
                           c.full_name AS candidate_name, c.email AS candidate_email,
                           u.name AS created_by_name
                    FROM offer_letters o
                    JOIN candidates c ON c.id = o.candidate_id
                    LEFT JOIN users u ON u.id = o.created_by
                    WHERE o.id = %s
                    """,
                    (offer_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def update_offer(self, offer_id: int, updates: Dict[str, Any]) -> bool:
        if not updates:
            return True
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                set_clause = ", ".join(f"{k} = %s" for k in updates)
                params = list(updates.values()) + [offer_id]
                cur.execute(
                    f"UPDATE offer_letters SET {set_clause} WHERE id = %s",
                    params,
                )
                conn.commit()
                return cur.rowcount > 0
        finally:
            conn.close()

    def update_offer_status(self, offer_id: int, status: str, user_id: Optional[int] = None, feedback: Optional[str] = None) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                if status == 'approved':
                    cur.execute(
                        """UPDATE offer_letters
                           SET status = 'approved', approved_by = %s, feedback = NULL, updated_at = CURRENT_TIMESTAMP
                           WHERE id = %s""",
                        (user_id, offer_id),
                    )
                else:
                    cur.execute(
                        """UPDATE offer_letters
                           SET status = %s, feedback = %s, updated_at = CURRENT_TIMESTAMP
                           WHERE id = %s""",
                        (status, feedback, offer_id),
                    )
                conn.commit()
                return cur.rowcount > 0
        finally:
            conn.close()
            
    def convert_candidate_to_employee(self, offer: Dict[str, Any]) -> int:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                
                # Create employee record
                start_dt = None
                if offer.get("start_date"):
                    from datetime import datetime
                    try:
                        start_dt = datetime.fromisoformat(str(offer["start_date"]))
                    except Exception:
                        pass

                cur.execute(
                    """
                    INSERT INTO employees
                        (name, email, department, designation, doj, tenant_id, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'active')
                    RETURNING id
                    """,
                    (
                        offer["candidate_name"],
                        offer["candidate_email"],
                        offer.get("department"),
                        offer["role_title"],
                        start_dt,
                        self.tenant_id,
                    ),
                )
                emp_id = cur.fetchone()["id"]
                emp_code = f"EMP{emp_id:04d}"

                cur.execute(
                    "UPDATE employees SET employee_code = %s WHERE id = %s",
                    (emp_code, emp_id),
                )

                cur.execute(
                    "UPDATE candidates SET status = 'Archived', updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (offer["candidate_id"],),
                )

                cur.execute(
                    "UPDATE offer_letters SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (offer["id"],),
                )
                conn.commit()
                return emp_id
        finally:
            conn.close()
