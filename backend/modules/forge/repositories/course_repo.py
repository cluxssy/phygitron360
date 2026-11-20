"""
Forge Module — Course Repository
PostgreSQL / psycopg2 data access with per-tenant isolation.
"""
import json
import uuid
import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from psycopg2.extras import RealDictCursor
from backend.core.database import get_db_connection


class CourseRepository:
    def __init__(self, tenant_id: str = "public"):
        self.tenant_id = tenant_id

    def _set_path(self, cur):
        cur.execute(f'SET search_path TO "{self.tenant_id}", public')

    def _ensure_requests_table(self, cur):
        cur.execute("""
            CREATE TABLE IF NOT EXISTS forge_course_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                course_id INTEGER NOT NULL REFERENCES forge_courses(id) ON DELETE CASCADE,
                status TEXT DEFAULT 'pending',
                reason TEXT,
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                reviewed_at TIMESTAMP,
                review_notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_fcr_user_course ON forge_course_requests(user_id, course_id);
            CREATE INDEX IF NOT EXISTS idx_fcr_status ON forge_course_requests(status);
        """)

    # ── Domains ──────────────────────────────────────────────────────────────

    def list_domains(self) -> List[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT d.*, COUNT(c.id) AS course_count
                    FROM course_domains d
                    LEFT JOIN forge_courses c ON c.domain_id = d.id AND c.status != 'deleted'
                    GROUP BY d.id
                    ORDER BY d.name ASC
                """)
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def create_domain(self, data: Dict) -> Dict:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    INSERT INTO course_domains (name, description, color, icon)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *
                """, (
                    data.get("name"),
                    data.get("description"),
                    data.get("color", "#7C3AED"),
                    data.get("icon", "Layers")
                ))
                row = dict(cur.fetchone())
                conn.commit()
                return row
        finally:
            conn.close()

    def update_domain(self, domain_id: int, data: Dict) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                fields = {k: v for k, v in data.items() if k in ("name", "description", "color", "icon")}
                if not fields:
                    return None
                set_clause = ", ".join(f"{k} = %s" for k in fields)
                cur.execute(f"""
                    UPDATE course_domains SET {set_clause}, updated_at = NOW()
                    WHERE id = %s RETURNING *
                """, list(fields.values()) + [domain_id])
                row = cur.fetchone()
                conn.commit()
                return dict(row) if row else None
        finally:
            conn.close()

    def delete_domain(self, domain_id: int) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur)
                cur.execute("UPDATE forge_courses SET domain_id = NULL WHERE domain_id = %s", (domain_id,))
                cur.execute("DELETE FROM course_domains WHERE id = %s", (domain_id,))
                conn.commit()
                return True
        finally:
            conn.close()

    # ── Courses ───────────────────────────────────────────────────────────────

    def list_courses(self, user_id: int, q: str = None, domain_id: int = None,
                     difficulty: str = None, enrolled_only: bool = False,
                     req_status: str = None,
                     page: int = 1, limit: int = 18) -> Dict:
        """Library view — includes enrollment status and access request status for current user."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                self._ensure_requests_table(cur)

                where = ["c.status = 'published'"]
                params: List[Any] = [user_id, user_id]
                count_params: List[Any] = [user_id, user_id]

                if enrolled_only:
                    where.append("e.id IS NOT NULL")
                elif req_status == 'requested':
                    where.append("req.id IS NOT NULL")
                elif req_status:
                    where.append("req.status = %s")
                    params.append(req_status)
                    count_params.append(req_status)

                if q and q.strip():
                    term = f"%{q.strip()}%"
                    where.append("(c.title ILIKE %s OR c.description ILIKE %s OR d.name ILIKE %s)")
                    params.extend([term, term, term])
                    count_params.extend([term, term, term])
                if domain_id:
                    where.append("c.domain_id = %s")
                    params.append(domain_id)
                    count_params.append(domain_id)
                if difficulty and difficulty.lower() != 'all':
                    where.append("c.difficulty = %s")
                    params.append(difficulty.lower())
                    count_params.append(difficulty.lower())

                where_sql = " AND ".join(where)

                # Total count
                cur.execute(f"""
                    SELECT COUNT(*) AS total
                    FROM forge_courses c
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    LEFT JOIN forge_enrollments e ON e.course_id = c.id AND e.user_id = %s
                    LEFT JOIN LATERAL (
                        SELECT fcr.id, fcr.status
                        FROM forge_course_requests fcr
                        WHERE fcr.course_id = c.id AND fcr.user_id = %s
                        ORDER BY fcr.created_at DESC
                        LIMIT 1
                    ) req ON TRUE
                    WHERE {where_sql}
                """, count_params)
                count_row = cur.fetchone()
                total = count_row['total'] if count_row else 0

                offset = max(0, (page - 1) * limit)
                cur.execute(f"""
                    SELECT c.*, d.name AS domain_name, d.color AS domain_color,
                           e.id AS enrollment_id,
                           COALESCE(e.progress_percent, 0) AS progress_percent,
                           COALESCE(e.status, 'not_enrolled') AS enrollment_status,
                           e.score, e.deadline, e.scorm_location,
                           CASE WHEN e.id IS NOT NULL THEN TRUE ELSE FALSE END AS enrolled,
                           req.id AS request_id,
                           req.status AS request_status,
                           req.reason AS request_reason,
                           req.requested_at,
                           req.review_notes,
                           req.reviewed_at
                    FROM forge_courses c
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    LEFT JOIN forge_enrollments e ON e.course_id = c.id AND e.user_id = %s
                    LEFT JOIN LATERAL (
                        SELECT fcr.id, fcr.status, fcr.reason, fcr.requested_at, fcr.review_notes, fcr.reviewed_at
                        FROM forge_course_requests fcr
                        WHERE fcr.course_id = c.id AND fcr.user_id = %s
                        ORDER BY fcr.created_at DESC
                        LIMIT 1
                    ) req ON TRUE
                    WHERE {where_sql}
                    ORDER BY c.is_featured DESC, c.created_at DESC
                    LIMIT %s OFFSET %s
                """, params + [limit, offset])
                courses = [dict(r) for r in cur.fetchall()]

                return {
                    "courses": courses,
                    "total": total,
                    "page": page,
                    "pages": max(1, -(-total // limit)) if limit > 0 else 1,
                    "limit": limit
                }
        finally:
            conn.close()

    def list_all_courses(self) -> List[Dict]:
        """Admin list of all non-deleted courses."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT c.*, d.name AS domain_name, d.color AS domain_color,
                           u.username AS instructor_name
                    FROM forge_courses c
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    LEFT JOIN users u ON u.id = c.instructor_id
                    WHERE c.status != 'deleted'
                    ORDER BY c.created_at DESC
                """)
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_course_by_id(self, course_id: int, user_id: int = None) -> Optional[Dict]:
        """Full course detail with sections, quizzes, and learner enrollment."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT c.*, d.name AS domain_name, d.color AS domain_color,
                           u.username AS instructor_name
                    FROM forge_courses c
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    LEFT JOIN users u ON u.id = c.instructor_id
                    WHERE c.id = %s AND c.status != 'deleted'
                """, (course_id,))
                course = cur.fetchone()
                if not course:
                    return None
                course = dict(course)

                # Sections and inline quizzes
                cur.execute("""
                    SELECT * FROM course_sections
                    WHERE course_id = %s
                    ORDER BY order_index ASC, id ASC
                """, (course_id,))
                sections = []
                for s in cur.fetchall():
                    sec = dict(s)
                    cur.execute("""
                        SELECT * FROM section_quizzes
                        WHERE section_id = %s
                        ORDER BY id ASC
                    """, (sec["id"],))
                    sec["quizzes"] = [dict(q) for q in cur.fetchall()]
                    sections.append(sec)
                course["sections"] = sections

                # User enrollment & request if requested
                course["enrollment"] = None
                course["request"] = None
                if user_id:
                    cur.execute("""
                        SELECT * FROM forge_enrollments
                        WHERE course_id = %s AND user_id = %s
                    """, (course_id, user_id))
                    enr = cur.fetchone()
                    if enr:
                        course["enrollment"] = dict(enr)

                    self._ensure_requests_table(cur)
                    cur.execute("""
                        SELECT * FROM forge_course_requests
                        WHERE course_id = %s AND user_id = %s
                        ORDER BY created_at DESC LIMIT 1
                    """, (course_id, user_id))
                    req = cur.fetchone()
                    if req:
                        course["request"] = dict(req)
                return course
        finally:
            conn.close()

    def create_course(self, data: Dict) -> Dict:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    INSERT INTO forge_courses
                    (title, description, difficulty, estimated_hours, domain_id, category,
                     scorm_package_path, scorm_entry_url, scorm_version, scorm_mastery_score,
                     is_scorm, status, instructor_id, is_featured, thumbnail_url, target_skill_ids)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (
                    data.get("title"),
                    data.get("description"),
                    data.get("difficulty", "beginner"),
                    data.get("estimated_hours"),
                    data.get("domain_id"),
                    data.get("category", "General"),
                    data.get("scorm_package_path"),
                    data.get("scorm_entry_url"),
                    data.get("scorm_version", "1.2"),
                    data.get("scorm_mastery_score", 70.0),
                    data.get("is_scorm", True),
                    data.get("status", "draft"),
                    data.get("instructor_id"),
                    data.get("is_featured", False),
                    data.get("thumbnail_url"),
                    json.dumps(data.get("target_skill_ids", []))
                ))
                row = dict(cur.fetchone())
                conn.commit()
                return row
        finally:
            conn.close()

    def update_course(self, course_id: int, data: Dict) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                allowed = (
                    "title", "description", "difficulty", "estimated_hours",
                    "domain_id", "category", "scorm_mastery_score", "status",
                    "is_featured", "thumbnail_url", "scorm_entry_url", "is_scorm"
                )
                fields = {k: v for k, v in data.items() if k in allowed}
                if not fields:
                    return self.get_course_by_id(course_id)
                set_clause = ", ".join(f"{k} = %s" for k in fields)
                cur.execute(f"""
                    UPDATE forge_courses SET {set_clause}, updated_at = NOW()
                    WHERE id = %s RETURNING *
                """, list(fields.values()) + [course_id])
                row = cur.fetchone()
                conn.commit()
                return dict(row) if row else None
        finally:
            conn.close()

    def delete_course(self, course_id: int) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur)
                cur.execute("DELETE FROM forge_courses WHERE id = %s", (course_id,))
                conn.commit()
                return True
        finally:
            conn.close()

    def publish_course(self, course_id: int) -> Optional[Dict]:
        return self.update_course(course_id, {"status": "published"})

    def my_courses(self, user_id: int) -> List[Dict]:
        """Courses created or instructed by this user."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT c.*, d.name AS domain_name, d.color AS domain_color,
                           (SELECT COUNT(*) FROM forge_enrollments e WHERE e.course_id = c.id) AS enrolled_count,
                           (SELECT COUNT(*) FROM forge_enrollments e WHERE e.course_id = c.id AND e.status = 'completed') AS completed_count
                    FROM forge_courses c
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    WHERE (c.instructor_id = %s OR %s IS NULL) AND c.status != 'deleted'
                    ORDER BY c.created_at DESC
                """, (user_id, user_id))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    # ── Enrollments & Progress ────────────────────────────────────────────────

    def get_or_create_enrollment(self, user_id: int, course_id: int,
                                 employee_id: int = None, assigned_by_id: int = None,
                                 deadline=None, triggered_by: str = "manual") -> Dict:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT * FROM forge_enrollments
                    WHERE user_id = %s AND course_id = %s
                """, (user_id, course_id))
                existing = cur.fetchone()
                if existing:
                    return dict(existing)

                # Attempt to look up employee_id if not provided
                if not employee_id:
                    cur.execute("""
                        SELECT e.id FROM employees e
                        JOIN users u ON u.employee_code = e.employee_code
                        WHERE u.id = %s LIMIT 1
                    """, (user_id,))
                    emp_row = cur.fetchone()
                    if emp_row:
                        employee_id = emp_row["id"]

                cur.execute("""
                    INSERT INTO forge_enrollments
                    (user_id, course_id, employee_id, assigned_by_id, deadline,
                     triggered_by, status, progress_percent, enrolled_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 'not_started', 0, NOW())
                    RETURNING *
                """, (user_id, course_id, employee_id, assigned_by_id, deadline, triggered_by))
                row = dict(cur.fetchone())
                conn.commit()
                return row
        finally:
            conn.close()

    def get_enrollment(self, enrollment_id: int) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("SELECT * FROM forge_enrollments WHERE id = %s", (enrollment_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def update_enrollment_progress(self, enrollment_id: int, data: Dict) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                allowed = (
                    "progress_percent", "status", "score", "scorm_location",
                    "scorm_suspend_data", "last_accessed_at", "completed_at",
                    "completion_date"
                )
                fields = {k: v for k, v in data.items() if k in allowed}
                if not fields:
                    return self.get_enrollment(enrollment_id)
                set_clause = ", ".join(f"{k} = %s" for k in fields)
                cur.execute(f"""
                    UPDATE forge_enrollments SET {set_clause}, updated_at = NOW()
                    WHERE id = %s RETURNING *
                """, list(fields.values()) + [enrollment_id])
                row = cur.fetchone()
                conn.commit()
                return dict(row) if row else None
        finally:
            conn.close()

    def get_my_learning(self, user_id: int) -> Dict:
        """Dashboard learner view: continue_learning, in_progress, assigned, completed."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT e.*, c.title, c.description, c.scorm_version, c.estimated_hours,
                           c.is_scorm, c.scorm_entry_url, c.difficulty, c.thumbnail_url,
                           d.name AS domain_name, d.color AS domain_color
                    FROM forge_enrollments e
                    JOIN forge_courses c ON c.id = e.course_id AND c.status = 'published'
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    WHERE e.user_id = %s
                    ORDER BY e.last_accessed_at DESC NULLS LAST, e.enrolled_at DESC
                """, (user_id,))
                rows = [dict(r) for r in cur.fetchall()]

                in_progress = [r for r in rows if r.get("status") == "in_progress"]
                assigned = [r for r in rows if r.get("status") in ("not_started", "enrolled")]
                completed = [r for r in rows if r.get("status") == "completed"]

                continue_learning = in_progress[0] if in_progress else (assigned[0] if assigned else None)

                # Total certificates count
                cur.execute("SELECT COUNT(*) AS count FROM forge_certificates WHERE user_id = %s", (user_id,))
                cert_row = cur.fetchone()
                cert_count = cert_row["count"] if cert_row else 0

                stats = {
                    "total_assigned": len(rows),
                    "in_progress_count": len(in_progress),
                    "completed_count": len(completed),
                    "certificates_count": int(cert_count)
                }

                return {
                    "continue_learning": continue_learning,
                    "in_progress": in_progress,
                    "assigned": assigned,
                    "completed": completed,
                    "stats": stats
                }
        finally:
            conn.close()

    def get_assignable_employees(self, course_id: int = None) -> List[Dict]:
        """List of active employees and whether they are enrolled in course_id."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT e.id AS employee_id, e.employee_code, e.name, e.email_id AS email,
                           e.team AS department, e.designation,
                           u.id AS user_id,
                           CASE WHEN fe.id IS NOT NULL THEN TRUE ELSE FALSE END AS is_enrolled,
                           fe.status AS enrollment_status,
                           fe.progress_percent
                    FROM employees e
                    LEFT JOIN users u ON u.employee_code = e.employee_code
                    LEFT JOIN forge_enrollments fe ON fe.course_id = %s AND (fe.user_id = u.id OR fe.employee_id = e.id)
                    WHERE e.employment_status = 'Active' OR e.employment_status IS NULL
                    ORDER BY e.name ASC
                """, (course_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def unenroll(self, course_id: int, employee_ids: List[int]) -> int:
        """Remove enrollments for given employee IDs from a course."""
        conn = get_db_connection()
        removed = 0
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                for emp_id in employee_ids:
                    # Resolve employee_id → user_id via employees → users join
                    cur.execute("""
                        DELETE FROM forge_enrollments
                        WHERE course_id = %s
                          AND (
                            employee_id = %s
                            OR user_id IN (
                                SELECT u.id FROM users u
                                JOIN employees e ON e.employee_code = u.employee_code
                                WHERE e.id = %s
                            )
                          )
                    """, (course_id, emp_id, emp_id))
                    removed += cur.rowcount
            conn.commit()
        finally:
            conn.close()
        return removed

    def bulk_enroll(self, course_id: int, user_ids: List[int], assigned_by_id: int = None, deadline=None) -> int:
        enrolled = 0
        for uid in user_ids:
            self.get_or_create_enrollment(
                user_id=uid,
                course_id=course_id,
                assigned_by_id=assigned_by_id,
                deadline=deadline,
                triggered_by="hr_push"
            )
            enrolled += 1
        return enrolled

    def list_course_enrollments(self, course_id: int) -> List[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT e.*, u.username, emp.name AS employee_name, emp.employee_code,
                           emp.team AS department
                    FROM forge_enrollments e
                    JOIN users u ON u.id = e.user_id
                    LEFT JOIN employees emp ON emp.employee_code = u.employee_code OR emp.id = e.employee_id
                    WHERE e.course_id = %s
                    ORDER BY e.last_accessed_at DESC NULLS LAST, e.enrolled_at DESC
                """, (course_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_employee_courses(self, employee_id: int) -> List[Dict]:
        """Courses for employee profile modal."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT e.*, c.title, c.difficulty, c.estimated_hours, d.name AS domain_name
                    FROM forge_enrollments e
                    JOIN forge_courses c ON c.id = e.course_id
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    WHERE e.employee_id = %s
                    ORDER BY e.enrolled_at DESC
                """, (employee_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    # ── Certificates ──────────────────────────────────────────────────────────

    def issue_certificate(self, user_id: int, course_id: int, enrollment_id: int = None) -> Dict:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT * FROM forge_certificates
                    WHERE user_id = %s AND course_id = %s
                """, (user_id, course_id))
                existing = cur.fetchone()
                if existing:
                    return dict(existing)

                verification_code = str(uuid.uuid4()).replace("-", "").upper()[:16]
                cur.execute("""
                    INSERT INTO forge_certificates (user_id, course_id, enrollment_id, verification_code, issued_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    RETURNING *
                """, (user_id, course_id, enrollment_id, verification_code))
                row = dict(cur.fetchone())
                conn.commit()
                return row
        finally:
            conn.close()

    def verify_certificate(self, code: str) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT cert.*, c.title AS course_title, c.difficulty, c.estimated_hours,
                           u.username, emp.name AS learner_name, emp.employee_code, emp.team AS department
                    FROM forge_certificates cert
                    JOIN forge_courses c ON c.id = cert.course_id
                    JOIN users u ON u.id = cert.user_id
                    LEFT JOIN employees emp ON emp.employee_code = u.employee_code
                    WHERE cert.verification_code = %s
                """, (code.strip().upper(),))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def get_user_certificates(self, user_id: int) -> List[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT cert.*, c.title AS course_title, c.difficulty, c.thumbnail_url,
                           d.name AS domain_name
                    FROM forge_certificates cert
                    JOIN forge_courses c ON c.id = cert.course_id
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    WHERE cert.user_id = %s
                    ORDER BY cert.issued_at DESC
                """, (user_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_transcript(self, user_id: int) -> List[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("""
                    SELECT e.*, c.title AS course_title, c.difficulty, c.estimated_hours,
                           d.name AS domain_name, d.color AS domain_color,
                           cert.verification_code, cert.issued_at AS certificate_issued_at
                    FROM forge_enrollments e
                    JOIN forge_courses c ON c.id = e.course_id
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    LEFT JOIN forge_certificates cert ON cert.user_id = e.user_id AND cert.course_id = e.course_id
                    WHERE e.user_id = %s
                    ORDER BY e.completion_date DESC NULLS LAST, e.enrolled_at DESC
                """, (user_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    # ── Executive & Team Analytics ────────────────────────────────────────────

    def get_analytics_overview(self) -> Dict:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)

                # ── KPIs ──────────────────────────────────────────────────────
                cur.execute("""
                    SELECT
                        COUNT(DISTINCT c.id) AS total_courses,
                        COUNT(DISTINCT e.id) AS total_enrollments,
                        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) AS completed_enrollments,
                        COUNT(DISTINCT CASE WHEN e.status = 'in_progress' THEN e.id END) AS in_progress_enrollments,
                        COUNT(DISTINCT cert.id) AS total_certificates,
                        COUNT(DISTINCT CASE
                            WHEN e.status != 'completed'
                             AND e.deadline IS NOT NULL
                             AND e.deadline < NOW()
                            THEN e.id
                        END) AS overdue_enrollments
                    FROM forge_courses c
                    LEFT JOIN forge_enrollments e ON e.course_id = c.id
                    LEFT JOIN forge_certificates cert ON cert.course_id = c.id
                    WHERE c.status != 'deleted'
                """)
                kpis = dict(cur.fetchone() or {})

                # ── Per-course breakdown ───────────────────────────────────────
                cur.execute("""
                    SELECT
                        c.id,
                        c.title,
                        c.difficulty,
                        c.estimated_hours,
                        d.name  AS domain_name,
                        d.color AS domain_color,
                        COUNT(DISTINCT e.id)                                              AS assigned_count,
                        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END)   AS completed_count,
                        COUNT(DISTINCT CASE WHEN e.status = 'in_progress' THEN e.id END) AS in_progress_count,
                        COUNT(DISTINCT CASE
                            WHEN e.status != 'completed'
                             AND e.deadline IS NOT NULL
                             AND e.deadline < NOW()
                            THEN e.id
                        END) AS overdue_count,
                        ROUND(AVG(e.score)::numeric, 1)   AS avg_score,
                        CASE
                            WHEN COUNT(DISTINCT e.id) > 0
                            THEN ROUND(
                                (COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END)::numeric
                                 / COUNT(DISTINCT e.id)) * 100, 1
                            )
                            ELSE 0
                        END AS completion_rate
                    FROM forge_courses c
                    LEFT JOIN course_domains d  ON d.id = c.domain_id
                    LEFT JOIN forge_enrollments e ON e.course_id = c.id
                    WHERE c.status != 'deleted'
                    GROUP BY c.id, c.title, c.difficulty, c.estimated_hours, d.name, d.color
                    ORDER BY assigned_count DESC, c.title
                """)
                courses_breakdown = [dict(r) for r in cur.fetchall()]

                # ── Top learners (by completed courses) ───────────────────────
                cur.execute("""
                    SELECT
                        u.id AS user_id,
                        COALESCE(emp.name, u.username) AS name,
                        emp.team        AS department,
                        emp.designation AS designation,
                        COUNT(DISTINCT e.id)                                             AS enrolled_count,
                        COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END)  AS completed_count,
                        ROUND(AVG(CASE WHEN e.status = 'completed' THEN e.score END)::numeric, 1) AS avg_score
                    FROM forge_enrollments e
                    JOIN users u ON u.id = e.user_id
                    LEFT JOIN employees emp ON emp.employee_code = u.employee_code
                    GROUP BY u.id, u.username, emp.name, emp.team, emp.designation
                    HAVING COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) > 0
                       OR COUNT(DISTINCT e.id) > 0
                    ORDER BY completed_count DESC, avg_score DESC NULLS LAST
                    LIMIT 20
                """)
                top_learners = [dict(r) for r in cur.fetchall()]

                return {
                    "kpis": kpis,
                    "courses_breakdown": courses_breakdown,
                    "top_learners": top_learners,
                }
        finally:
            conn.close()

    def get_course_analytics(self, course_id: int) -> Dict:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)

                # Aggregate stats
                cur.execute("""
                    SELECT
                        COUNT(e.id) AS total_enrolled,
                        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) AS total_completed,
                        COUNT(CASE WHEN e.status = 'in_progress' THEN 1 END) AS total_in_progress,
                        AVG(e.progress_percent) AS avg_progress,
                        AVG(e.score) AS avg_score
                    FROM forge_enrollments e
                    WHERE e.course_id = %s
                """, (course_id,))
                stats = dict(cur.fetchone() or {})

                # Per-learner roster (used by CSV export and drilldown modal)
                cur.execute("""
                    SELECT
                        e.id,
                        u.id AS user_id,
                        COALESCE(emp.employee_code, u.employee_code) AS employee_code,
                        COALESCE(emp.name, u.username)               AS name,
                        u.email,
                        emp.team        AS department,
                        emp.designation AS designation,
                        e.status,
                        e.progress_percent,
                        e.score,
                        e.deadline,
                        e.last_accessed_at,
                        CASE
                            WHEN e.status != 'completed'
                             AND e.deadline IS NOT NULL
                             AND e.deadline < NOW()
                            THEN TRUE ELSE FALSE
                        END AS is_overdue
                    FROM forge_enrollments e
                    JOIN users u ON u.id = e.user_id
                    LEFT JOIN employees emp ON emp.employee_code = u.employee_code
                    WHERE e.course_id = %s
                    ORDER BY e.last_accessed_at DESC NULLS LAST, e.enrolled_at DESC
                """, (course_id,))
                roster = [dict(r) for r in cur.fetchall()]

                return {**stats, "roster": roster}
        finally:
            conn.close()

    # ── Course Access Requests & Manager/Admin Approvals ──────────────────────

    def get_enrollment_by_user_course(self, user_id: int, course_id: int) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                cur.execute("SELECT * FROM forge_enrollments WHERE user_id = %s AND course_id = %s", (user_id, course_id))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def request_course(self, user_id: int, course_id: int, reason: str = None) -> Dict:
        """Personal course request submitted by an employee for manager/admin approval."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                self._ensure_requests_table(cur)

                # Check if course exists and is published
                cur.execute("SELECT id, title FROM forge_courses WHERE id = %s AND status != 'deleted'", (course_id,))
                course = cur.fetchone()
                if not course:
                    raise ValueError("Course not found")

                # Check if already enrolled
                cur.execute("SELECT id, status FROM forge_enrollments WHERE user_id = %s AND course_id = %s", (user_id, course_id))
                enr = cur.fetchone()
                if enr:
                    return {"already_enrolled": True, "enrollment": dict(enr), "message": "You are already enrolled in this course"}

                # Check if there is an existing pending request
                cur.execute("""
                    SELECT * FROM forge_course_requests
                    WHERE user_id = %s AND course_id = %s AND status = 'pending'
                    ORDER BY created_at DESC LIMIT 1
                """, (user_id, course_id))
                existing = cur.fetchone()
                if existing:
                    return {"request": dict(existing), "already_requested": True, "message": "Your request is already pending review"}

                # Insert new request
                clean_reason = reason.strip() if reason and isinstance(reason, str) else None
                cur.execute("""
                    INSERT INTO forge_course_requests (user_id, course_id, reason, status, requested_at)
                    VALUES (%s, %s, %s, 'pending', NOW())
                    RETURNING *
                """, (user_id, course_id, clean_reason))
                req = dict(cur.fetchone())
                conn.commit()
                return {"request": req, "message": "Course access request submitted successfully! Awaiting manager or admin approval."}
        finally:
            conn.close()

    def list_course_requests(self, current_user: Dict, status: str = None, q: str = None, page: int = 1, limit: int = 20) -> Dict:
        """List course access requests visible to this manager or administrator."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                self._ensure_requests_table(cur)

                role = current_user.get("role", "")
                user_id = current_user.get("id")
                emp_code = current_user.get("employee_code")
                perms = current_user.get("permissions", {}) or {}

                is_admin = (
                    role in ("super_admin", "org_admin") or
                    perms.get("forge.courses.manage") or
                    perms.get("admin.full.access")
                )

                where = ["1=1"]
                params: List[Any] = []

                if status and status.lower() != 'all':
                    where.append("fcr.status = %s")
                    params.append(status.lower())

                # If manager and not full org_admin, only see requests from their reportees or team
                if not is_admin:
                    where.append("""(
                        emp.reporting_manager = %s
                        OR emp.reporting_manager = %s
                        OR fcr.user_id = %s
                    )""")
                    params.extend([emp_code or "", current_user.get("username", ""), user_id])

                if q and q.strip():
                    term = f"%{q.strip()}%"
                    where.append("(c.title ILIKE %s OR u.username ILIKE %s OR emp.name ILIKE %s OR emp.employee_code ILIKE %s OR emp.team ILIKE %s)")
                    params.extend([term, term, term, term, term])

                where_sql = " AND ".join(where)

                # Total count
                cur.execute(f"""
                    SELECT COUNT(*) AS total
                    FROM forge_course_requests fcr
                    JOIN forge_courses c ON c.id = fcr.course_id
                    JOIN users u ON u.id = fcr.user_id
                    LEFT JOIN employees emp ON emp.employee_code = u.employee_code
                    WHERE {where_sql}
                """, params)
                count_row = cur.fetchone()
                total = count_row['total'] if count_row else 0

                # Data rows
                offset = max(0, (page - 1) * limit)
                cur.execute(f"""
                    SELECT
                        fcr.id,
                        fcr.course_id,
                        fcr.user_id,
                        fcr.status,
                        fcr.reason,
                        fcr.requested_at,
                        fcr.reviewed_at,
                        fcr.review_notes,
                        fcr.created_at,
                        c.title AS course_title,
                        c.difficulty AS course_difficulty,
                        c.estimated_hours,
                        d.name AS domain_name,
                        d.color AS domain_color,
                        u.username,
                        u.email AS user_email,
                        COALESCE(emp.name, u.username) AS employee_name,
                        emp.employee_code,
                        emp.team AS department,
                        emp.designation,
                        emp.reporting_manager,
                        rev.username AS reviewer_username,
                        rev_emp.name AS reviewer_name
                    FROM forge_course_requests fcr
                    JOIN forge_courses c ON c.id = fcr.course_id
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    JOIN users u ON u.id = fcr.user_id
                    LEFT JOIN employees emp ON emp.employee_code = u.employee_code
                    LEFT JOIN users rev ON rev.id = fcr.reviewed_by
                    LEFT JOIN employees rev_emp ON rev_emp.employee_code = rev.employee_code
                    WHERE {where_sql}
                    ORDER BY 
                        CASE WHEN fcr.status = 'pending' THEN 0 ELSE 1 END,
                        fcr.requested_at DESC
                    LIMIT %s OFFSET %s
                """, params + [limit, offset])
                items = [dict(r) for r in cur.fetchall()]

                # Summary counts (for status tabs)
                scope_where = ["1=1"]
                scope_params: List[Any] = []
                if not is_admin:
                    scope_where.append("""(
                        emp.reporting_manager = %s
                        OR emp.reporting_manager = %s
                        OR fcr.user_id = %s
                    )""")
                    scope_params.extend([emp_code or "", current_user.get("username", ""), user_id])

                cur.execute(f"""
                    SELECT
                        COUNT(CASE WHEN fcr.status = 'pending' THEN 1 END) AS pending_count,
                        COUNT(CASE WHEN fcr.status = 'approved' THEN 1 END) AS approved_count,
                        COUNT(CASE WHEN fcr.status = 'rejected' THEN 1 END) AS rejected_count,
                        COUNT(*) AS total_count
                    FROM forge_course_requests fcr
                    JOIN forge_courses c ON c.id = fcr.course_id
                    JOIN users u ON u.id = fcr.user_id
                    LEFT JOIN employees emp ON emp.employee_code = u.employee_code
                    WHERE {" AND ".join(scope_where)}
                """, scope_params)
                summary = dict(cur.fetchone() or {})

                return {
                    "requests": items,
                    "total": total,
                    "page": page,
                    "pages": max(1, -(-total // limit)) if limit > 0 else 1,
                    "limit": limit,
                    "summary": summary
                }
        finally:
            conn.close()

    def get_pending_requests_count(self, current_user: Dict) -> int:
        """Count pending requests awaiting review for this manager or admin."""
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur)
                self._ensure_requests_table(cur)

                role = current_user.get("role", "")
                user_id = current_user.get("id")
                emp_code = current_user.get("employee_code")
                perms = current_user.get("permissions", {}) or {}
                is_admin = (
                    role in ("super_admin", "org_admin") or
                    perms.get("forge.courses.manage") or
                    perms.get("admin.full.access")
                )

                if is_admin:
                    cur.execute("SELECT COUNT(*) FROM forge_course_requests WHERE status = 'pending'")
                else:
                    cur.execute("""
                        SELECT COUNT(*)
                        FROM forge_course_requests fcr
                        JOIN users u ON u.id = fcr.user_id
                        LEFT JOIN employees emp ON emp.employee_code = u.employee_code
                        WHERE fcr.status = 'pending' AND (
                            emp.reporting_manager = %s OR emp.reporting_manager = %s OR fcr.user_id = %s
                        )
                    """, (emp_code or "", current_user.get("username", ""), user_id))
                row = cur.fetchone()
                return int(row[0]) if row else 0
        finally:
            conn.close()

    def approve_course_request(self, request_id: int, reviewer_id: int, review_notes: str = None) -> Dict:
        """Approve a course request and automatically enroll the employee."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                self._ensure_requests_table(cur)

                cur.execute("SELECT * FROM forge_course_requests WHERE id = %s", (request_id,))
                req = cur.fetchone()
                if not req:
                    raise ValueError("Course request not found")

                req = dict(req)
                user_id = req["user_id"]
                course_id = req["course_id"]

                # Update request status
                clean_notes = review_notes.strip() if review_notes and isinstance(review_notes, str) else None
                cur.execute("""
                    UPDATE forge_course_requests
                    SET status = 'approved',
                        reviewed_by = %s,
                        reviewed_at = NOW(),
                        review_notes = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reviewer_id, clean_notes, request_id))
                updated_req = dict(cur.fetchone())

                # Resolve employee_id if exists
                cur.execute("""
                    SELECT e.id FROM employees e
                    JOIN users u ON u.employee_code = e.employee_code
                    WHERE u.id = %s
                """, (user_id,))
                emp_row = cur.fetchone()
                emp_id = emp_row["id"] if emp_row else None

                # Enroll in forge_enrollments
                cur.execute("""
                    SELECT id FROM forge_enrollments WHERE user_id = %s AND course_id = %s
                """, (user_id, course_id))
                existing_enr = cur.fetchone()
                if not existing_enr:
                    cur.execute("""
                        INSERT INTO forge_enrollments (user_id, course_id, employee_id, assigned_by_id, triggered_by, status, progress_percent, enrolled_at)
                        VALUES (%s, %s, %s, %s, 'manager_approved', 'enrolled', 0, NOW())
                    """, (user_id, course_id, emp_id, reviewer_id))
                else:
                    cur.execute("""
                        UPDATE forge_enrollments
                        SET assigned_by_id = %s, triggered_by = 'manager_approved', updated_at = NOW()
                        WHERE id = %s
                    """, (reviewer_id, existing_enr["id"]))

                conn.commit()
                return updated_req
        finally:
            conn.close()

    def reject_course_request(self, request_id: int, reviewer_id: int, review_notes: str = None) -> Dict:
        """Decline a course access request."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                self._ensure_requests_table(cur)

                cur.execute("SELECT * FROM forge_course_requests WHERE id = %s", (request_id,))
                req = cur.fetchone()
                if not req:
                    raise ValueError("Course request not found")

                clean_notes = review_notes.strip() if review_notes and isinstance(review_notes, str) else None
                cur.execute("""
                    UPDATE forge_course_requests
                    SET status = 'rejected',
                        reviewed_by = %s,
                        reviewed_at = NOW(),
                        review_notes = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reviewer_id, clean_notes, request_id))
                updated_req = dict(cur.fetchone())
                conn.commit()
                return updated_req
        finally:
            conn.close()

    def get_my_course_requests(self, user_id: int) -> List[Dict]:
        """Get all course requests submitted by the logged-in learner."""
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur)
                self._ensure_requests_table(cur)

                cur.execute("""
                    SELECT
                        fcr.*,
                        c.title AS course_title,
                        c.difficulty AS course_difficulty,
                        c.estimated_hours,
                        d.name AS domain_name,
                        d.color AS domain_color,
                        rev.username AS reviewer_username,
                        rev_emp.name AS reviewer_name
                    FROM forge_course_requests fcr
                    JOIN forge_courses c ON c.id = fcr.course_id
                    LEFT JOIN course_domains d ON d.id = c.domain_id
                    LEFT JOIN users rev ON rev.id = fcr.reviewed_by
                    LEFT JOIN employees rev_emp ON rev_emp.employee_code = rev.employee_code
                    WHERE fcr.user_id = %s
                    ORDER BY fcr.requested_at DESC
                """, (user_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()
