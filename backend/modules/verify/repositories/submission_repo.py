import json
from typing import Optional, List, Dict, Any
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class SubmissionRepository:
    def __init__(self, tenant_id: str = 'public'):
        self.tenant_id = tenant_id

    def _set_search_path(self, cur):
        cur.execute(f'SET search_path TO "{self.tenant_id}"')

    def create_result(self, data: Dict[str, Any]) -> int:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute('''
                    INSERT INTO assessment_results 
                        (assessment_id, user_id, answers, score, pass_status, feedback,
                         is_malpractice, time_taken_seconds, submitted_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    RETURNING id
                ''', (
                    data.get("assessment_id"),
                    data.get("user_id"),
                    json.dumps(data.get("answers")),
                    data.get("initial_score"),
                    data.get("pass_status"),
                    data.get("initial_feedback"),
                    data.get("is_malpractice"),
                    data.get("time_taken_seconds"),
                ))
                res_id = cur.fetchone()[0]
                
                # Update assignment status
                cur.execute('''
                    UPDATE assessment_assignments 
                    SET status = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND assessment_id = %s
                ''', (data.get("assignment_status", "submitted"), data.get("user_id"), data.get("assessment_id")))
                
                # Add Proctoring Flags
                for flag in data.get("proctoring_events", []):
                    cur.execute('''
                        INSERT INTO proctoring_flags (assessment_result_id, flag_type, details)
                        VALUES (%s, %s, %s)
                    ''', (res_id, flag.get("type"), json.dumps(flag.get("details", {}))))

                conn.commit()
                return res_id
        finally:
            conn.close()

    def update_result_grading(self, result_id: int, assessment_id: int, user_id: int, scores_per_q: Dict, pct_score: float, passed: bool, feedback_str: str) -> None:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute(
                    """
                    UPDATE assessment_results
                    SET scores_per_question = %s,
                        score = %s,
                        pass_status = %s,
                        feedback = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (json.dumps(scores_per_q), pct_score, passed, feedback_str, result_id),
                )
                cur.execute(
                    """
                    UPDATE assessment_assignments
                    SET status = 'graded', updated_at = CURRENT_TIMESTAMP
                    WHERE assessment_id = %s AND user_id = %s
                    """,
                    (assessment_id, user_id),
                )
                conn.commit()
        finally:
            conn.close()

    def get_results_by_assessment(self, asm_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute('''
                    SELECT r.*, u.username as user_name, u.id as user_id, e.name as display_name
                    FROM assessment_results r
                    JOIN users u ON r.user_id = u.id
                    LEFT JOIN employees e ON e.employee_code = u.employee_code
                    WHERE r.assessment_id = %s
                    ORDER BY r.score DESC NULLS LAST
                ''', (asm_id,))
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_result_by_id(self, result_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute("SELECT * FROM assessment_results WHERE id = %s", (result_id,))
                row = cur.fetchone()
                if not row: return None
                result = dict(row)
                
                cur.execute("SELECT * FROM proctoring_flags WHERE assessment_result_id = %s", (result_id,))
                result['flags'] = [dict(r) for r in cur.fetchall()]
                return result
        finally:
            conn.close()

    def get_leaderboard(self, asm_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute(
                    """
                    SELECT u.id as user_id, e.name as user_name, u.username as email,
                           r.score, r.pass_status, r.time_taken_seconds
                    FROM assessment_results r
                    JOIN users u ON u.id = r.user_id
                    LEFT JOIN employees e ON e.employee_code = u.employee_code
                    WHERE r.assessment_id = %s AND r.score IS NOT NULL
                    ORDER BY r.score DESC, r.time_taken_seconds ASC
                    LIMIT 50
                    """,
                    (asm_id,),
                )
                return [dict(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def get_my_results(self, user_id: int) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute(
                    """
                    SELECT
                        r.id           AS result_id,
                        r.assessment_id,
                        a.title,
                        a.show_result_immediately,
                        r.score,
                        r.pass_status,
                        r.submitted_at,
                        r.is_malpractice
                    FROM assessment_results r
                    JOIN assessments a ON a.id = r.assessment_id
                    WHERE r.user_id = %s
                    ORDER BY r.submitted_at DESC
                    """,
                    (user_id,),
                )
                rows = []
                for r in cur.fetchall():
                    row = dict(r)
                    if not row.get("show_result_immediately"):
                        row["score"] = None
                        row["pass_status"] = None
                    rows.append(row)
                return rows
        finally:
            conn.close()

    def update_result_feedback(self, result_id: int, feedback: str) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_search_path(cur)
                cur.execute(
                    "UPDATE assessment_results SET feedback = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (feedback, result_id),
                )
                conn.commit()
                return cur.rowcount > 0
        finally:
            conn.close()

    def get_assessment_analytics(self, asm_id: int) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_search_path(cur)
                cur.execute(
                    """
                    SELECT
                        COUNT(id) AS total_submissions,
                        AVG(score) AS average_score,
                        COUNT(CASE WHEN pass_status = true THEN 1 END) AS passed_count,
                        COUNT(CASE WHEN is_malpractice = true THEN 1 END) AS malpractice_count
                    FROM assessment_results
                    WHERE assessment_id = %s
                    """,
                    (asm_id,),
                )
                row = cur.fetchone()
                return dict(row) if row else {}
        finally:
            conn.close()
