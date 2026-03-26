import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, List, Optional
from backend.core.database import get_db_connection


class TrainingRepository:

    def get_all_programs(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM training_library ORDER BY created_at DESC"
                )
                rows = cur.fetchall()
                return rows
        finally:
            conn.close()


    def create_program(self, name: str, desc: str, duration: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO training_library 
                    (program_name, description, default_duration)
                    VALUES (%s, %s, %s)
                """, (name, desc, duration))
                conn.commit()
        finally:
            conn.close()


    def get_program_by_id(self, prog_id: int) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM training_library WHERE id = %s",
                    (prog_id,)
                )
                row = cur.fetchone()
                return row
        finally:
            conn.close()


    def create_assignment(self, code: str, prog_id: int, prog_name: str, date: str, duration: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO hr_activity (
                        employee_code, program_id, training_assigned,
                        training_date, training_duration, training_status
                    ) 
                    VALUES (%s, %s, %s, %s, %s, 'Pending')
                """, (code, prog_id, prog_name, date, duration))
                conn.commit()
        finally:
            conn.close()


    def get_all_assignments(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        h.id,
                        h.employee_code,
                        e.name as employee_name,
                        h.program_id,
                        t.program_name,
                        h.training_date,
                        h.training_status,
                        h.training_duration
                    FROM hr_activity h
                    LEFT JOIN employees e 
                        ON h.employee_code = e.employee_code
                    LEFT JOIN training_library t 
                        ON h.program_id = t.id
                    ORDER BY h.id DESC
                """)
                rows = cur.fetchall()
                return rows
        finally:
            conn.close()


    def update_assignment_status(self, id: int, status: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE hr_activity
                    SET training_status = %s
                    WHERE id = %s
                """, (status, id))
                conn.commit()
        finally:
            conn.close()