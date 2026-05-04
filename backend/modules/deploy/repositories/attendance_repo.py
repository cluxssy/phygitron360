from typing import List, Optional, Dict, Any
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class AttendanceRepository:
    def _set_path(self, cur, tenant_id='public'):
        cur.execute(f'SET search_path TO "{tenant_id}", public')

    def get_todays_attendance(self, employee_code: str, date: str, tenant_id: str = 'public') -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute(
                "SELECT * FROM attendance WHERE employee_code = %s AND date = %s", 
                (employee_code, date)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def clock_in(self, employee_code: str, date: str, time: str, ip: str, tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            self._set_path(cur, tenant_id)
            cur.execute('''
                INSERT INTO attendance (employee_code, date, clock_in, ip_address, status)
                VALUES (%s, %s, %s, %s, 'Present')
            ''', (employee_code, date, time, ip))
            conn.commit()
        finally:
            conn.close()

    def clock_out(self, employee_code: str, date: str, time: str, work_log: str, tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            self._set_path(cur, tenant_id)
            cur.execute('''
                UPDATE attendance 
                SET clock_out = %s, work_log = %s
                WHERE employee_code = %s AND date = %s
            ''', (time, work_log, employee_code, date))
            conn.commit()
        finally:
            conn.close()

    def upsert_attendance(self, employee_code: str, date: str, clock_in: Optional[str], clock_out: Optional[str], work_log: Optional[str], status: str, tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            self._set_path(cur, tenant_id)
            cur.execute('''
                INSERT INTO attendance (employee_code, date, clock_in, clock_out, work_log, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (employee_code, date) DO UPDATE 
                SET clock_in = EXCLUDED.clock_in,
                    clock_out = EXCLUDED.clock_out,
                    work_log = EXCLUDED.work_log,
                    status = EXCLUDED.status
            ''', (employee_code, date, clock_in, clock_out, work_log, status))
            conn.commit()
        finally:
            conn.close()

    def get_history(self, employee_code: str, limit: int = 30, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute('''
                SELECT * FROM attendance 
                WHERE employee_code = %s 
                ORDER BY date DESC LIMIT %s
            ''', (employee_code, limit))
            records = cur.fetchall()
            return [dict(r) for r in records]
        finally:
            conn.close()

    def get_leave_balance(self, employee_code: str, year: int, tenant_id: str = 'public') -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute(
                "SELECT * FROM leave_balances WHERE employee_code = %s AND year = %s",
                (employee_code, year)
            )
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def create_leave_balance(self, employee_code: str, year: int, tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            self._set_path(cur, tenant_id)
            cur.execute(
                "INSERT INTO leave_balances (employee_code, year) VALUES (%s, %s)",
                (employee_code, year)
            )
            conn.commit()
        finally:
            conn.close()
    
    def update_leave_balance(self, employee_code: str, used_delta: int, extended_delta: int, tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            self._set_path(cur, tenant_id)
            cur.execute('''
                UPDATE leave_balances 
                SET used_leaves = used_leaves + %s,
                    extended_leaves = extended_leaves + %s
                WHERE employee_code = %s
            ''', (used_delta, extended_delta, employee_code))
            conn.commit()
        finally:
            conn.close()

    def create_leave_request(self, employee_code: str, start: str, end: str, l_type: str, reason: str, status: str = 'Pending', tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            self._set_path(cur, tenant_id)
            cur.execute('''
                INSERT INTO leaves (employee_code, start_date, end_date, leave_type, reason, status)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (employee_code, start, end, l_type, reason, status))
            conn.commit()
        finally:
            conn.close()

    def get_employee_leaves(self, employee_code: str, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute(
                "SELECT * FROM leaves WHERE employee_code = %s ORDER BY applied_at DESC", 
                (employee_code,)
            )
            leaves = cur.fetchall()
            return [dict(l) for l in leaves]
        finally:
            conn.close()

    def get_all_pending_leaves(self, admin_role: str, admin_code: Optional[str], tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            query = '''
                SELECT l.*, e.name as employee_name, COALESCE(u.role, 'Employee') as applicant_role
                FROM leaves l 
                JOIN employees e ON l.employee_code = e.employee_code 
                LEFT JOIN users u ON l.employee_code = u.employee_code
                WHERE l.status = 'Pending'
            '''
            params = []
            
            # HR equivalent (manager) should not approve Admin or other manager's leaves
            if admin_role == 'manager':
                query += " AND COALESCE(u.role, 'employee') NOT IN ('org_admin', 'manager', 'super_admin')"
            
            # Approvers should not see their own leave in the approval queue
            if admin_code:
                query += " AND l.employee_code != %s"
                params.append(admin_code)
                
            query += " ORDER BY l.applied_at ASC"
            
            cur.execute(query, params)
            leaves = cur.fetchall()
            return [dict(l) for l in leaves]
        finally:
            conn.close()
            
    def get_leave_by_id(self, leave_id: int, tenant_id: str = 'public') -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute("SELECT * FROM leaves WHERE id = %s", (leave_id,))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def update_leave_status(self, leave_id: int, status: str, reason: Optional[str], tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            self._set_path(cur, tenant_id)
            cur.execute("UPDATE leaves SET status = %s, rejection_reason = %s WHERE id = %s", (status, reason, leave_id))
            conn.commit()
        finally:
            conn.close()

    def get_daily_log(self, date: str, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute('''
                SELECT a.*, e.name as employee_name, e.designation 
                FROM attendance a
                JOIN employees e ON a.employee_code = e.employee_code 
                WHERE a.date = %s
            ''', (date,))
            logs = cur.fetchall()
            return [dict(l) for l in logs]
        finally:
            conn.close()

    def get_monthly_attendance(self, start_date: str, end_date: str, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
             cur = conn.cursor(cursor_factory=RealDictCursor)
             self._set_path(cur, tenant_id)
             cur.execute("""
                SELECT employee_code, date, status, clock_in, clock_out
                FROM attendance 
                WHERE date BETWEEN %s AND %s
            """, (start_date, end_date))
             rows = cur.fetchall()
             return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_monthly_approved_leaves(self, start_date: str, end_date: str, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute("""
                SELECT employee_code, start_date, end_date, leave_type
                FROM leaves 
                WHERE status = 'Approved' 
                AND NOT (end_date < %s OR start_date > %s)
            """, (start_date, end_date))
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()
            
    def get_all_active_employees_basic(self, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute("SELECT name, employee_code FROM employees WHERE employment_status = 'Active' ORDER BY name")
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_user_role(self, employee_code: str, tenant_id: str = 'public') -> Optional[str]:
        conn = get_db_connection()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            self._set_path(cur, tenant_id)
            cur.execute("SELECT role FROM users WHERE employee_code = %s", (employee_code,))
            row = cur.fetchone()
            return row['role'] if row else None
        finally:
             conn.close()

