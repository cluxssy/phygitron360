import uuid
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.modules.deploy.repositories.onboarding_repo import OnboardingRepository
from backend.common.services.email_service import EmailService
from backend.modules.deploy.services.notification_service import add_notification
from passlib.hash import pbkdf2_sha256

class OnboardingService:
    def __init__(self):
        self.repo = OnboardingRepository()
        self.email_service = EmailService()

    def create_invite(self, data: Dict[str, Any]):
        if self.repo.get_user_by_email(data['email']):
            raise ValueError("User with this email already exists.")
            
        if self.repo.get_pending_invite_by_email(data['email']):
            raise ValueError("Pending invite already exists for this email.")

        token = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(days=7)
        
        invite_data = {
            "token": token,
            "email": data['email'],
            "name": data['name'],
            "role": data.get('role', 'Employee'),
            "department": data.get('department'),
            "designation": data.get('designation'),
            "expires_at": expires_at
        }
        
        self.repo.create_invite(invite_data)
        
        # Generate the onboarding link
        relative_link = f"/onboard?token={token}"
        
        # Try to send email
        email_sent = False
        email_message = ""
        
        if self.email_service.is_configured():
            # Get the base URL from environment or use a default
            base_url = os.getenv("APP_BASE_URL", "http://localhost:3000")
            full_link = f"{base_url}{relative_link}"
            
            email_result = self.email_service.send_onboarding_invitation(
                recipient_email=data['email'],
                recipient_name=data['name'],
                onboarding_link=full_link,
                expires_days=7
            )
            
            email_sent = email_result['success']
            email_message = email_result['message']
        else:
            email_message = "Email not configured. Link generated for manual sharing."
        
        return {
            "success": True, 
            "message": email_message if email_sent else "Invitation created. Email not sent - please share the link manually.",
            "email_sent": email_sent,
            "token": token,
            "link": relative_link
        }

    def get_all_invites(self):
        return self.repo.get_all_invites()

    def revoke_invite(self, invite_id: int):
        self.repo.revoke_invite(invite_id)
        return {"success": True, "message": "Invite revoked"}

    def verify_token(self, token: str):
        invite = self.repo.get_invite_by_token(token)
        if not invite:
            raise ValueError("Invalid or expired token")
            
        # Parse expiry
        expires_at = invite['expires_at']
        if isinstance(expires_at, str):
            try:
                # Try ms first
                expires_at = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S.%f')
            except ValueError:
                # Fallback
                expires_at = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S')
             
        if datetime.now() > expires_at:
             raise ValueError("Token expired")

             
        return {
            "valid": True,
            "email": invite['email'],
            "name": invite['name'],
            "role": invite['role'],
            "department": invite['department'],
            "designation": invite['designation']
        }

    def complete_onboarding(self, token: str, password: str, employee_data: dict, file_metadata: dict):
        invite = self.repo.get_invite_by_token(token)
        if not invite:
            raise ValueError("Invalid token")

        # 1. Generate Employee Code
        # Simple loop to find free code
        count = self.repo.generate_employee_code()
        # count is int, we assume it is unique enough or we iterate.
        # But `generate_employee_code` should ideally handle uniqueness or we do it here.
        # Let's simplify: try N times
        emp_code = ""
        for i in range(100):
            candidate = f"EMP{str(count + i).zfill(4)}"
            if not self.repo.check_employee_code_exists(candidate):
                emp_code = candidate
                break
        
        if not emp_code:
            import random
            emp_code = f"EMP{str(random.randint(1000, 9999))}"

        # 2. Prepare Data
        password_hash = pbkdf2_sha256.hash(password)
        
        user_data = {
            "email": invite['email'],
            "password_hash": password_hash,
            "role": invite['role'],
            "employee_code": emp_code
        }
        
        emp_record = {
            "code": emp_code,
            "name": invite['name'],
            "email": invite['email'],
            "phone": employee_data['contact_number'],
            "emergency": employee_data.get('emergency_contact'),
            "dob": employee_data['dob'],
            "current_address": employee_data['current_address'],
            "permanent_address": employee_data['permanent_address'],
            "education": employee_data.get('education_details'),
            "team": invite['department'],
            "designation": invite['designation'],
            "doj": datetime.now().strftime('%Y-%m-%d'),
            "photo_path": file_metadata.get('photo', ''),
            "cv_path": file_metadata.get('cv', ''),
            "id_proof_path": file_metadata.get('id_proof', '')
        }
        
        skill_record = {
            "code": emp_code,
            "name": invite['name'],
            "primary": employee_data.get('primary_skills'),
            "secondary": employee_data.get('secondary_skills'),
            "cv_path": file_metadata.get('cv', '')
        }
        
        # 3. Transaction
        self.repo.complete_onboarding_transaction(user_data, emp_record, skill_record)
        
        # 4. Close Invite
        self.repo.update_invite_status(token, 'Completed')
        
        # 5. Notify Admins for Approval
        add_notification(
            title="Onboarding Completed",
            message=f"{invite['name']} has completed onboarding and is awaiting approval for ID {user_data['employee_code']}.",
            n_type="AdminAlert"
        )
        
        return {"success": True, "message": "Onboarding completed successfully. Please login."}

    def get_pending_approvals(self):
        return self.repo.get_pending_approvals()

    def approve_onboarding(self, employee_code: str, approval_data: Dict[str, Any]):
        self.repo.approve_employee(employee_code, approval_data)
        
        from backend.modules.deploy.services.notification_service import NotificationService
        notif_service = NotificationService()
        notif_service.mark_relevant_as_read("Onboarding Completed", employee_code)

        return {"success": True, "message": f"Employee {employee_code} approved successfully"}
