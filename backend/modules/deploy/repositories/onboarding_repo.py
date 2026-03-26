from typing import Dict, Any, List, Optional
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class OnboardingRepository:
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT 1 FROM users WHERE username = %s", (email,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def get_pending_invite_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT 1 FROM onboarding_invites WHERE email = %s AND status = 'Pending'", (email,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def create_invite(self, invite_data: Dict[str, Any]) -> int:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('''
                    INSERT INTO onboarding_invites (token, email, name, role, department, designation, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    invite_data['token'], invite_data['email'], invite_data['name'], 
                    invite_data['role'], invite_data['department'], invite_data['designation'], 
                    invite_data['expires_at']
                ))
                conn.commit()
                row = cur.fetchone()
                return row['id']
        finally:
            conn.close()

    def get_all_invites(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM onboarding_invites ORDER BY created_at DESC")
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    def revoke_invite(self, invite_id: int):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE onboarding_invites SET status = 'Revoked' WHERE id = %s", (invite_id,))
                conn.commit()
        finally:
            conn.close()
            
    def get_invite_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM onboarding_invites WHERE token = %s AND status = 'Pending'", (token,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def update_invite_status(self, token: str, status: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE onboarding_invites SET status = %s WHERE token = %s", (status, token))
                conn.commit()
        finally:
            conn.close()

    def get_pending_approvals(self) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM employees WHERE employment_status = 'Pending Approval'")
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    def approve_employee(self, employee_code: str, details: Dict[str, Any]):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute('''
                    UPDATE employees 
                    SET employment_status = 'Active',
                        reporting_manager = %s,
                        employment_type = %s,
                        pf_included = %s,
                        mediclaim_included = %s,
                        notes = %s
                    WHERE employee_code = %s
                ''', (
                    details['manager'], details['type'], details['pf'], 
                    details['mediclaim'], details['notes'], employee_code
                ))
                
                cur.execute("UPDATE users SET is_active = 1 WHERE employee_code = %s", (employee_code,))
                conn.commit()
        finally:
            conn.close()
    
    def generate_employee_code(self):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Find the max number in EMPXXXX format across both tables
                cur.execute("SELECT employee_code FROM employees WHERE employee_code LIKE 'EMP%%'")
                res_e = cur.fetchall()
                cur.execute("SELECT employee_code FROM users WHERE employee_code LIKE 'EMP%%'")
                res_u = cur.fetchall()
                
                codes = [int(r[0].replace('EMP', '')) for r in res_e if r[0].replace('EMP', '').isdigit()]
                codes += [int(r[0].replace('EMP', '')) for r in res_u if r[0].replace('EMP', '').isdigit()]
                
                if not codes:
                    return 1
                return max(codes) + 1
        finally:
            conn.close()

    def check_employee_code_exists(self, code: str) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # Check both tables to prevent duplicates even if data is inconsistent
                cur.execute("SELECT 1 FROM employees WHERE employee_code = %s", (code,))
                e_exists = cur.fetchone() is not None
                cur.execute("SELECT 1 FROM users WHERE employee_code = %s", (code,))
                u_exists = cur.fetchone() is not None
                return e_exists or u_exists
        finally:
            conn.close()

    def complete_onboarding_transaction(self, user_data: dict, employee_data: dict, skill_data: dict):
        # Execute all as one transaction
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                # 1. User
                cur.execute("INSERT INTO users (username, password_hash, role, employee_code, is_active) VALUES (%s, %s, %s, %s, 0)", 
                        (user_data['email'], user_data['password_hash'], user_data['role'], user_data['employee_code']))
                
                # 2. Employee
                cur.execute('''
                    INSERT INTO employees (
                        employee_code, name, email_id, contact_number, emergency_contact, dob, 
                        current_address, permanent_address, education_details,
                        team, designation, employment_status, doj,
                        photo_path, cv_path, id_proofs
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    employee_data['code'], employee_data['name'], employee_data['email'], 
                    employee_data['phone'], employee_data['emergency'], employee_data['dob'],
                    employee_data['current_address'], employee_data['permanent_address'], employee_data['education'],
                    employee_data['team'], employee_data['designation'], 'Pending Approval', 
                    employee_data['doj'],
                    employee_data['photo_path'], employee_data['cv_path'], employee_data['id_proof_path']
                ))

                # 3. Skills
                cur.execute('''
                    INSERT INTO skill_matrix (
                        employee_code, candidate_name, primary_skillset,
                        secondary_skillset, cv_upload
                    ) VALUES (%s, %s, %s, %s, %s)
                ''', (
                    skill_data['code'], skill_data['name'], skill_data['primary'], 
                    skill_data['secondary'], skill_data['cv_path']
                ))
                
                conn.commit()
        except:
            conn.rollback()
            raise
        finally:
            conn.close()

