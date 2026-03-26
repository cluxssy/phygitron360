from datetime import datetime
import os
import secrets
import shutil
from typing import Optional, Dict, Any, List
from backend.modules.deploy.repositories.employee_repo import EmployeeRepository
from backend.modules.deploy.repositories.asset_repo import AssetRepository
from backend.modules.deploy.repositories.attendance_repo import AttendanceRepository
from backend.modules.deploy.schemas.employee import UpdateEmployeeRequest, OffboardRequest
from backend.modules.deploy.repositories.user_repo import UserRepository
from backend.common.services.email_service import EmailService
from passlib.hash import pbkdf2_sha256

class EmployeeService:
    def __init__(self):
        self.repo = EmployeeRepository()
        self.asset_repo = AssetRepository()
        self.attendance_repo = AttendanceRepository()
        self.user_repo = UserRepository()
        self.email_service = EmailService()

    def get_all_employees(self):
        return self.repo.get_all_employees_basic()

    def get_employee_full_details(self, employee_code: str):
        employee = self.repo.get_employee_by_code(employee_code)
        if not employee:
            return None
            
        # Enrich with other data
        employee['skill_matrix'] = self.repo.get_skill_matrix(employee_code)
        employee['assets'] = self.repo.get_assets(employee_code)
        employee['training'] = self.repo.get_hr_activity(employee_code)
        
        # New: Quarterly Assessments
        assessments = self.repo.get_assessments(employee_code)
        employee['assessments'] = assessments
        
        # Calculate Average Score (optional logic for dashboard usage)
        if assessments:
             total = sum([a['total_score'] for a in assessments if a['status'] == 'Finalized'])
             count = len([a for a in assessments if a['status'] == 'Finalized'])
             employee['average_score'] = round(total / count, 1) if count > 0 else 0
        else:
             employee['average_score'] = 0

        return employee

    def create_employee(self, data: Dict[str, Any]):
        # Validations
        if not data['code'].startswith("EMP"):
             raise ValueError("Employee code must start with 'EMP'.")
        
        if not data['phone'].isdigit() or len(data['phone']) != 10:
             raise ValueError("Contact number must be exactly 10 digits.")

        # Date calcs for age validation
        try:
            dob_date = datetime.strptime(data['dob'], "%Y-%m-%d")
            doj_date = datetime.strptime(data['doj'], "%Y-%m-%d")
            today = datetime.today()
            age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
            if age < 18:
                raise ValueError("Employee must be at least 18 years old.")
        except ValueError:
             raise ValueError("Invalid date format.")

        # Ensure unique code check happens at DB level (repo handles IntegrityError mainly)
        # But we can check existence first if we want specific error
        if self.repo.get_employee_by_code(data['code']):
            raise ValueError("Employee Code already exists.")

        self.repo.create_employee(data)
        
        # --- ATOMIC INITIALIZATION ---
        # 1. Initialize Asset Checklist (Empty/Default)
        default_assets = {
            'ob_pf': 1 if data.get('pf') in ['Yes', 'true', '1'] else 0,
            'ob_mediclaim': 1 if data.get('mediclaim') in ['Yes', 'true', '1'] else 0
        }
        self.asset_repo.create_asset_checklist(data['code'], default_assets)

        # 2. Initialize Leave Balance (Current Year)
        current_year = datetime.now().year
        self.attendance_repo.create_leave_balance(data['code'], current_year)

        # 3. Auto-create user account so the employee can log in
        username = data['email']  # email is the login username
        temp_password = None
        user_created = False
        email_sent = False

        # Only create if this email isn't already a user
        existing_user = self.user_repo.get_user_by_username(username)
        if not existing_user:
            # Generate a secure 8-char URL-safe temp password
            temp_password = secrets.token_urlsafe(8)
            password_hash = pbkdf2_sha256.hash(temp_password)
            self.user_repo.create_user(
                username=username,
                password_hash=password_hash,
                role='Employee',
                employee_code=data['code']
            )
            user_created = True

            # Send welcome email with credentials
            if self.email_service.is_configured():
                email_result = self.email_service.send_new_employee_credentials(
                    recipient_email=username,
                    recipient_name=data['name'],
                    employee_code=data['code'],
                    temporary_password=temp_password
                )
                email_sent = email_result.get('success', False)
        else:
            # Link existing user to this employee code if not already linked
            if not existing_user.get('employee_code'):
                from backend.modules.deploy.repositories.admin_repo import AdminRepository
                admin_repo = AdminRepository()
                admin_repo.update_employee_code(existing_user['id'], data['code'])

        result = {"success": True, "message": "Employee added successfully!"}
        if user_created:
            result["email_sent"] = email_sent
            if email_sent:
                result["message"] = f"Employee added and login credentials emailed to {username}."
            else:
                # Email not configured — return creds in the response for HR to share manually
                result["message"] = "Employee added. Email not configured — share credentials manually."
                result["login_credentials"] = {
                    "username": username,
                    "temporary_password": temp_password,
                    "note": "Share these credentials with the employee. They must change the password on first login."
                }
        else:
            result["message"] += " An existing user account was found and linked."

        return result

    def update_employee(self, employee_code: str, data: dict):
        allowed_fields = [
            'exit_date', 'exit_reason', 'clearance_status', 'employment_status',
            'name', 'designation', 'team',
            'contact_number', 'emergency_contact', 'current_address', 
            'permanent_address', 'dob', 'email_id', 'reporting_manager', 'location', 'notes',
            'photo_path', 'cv_path', 'id_proofs'
        ]
        
        fields = []
        values = []
        
        for key, value in data.items():
            if key in allowed_fields and value is not None:
                fields.append(f"{key} = %s")
                values.append(value)
        
        if fields:
            self.repo.update_employee_fields(employee_code, fields, values)

        if 'role' in data and data['role']:
            self.repo.update_user_role(employee_code, data['role'])

        # Skills update
        p_skill = data.get('primary_skillset')
        s_skill = data.get('secondary_skillset')
        
        if 'skill_matrix' in data and isinstance(data['skill_matrix'], dict):
             p_skill = data['skill_matrix'].get('primary_skillset', p_skill)
             s_skill = data['skill_matrix'].get('secondary_skillset', s_skill)
             
        if p_skill is not None or s_skill is not None:
            self.repo.update_skill_matrix(employee_code, p_skill, s_skill)

        return {"success": True, "message": "Employee updated successfully"}
    
    def delete_employee(self, employee_code: str):
        if not self.repo.get_employee_by_code(employee_code):
             raise ValueError("Employee not found")
        
        self.repo.delete_employee_cascade(employee_code)
        return {"success": True, "message": f"Employee {employee_code} deleted successfully"}

    def get_options(self):
        return self.repo.get_dropdown_options()

    def offboard_employee(self, employee_code: str, req: OffboardRequest):
         exit_date = req.exit_date or datetime.today().strftime('%Y-%m-%d')
         
         # Combine Reason and Remarks
         full_reason = req.exit_reason or 'Resignation'
         if req.remarks:
             full_reason += f" | Notes: {req.remarks}"
             
         # Logic for Status
         status = 'Exited'
         deactivate = True
         
         if req.exit_type == 'Notice Period':
             status = 'Notice Period'
             deactivate = False
             
         self.repo.offboard_employee(employee_code, exit_date, full_reason, status=status, deactivate=deactivate)
         return {"success": True, "message": f"Employee {employee_code} marked as {status}."}
