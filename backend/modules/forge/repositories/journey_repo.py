"""
Forge Module — Journey Repository
PostgreSQL / psycopg2 multi-tenant repository for learning journeys.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from psycopg2.extras import RealDictCursor
from backend.core.database import get_db_connection


class JourneyRepository:
    def __init__(self, tenant_id: str = "public"):
        self.tenant_id = tenant_id

    def _set_path(self, cur):
        cur.execute(f'SET search_path TO "{self.tenant_id}", public')

    def create_journey(self, title: str, description: Optional[str], created_by: int, steps: List[Dict]) -> Dict:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    INSERT INTO journeys (title, description, created_by)
                    VALUES (%s, %s, %s)
                    RETURNING *
                """, (title, description, created_by))
                journey = dict(cur.fetchone())
                jid = journey["id"]

                for idx, s in enumerate(steps):
                    cur.execute("""
                        INSERT INTO journey_steps (journey_id, type, reference_id, title, order_index)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        jid,
                        s.get("type"),
                        s.get("reference_id"),
                        s.get("title"),
                        s.get("order_index", idx)
                    ))

                conn.commit()
                return journey
        finally:
            conn.close()

    def list_journeys(self) -> List[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT j.*,
                           COUNT(DISTINCT s.id) AS steps_count,
                           COUNT(DISTINCT a.id) AS assigned_count
                    FROM journeys j
                    LEFT JOIN journey_steps s ON s.journey_id = j.id
                    LEFT JOIN journey_assignments a ON a.journey_id = j.id
                    GROUP BY j.id
                    ORDER BY j.created_at DESC
                """)
                rows = [dict(r) for r in cur.fetchall()]
                for r in rows:
                    if r.get("created_at"):
                        r["created_at"] = r["created_at"].isoformat()
                return rows
        finally:
            conn.close()

    def get_journey(self, journey_id: int) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("SELECT * FROM journeys WHERE id = %s", (journey_id,))
                journey = cur.fetchone()
                if not journey:
                    return None
                journey = dict(journey)

                # Fetch steps with resolved titles
                cur.execute("""
                    SELECT * FROM journey_steps
                    WHERE journey_id = %s
                    ORDER BY order_index ASC, id ASC
                """, (journey_id,))
                raw_steps = [dict(r) for r in cur.fetchall()]
                steps_out = []
                for s in raw_steps:
                    title = s.get("title")
                    if not title or title.strip() == "":
                        if s["type"] == "verify":
                            cur.execute("SELECT title FROM assessments WHERE id = %s", (s["reference_id"],))
                            res = cur.fetchone()
                            title = res["title"] if res else "Assessment"
                        elif s["type"] == "forge":
                            cur.execute("SELECT title FROM forge_courses WHERE id = %s", (s["reference_id"],))
                            res = cur.fetchone()
                            title = res["title"] if res else "Course"
                    s["title"] = title
                    steps_out.append(s)

                journey["steps"] = steps_out
                # Fetch assigned users and employee IDs
                cur.execute("""
                    SELECT ja.user_id, u.employee_code, e.id AS employee_id
                    FROM journey_assignments ja
                    JOIN users u ON u.id = ja.user_id
                    LEFT JOIN employees e ON e.employee_code = u.employee_code
                    WHERE ja.journey_id = %s
                """, (journey_id,))
                assignees = [dict(r) for r in cur.fetchall()]
                journey["assigned_user_ids"] = [a["user_id"] for a in assignees]
                journey["assigned_employee_ids"] = [a["employee_id"] for a in assignees if a.get("employee_id")]
                return journey
        finally:
            conn.close()

    def update_journey(self, journey_id: int, title: Optional[str] = None,
                       description: Optional[str] = None, steps: Optional[List[Dict]] = None) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                updates = []
                params = []
                if title is not None:
                    updates.append("title = %s")
                    params.append(title)
                if description is not None:
                    updates.append("description = %s")
                    params.append(description)

                if updates:
                    updates.append("updated_at = NOW()")
                    params.append(journey_id)
                    cur.execute(f"UPDATE journeys SET {', '.join(updates)} WHERE id = %s", params)

                if steps is not None:
                    cur.execute("DELETE FROM journey_steps WHERE journey_id = %s", (journey_id,))
                    for idx, s in enumerate(steps):
                        cur.execute("""
                            INSERT INTO journey_steps (journey_id, type, reference_id, title, order_index)
                            VALUES (%s, %s, %s, %s, %s)
                        """, (
                            journey_id,
                            s.get("type"),
                            s.get("reference_id"),
                            s.get("title"),
                            s.get("order_index", idx)
                        ))

                conn.commit()
                return self.get_journey(journey_id)
        finally:
            conn.close()

    def delete_journey(self, journey_id: int) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur)
                cur.execute("DELETE FROM journeys WHERE id = %s", (journey_id,))
                conn.commit()
                return True
        finally:
            conn.close()

    def assign_journey(self, journey_id: int, user_ids: List[int] = None, employee_ids: List[int] = None, assigned_by_id: int = None, deadline=None) -> int:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("SELECT id FROM journeys WHERE id = %s", (journey_id,))
                if not cur.fetchone():
                    return 0

                resolved_user_ids = set(user_ids or [])
                if employee_ids:
                    for emp_id in employee_ids:
                        cur.execute("""
                            SELECT u.id AS user_id, e.employee_code, e.name, e.email_id
                            FROM employees e
                            LEFT JOIN users u ON u.employee_code = e.employee_code
                            WHERE e.id = %s
                            LIMIT 1
                        """, (emp_id,))
                        row = cur.fetchone()
                        if row:
                            if row.get("user_id"):
                                resolved_user_ids.add(row["user_id"])
                            else:
                                email = row["email_id"] or f"emp_{row['employee_code'].lower()}@internal.local"
                                cur.execute("SELECT id FROM users WHERE username = %s OR employee_code = %s LIMIT 1", (email, row["employee_code"]))
                                existing_u = cur.fetchone()
                                if existing_u:
                                    resolved_user_ids.add(existing_u["id"])
                                    cur.execute("UPDATE users SET employee_code = %s WHERE id = %s AND employee_code IS NULL", (row["employee_code"], existing_u["id"]))
                                else:
                                    import secrets
                                    from backend.core.security import hash_password
                                    dummy_hash = hash_password(secrets.token_hex(16))
                                    cur.execute("""
                                        INSERT INTO users (username, password_hash, role, employee_code, is_active)
                                        VALUES (%s, %s, 'employee', %s, 1)
                                        RETURNING id
                                    """, (email, dummy_hash, row["employee_code"]))
                                    new_u = cur.fetchone()
                                    if new_u:
                                        resolved_user_ids.add(new_u["id"])

                # Fetch steps to auto-assign assessments and courses
                cur.execute("SELECT * FROM journey_steps WHERE journey_id = %s", (journey_id,))
                steps = [dict(r) for r in cur.fetchall()]

                assigned_count = 0
                for uid in resolved_user_ids:
                    cur.execute("""
                        SELECT id FROM journey_assignments
                        WHERE journey_id = %s AND user_id = %s
                    """, (journey_id, uid))
                    if cur.fetchone():
                        continue

                    cur.execute("""
                        INSERT INTO journey_assignments (journey_id, user_id, assigned_by, deadline, status)
                        VALUES (%s, %s, %s, %s, 'pending')
                    """, (journey_id, uid, assigned_by_id, deadline))

                    # Auto-assign steps
                    for s in steps:
                        if s["type"] == "verify":
                            cur.execute("""
                                INSERT INTO assessment_assignments (assessment_id, user_id, assigned_by, deadline, status)
                                SELECT %s, %s, %s, %s, 'pending'
                                WHERE NOT EXISTS (
                                    SELECT 1 FROM assessment_assignments
                                    WHERE assessment_id = %s AND user_id = %s
                                )
                            """, (s["reference_id"], uid, assigned_by_id, deadline, s["reference_id"], uid))
                        elif s["type"] == "forge":
                            cur.execute("""
                                INSERT INTO forge_enrollments (course_id, user_id, assigned_by_id, deadline, status, triggered_by)
                                SELECT %s, %s, %s, %s, 'not_started', 'journey'
                                WHERE NOT EXISTS (
                                    SELECT 1 FROM forge_enrollments
                                    WHERE course_id = %s AND user_id = %s
                                )
                            """, (s["reference_id"], uid, assigned_by_id, deadline, s["reference_id"], uid))

                    assigned_count += 1

                conn.commit()
                return assigned_count
        finally:
            conn.close()

    def get_my_journeys(self, user_id: int) -> List[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT a.id AS assignment_id, a.journey_id, a.status, a.deadline, a.completed_at,
                           j.title, j.description
                    FROM journey_assignments a
                    JOIN journeys j ON j.id = a.journey_id
                    WHERE a.user_id = %s
                    ORDER BY a.created_at DESC
                """, (user_id,))
                assignments = [dict(r) for r in cur.fetchall()]

                out = []
                for a in assignments:
                    jid = a["journey_id"]
                    cur.execute("""
                        SELECT * FROM journey_steps
                        WHERE journey_id = %s
                        ORDER BY order_index ASC, id ASC
                    """, (jid,))
                    steps = [dict(r) for r in cur.fetchall()]

                    completed_steps = 0
                    total_steps = len(steps)
                    steps_detail = []

                    for s in steps:
                        step_title = s.get("title")
                        is_completed = False
                        if s["type"] == "verify":
                            if not step_title:
                                cur.execute("SELECT title FROM assessments WHERE id = %s", (s["reference_id"],))
                                row = cur.fetchone()
                                step_title = row["title"] if row else "Assessment"
                            cur.execute("""
                                SELECT 1 FROM assessment_results
                                WHERE assessment_id = %s AND user_id = %s AND (pass_status = TRUE OR score >= 50.0)
                                LIMIT 1
                            """, (s["reference_id"], user_id))
                            if cur.fetchone():
                                is_completed = True
                        elif s["type"] == "forge":
                            if not step_title:
                                cur.execute("SELECT title FROM forge_courses WHERE id = %s", (s["reference_id"],))
                                row = cur.fetchone()
                                step_title = row["title"] if row else "Course"
                            cur.execute("""
                                SELECT 1 FROM forge_enrollments
                                WHERE course_id = %s AND user_id = %s AND status = 'completed'
                                LIMIT 1
                            """, (s["reference_id"], user_id))
                            if cur.fetchone():
                                is_completed = True

                        if is_completed:
                            completed_steps += 1

                        steps_detail.append({
                            "id": s["id"],
                            "type": s["type"],
                            "reference_id": s["reference_id"],
                            "title": step_title,
                            "order_index": s["order_index"],
                            "completed": is_completed
                        })

                    progress = (completed_steps / total_steps * 100) if total_steps > 0 else 0
                    if completed_steps == total_steps and total_steps > 0 and a["status"] != "completed":
                        cur.execute("""
                            UPDATE journey_assignments
                            SET status = 'completed', completed_at = NOW()
                            WHERE id = %s
                        """, (a["assignment_id"],))
                        a["status"] = "completed"

                    out.append({
                        "assignment_id": a["assignment_id"],
                        "journey_id": jid,
                        "title": a["title"],
                        "description": a["description"],
                        "status": a["status"],
                        "progress_percent": round(progress, 1),
                        "completed_steps": completed_steps,
                        "total_steps": total_steps,
                        "deadline": a["deadline"].isoformat() if a.get("deadline") else None,
                        "steps": steps_detail
                    })

                conn.commit()
                return out
        finally:
            conn.close()
