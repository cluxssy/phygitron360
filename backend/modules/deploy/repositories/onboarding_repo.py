from typing import Dict, Any, List, Optional
from backend.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

class OnboardingRepository:
    def _set_path(self, cur, tenant_id='public'):
        cur.execute(f'SET search_path TO "{tenant_id}", public')

    def get_user_by_email(self, email: str, tenant_id: str = 'public') -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur, tenant_id)
                cur.execute("SELECT 1 FROM users WHERE username = %s", (email,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def get_pending_invite_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur, 'public')
                cur.execute("SELECT 1 FROM onboarding_invites WHERE email = %s AND status = 'Pending'", (email,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def create_invite(self, invite_data: Dict[str, Any], tenant_id: str = 'public') -> int:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur, 'public')
                cur.execute('''
                    INSERT INTO onboarding_invites (token, tenant_id, email, name, role, department, designation, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    invite_data['token'], tenant_id, invite_data['email'], invite_data['name'], 
                    invite_data['role'], invite_data['department'], invite_data['designation'], 
                    invite_data['expires_at']
                ))
                conn.commit()
                row = cur.fetchone()
                return row['id']
        finally:
            conn.close()

    def get_all_invites(self, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur, 'public')
                cur.execute("SELECT * FROM onboarding_invites WHERE tenant_id = %s ORDER BY created_at DESC", (tenant_id,))
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    def revoke_invite(self, invite_id: int):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur, 'public')
                cur.execute("UPDATE onboarding_invites SET status = 'Revoked' WHERE id = %s", (invite_id,))
                conn.commit()
        finally:
            conn.close()
            
    def get_invite_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur, 'public')
                cur.execute("SELECT * FROM onboarding_invites WHERE token = %s AND status = 'Pending'", (token,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            conn.close()

    def update_invite_status(self, token: str, status: str):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur, 'public')
                cur.execute("UPDATE onboarding_invites SET status = %s WHERE token = %s", (status, token))
                conn.commit()
        finally:
            conn.close()

    def get_pending_approvals(self, tenant_id: str = 'public') -> List[Dict[str, Any]]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                self._set_path(cur, tenant_id)
                cur.execute("""
                    SELECT e.*, s.primary_skillset, s.secondary_skillset 
                    FROM employees e
                    LEFT JOIN skill_matrix s ON e.employee_code = s.employee_code
                    WHERE e.employment_status = 'Pending Approval'
                """)
                rows = cur.fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    def approve_employee(self, employee_code: str, details: Dict[str, Any], tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur, tenant_id)
                
                final_code = details.get('new_code') or employee_code
                
                # If code changed, handle potential FK violations via a clone-and-swap strategy
                if final_code != employee_code:
                    # 1. Clone the employee record with the new code
                    cur.execute('''
                        INSERT INTO employees (
                            employee_code, name, dob, contact_number, emergency_contact, email_id, 
                            team, designation, employment_status, current_address, permanent_address,
                            education_details, photo_path, cv_path, id_proofs
                        ) SELECT %s, name, dob, contact_number, emergency_contact, email_id, 
                            team, designation, employment_status, current_address, permanent_address,
                            education_details, photo_path, cv_path, id_proofs
                        FROM employees WHERE employee_code = %s
                    ''', (final_code, employee_code))
                    
                    # 2. Update child records to the new code
                    cur.execute("UPDATE users SET employee_code = %s WHERE employee_code = %s", (final_code, employee_code))
                    cur.execute("UPDATE skill_matrix SET employee_code = %s WHERE employee_code = %s", (final_code, employee_code))
                    
                    # 3. Delete the old record
                    cur.execute("DELETE FROM employees WHERE employee_code = %s", (employee_code,))
                
                cur.execute('''
                    UPDATE employees 
                    SET employment_status = 'Active',
                        reporting_manager = %s,
                        employment_type = %s,
                        pf_included = %s,
                        mediclaim_included = %s,
                        location = %s,
                        notes = %s,
                        doj = %s
                    WHERE employee_code = %s
                ''', (
                    details['manager'], details['type'], details['pf'], 
                    details['mediclaim'], details.get('location', ''), details['notes'],
                    details.get('doj'), final_code
                ))
                
                cur.execute("UPDATE users SET is_active = 1 WHERE employee_code = %s", (final_code,))
                conn.commit()
        finally:
            conn.close()
    
    def generate_employee_code(self, tenant_id: str = 'public'):
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur, tenant_id)
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

    def check_employee_code_exists(self, code: str, tenant_id: str = 'public') -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur, tenant_id)
                # Check both tables to prevent duplicates even if data is inconsistent
                cur.execute("SELECT 1 FROM employees WHERE employee_code = %s", (code,))
                e_exists = cur.fetchone() is not None
                cur.execute("SELECT 1 FROM users WHERE employee_code = %s", (code,))
                u_exists = cur.fetchone() is not None
                return e_exists or u_exists
        finally:
            conn.close()

    def complete_onboarding_transaction(self, user_data: dict, employee_data: dict, skill_data: dict, tenant_id: str = 'public'):
        # Execute all as one transaction
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                self._set_path(cur, tenant_id)
                
                # 1. User
                cur.execute("INSERT INTO users (username, password_hash, role, employee_code, is_active) VALUES (%s, %s, %s, %s, 0)", 
                        (user_data['email'], user_data['password_hash'], user_data['role'], user_data['employee_code']))
                
                # 2. Employee
                cur.execute('''
                    INSERT INTO employees (
                        employee_code, name, email_id, contact_number, emergency_contact, dob, 
                        current_address, permanent_address, education_details,
                        team, designation, employment_status, doj, location,
                        photo_path, cv_path, id_proofs
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    employee_data['code'], employee_data['name'], employee_data['email'], 
                    employee_data['phone'], employee_data['emergency'], employee_data['dob'],
                    employee_data['current_address'], employee_data['permanent_address'], employee_data['education'],
                    employee_data['team'], employee_data['designation'], 'Pending Approval', 
                    employee_data['doj'], employee_data.get('location', ''),
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

