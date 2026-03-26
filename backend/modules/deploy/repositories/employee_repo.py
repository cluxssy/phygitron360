from typing import List, Dict, Any, Optional
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class EmployeeRepository:
    def get_all_employees_basic(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT e.employee_code, e.name, e.designation, e.team, e.reporting_manager, e.email_id, e.photo_path, e.employment_status, e.exit_date, MAX(u.role) as role
                FROM employees e
                LEFT JOIN users u ON e.employee_code = u.employee_code
                GROUP BY e.employee_code, e.name, e.designation, e.team, e.reporting_manager, e.email_id, e.photo_path, e.employment_status, e.exit_date
            """)
            rows = cur.fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    def get_employee_by_code(self, employee_code: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT e.*, u.role
                FROM employees e
                LEFT JOIN users u ON e.employee_code = u.employee_code
                WHERE e.employee_code = %s
            """, (employee_code,))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def get_skill_matrix(self, employee_code: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
             cur = conn.cursor(cursor_factory=RealDictCursor)
             cur.execute("SELECT * FROM skill_matrix WHERE employee_code = %s", (employee_code,))
             row = cur.fetchone()
             return dict(row) if row else {}
        finally:
            conn.close()

    def get_assets(self, employee_code: str) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM assets WHERE employee_code = %s", (employee_code,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_performance(self, employee_code: str) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM performance WHERE employee_code = %s", (employee_code,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_hr_activity(self, employee_code: str) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT * FROM hr_activity WHERE employee_code = %s", (employee_code,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_assessments(self, employee_code: str) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT 
                    id,
                    year,
                    quarter,
                    status,
                    total_score,
                    percentage,
                    updated_at
                FROM quarterly_assessments
                WHERE employee_code = %s
                ORDER BY year DESC, quarter DESC
            """, (employee_code,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        except Exception:
            return []
        finally:
            conn.close()

    def create_employee(self, data: Dict[str, Any]):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute('''
                INSERT INTO employees (
                    employee_code, name, dob, contact_number, emergency_contact, email_id, doj, 
                    team, designation, employment_type, reporting_manager, location, 
                    current_address, permanent_address,
                    pf_included, mediclaim_included, 
                    photo_path, cv_path, id_proofs, notes, 
                    employment_status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Active')
            ''', (
                data['code'], data['name'], data['dob'], data['phone'], data['emergency'], 
                data['email'], data['doj'], data['team'], data['role'], data['type'], 
                data['manager'], data['location'], data['current_address'], data['permanent_address'],
                data['pf'], data['mediclaim'], 
                data['photo_path'], data['cv_path'], data['id_proofs'], data['notes']
            ))
            
            # Skill Matrix
            cur.execute('''
                INSERT INTO skill_matrix (
                    employee_code, candidate_name, primary_skillset,
                    secondary_skillset, experience_years, cv_upload
                ) VALUES (%s, %s, %s, %s, %s, %s)
            ''', (
                data['code'], data['name'], data['primary_skillset'], data['secondary_skillset'],
                data['experience_years'], data['cv_path']
            ))
            
            conn.commit()
        finally:
            conn.close()

    def update_employee_fields(self, employee_code: str, fields: List[str], values: List[Any]):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            values.append(employee_code)
            query = f"UPDATE employees SET {', '.join([f'{f} = %s' for f in fields])} WHERE employee_code = %s"
            cur.execute(query, tuple(values))
            conn.commit()
        finally:
            conn.close()

    def update_user_role(self, employee_code: str, role: str):
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            # First verify user exists for this employee
            cur.execute("SELECT id FROM users WHERE employee_code = %s", (employee_code,))
            user = cur.fetchone()
            if user:
                cur.execute("UPDATE users SET role = %s WHERE employee_code = %s", (role, employee_code))
                conn.commit()
        finally:
            conn.close()

    def update_skill_matrix(self, employee_code: str, primary: str, secondary: str):
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            # Check exist
            cur.execute("SELECT id FROM skill_matrix WHERE employee_code = %s", (employee_code,))
            exists = cur.fetchone()
            if exists:
                updates = []
                vals = []
                if primary is not None:
                    updates.append("primary_skillset = %s")
                    vals.append(primary)
                if secondary is not None:
                    updates.append("secondary_skillset = %s")
                    vals.append(secondary)
                
                if updates:
                    vals.append(employee_code)
                    query = f"UPDATE skill_matrix SET {', '.join(updates)} WHERE employee_code = %s"
                    cur.execute(query, tuple(vals))
            else:
                cur.execute("INSERT INTO skill_matrix (employee_code, primary_skillset, secondary_skillset) VALUES (%s, %s, %s)", 
                          (employee_code, primary or '', secondary or ''))
            conn.commit()
        finally:
            conn.close()

    def delete_employee_cascade(self, employee_code: str):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("DELETE FROM skill_matrix WHERE employee_code = %s", (employee_code,))
            cur.execute("DELETE FROM assets WHERE employee_code = %s", (employee_code,))
            cur.execute("DELETE FROM performance WHERE employee_code = %s", (employee_code,))
            cur.execute("DELETE FROM hr_activity WHERE employee_code = %s", (employee_code,))
            cur.execute("DELETE FROM employees WHERE employee_code = %s", (employee_code,))
            conn.commit()
        finally:
            conn.close()

    def get_dropdown_options(self) -> Dict[str, Any]:
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("SELECT DISTINCT team FROM employees WHERE team IS NOT NULL AND team != '' ORDER BY team")
            teams = [r[0] for r in cur.fetchall()]
            
            cur.execute("SELECT DISTINCT designation FROM employees WHERE designation IS NOT NULL AND designation != '' ORDER BY designation")
            designations = [r[0] for r in cur.fetchall()]
            
            cur.execute("""
                SELECT e.name, u.employee_code, u.role
                FROM employees e
                JOIN users u ON e.employee_code = u.employee_code
                WHERE u.role IN ('Management', 'Admin', 'HR')
                ORDER BY e.name
            """)
            managers = [{"name": r[0], "code": r[1], "role": r[2]} for r in cur.fetchall()]
            
            return {"teams": teams, "designations": designations, "managers": managers}
        finally:
             conn.close()

    def offboard_employee(self, employee_code: str, exit_date: str, exit_reason: str, status: str = 'Exited', deactivate: bool = True):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                UPDATE employees 
                SET employment_status = %s, 
                    exit_date = %s, 
                    exit_reason = %s,
                    clearance_status = 'Pending'
                WHERE employee_code = %s
            """, (status, exit_date, exit_reason, employee_code))
            
            if deactivate:
                cur.execute("UPDATE users SET is_active = 0 WHERE employee_code = %s", (employee_code,))
            
            conn.commit()
        finally:
            conn.close()

