from datetime import datetime, timedelta
import calendar
from typing import List, Dict, Any, Optional
from backend.modules.deploy.repositories.attendance_repo import AttendanceRepository
from backend.modules.deploy.services.notification_service import add_notification
from backend.modules.deploy.schemas.attendance import (
    ClockOutRequest, AttendanceStatus, LeaveBalance, LeaveRequest, EditAttendanceRequest
)

class AttendanceService:
    def __init__(self, tenant_id: str = 'public'):
        self.repo = AttendanceRepository()
        self.tenant_id = tenant_id

    def get_status(self, employee_code: str) -> AttendanceStatus:
        today = datetime.now().strftime('%Y-%m-%d')
        record = self.repo.get_todays_attendance(employee_code, today, self.tenant_id)
        
        if not record:
            return AttendanceStatus(status="not_started", data=None)
        
        # Convert dictionary to model-compatible dict if needed, 
        # but generic dict is fine for Pydantic if keys match.
        if record.get('clock_out'):
             return AttendanceStatus(status="completed", data=record)
        else:
             return AttendanceStatus(status="clocked_in", data=record)

    def clock_in(self, employee_code: str, ip_address: str):
        today = datetime.now().strftime('%Y-%m-%d')
        now = datetime.now().strftime('%H:%M:%S')
        
        existing = self.repo.get_todays_attendance(employee_code, today, self.tenant_id)
        if existing:
            raise ValueError("Already clocked in for today")
            
        self.repo.clock_in(employee_code, today, now, ip_address, self.tenant_id)
        return {"success": True, "message": "Clocked in successfully", "time": now}

    def clock_out(self, employee_code: str, data: ClockOutRequest):
        today = datetime.now().strftime('%Y-%m-%d')
        now = datetime.now().strftime('%H:%M:%S')
        
        record = self.repo.get_todays_attendance(employee_code, today, self.tenant_id)
        if not record:
             raise ValueError("No attendance record found for today. Please clock in first.")
        
        if record.get('clock_out'):
             raise ValueError("Already clocked out.")

        self.repo.clock_out(employee_code, today, now, data.work_log, self.tenant_id)
        return {"success": True, "message": "Clocked out successfully"}

    def get_history(self, employee_code: str):
        # 1. Fetch Attendance History
        history = self.repo.get_history(employee_code, tenant_id=self.tenant_id)
        for log in history:
            clock_in = log.get('clock_in')
            clock_out = log.get('clock_out')
            
            if clock_in and clock_out:
                try:
                    fmt = '%H:%M:%S'
                    t_in = datetime.strptime(clock_in, fmt)
                    t_out = datetime.strptime(clock_out, fmt)
                    duration_hours = (t_out - t_in).total_seconds() / 3600.0
                    
                    if duration_hours >= 9.0:
                        log['status'] = 'Present'
                    elif duration_hours >= 4.5:
                        log['status'] = 'Half Day'
                    else:
                        log['status'] = 'Absent'
                except:
                    log['status'] = 'Present'
            elif clock_in:
                 today_str = datetime.now().strftime('%Y-%m-%d')
                 if log['date'] != today_str:
                     log['status'] = 'Absent'
                 else:
                     log['status'] = 'Active'
            else:
                 log['status'] = 'Absent'

        # 2. Fetch and Merge Approved Leaves
        leaves = self.repo.get_employee_leaves(employee_code, self.tenant_id)
        for l in leaves:
            if l['status'] == 'Approved':
                # Note: This simple merge adds leave records to the list. 
                # In a more advanced view, we might merge them by date.
                history.append({
                    "date": l['start_date'],
                    "clock_in": "00:00:00",
                    "clock_out": "00:00:00",
                    "status": "Leave",
                    "work_log": f"Approved Leave: {l['reason']}"
                })
        
        # Re-sort by date
        history.sort(key=lambda x: x['date'], reverse=True)
        return history[:30]

    def get_leave_balance(self, employee_code: str) -> Dict[str, Any]:
        year = datetime.now().year
        balance = self.repo.get_leave_balance(employee_code, year, self.tenant_id)
        
        if not balance:
            self.repo.create_leave_balance(employee_code, year, self.tenant_id)
            balance = self.repo.get_leave_balance(employee_code, year, self.tenant_id)
            
        return balance

    def apply_leave(self, employee_code: str, req: LeaveRequest, user_role: str = 'Employee'):
        # 1. Date Validation
        try:
            d1 = datetime.strptime(req.start_date, '%Y-%m-%d')
            d2 = datetime.strptime(req.end_date, '%Y-%m-%d')
        except ValueError:
            raise ValueError("Invalid date format. Must be YYYY-MM-DD.")
            
        if d2 < d1:
            raise ValueError("End date cannot be earlier than the start date.")
            
        if d1.date() < datetime.now().date() and user_role not in ['org_admin', 'super_admin']:
             raise ValueError("You cannot apply for leaves in the past.")

        days = (d2 - d1).days + 1
        
        # 2. Status Determination
        status = 'Approved' if user_role in ['org_admin', 'super_admin'] else 'Pending'
        msg = "Leave auto-approved (Admin override)" if status == 'Approved' else "Leave application submitted successfully"
        
        # 3. Create Request
        self.repo.create_leave_request(employee_code, req.start_date, req.end_date, "Leave", req.reason, status, self.tenant_id)
        
        # 4. Immediate Balance Update for Admin
        if status == 'Approved':
            balance = self.get_leave_balance(employee_code)
            available = max(0, balance['total_leaves'] - balance['used_leaves'])
            used_delta = min(days, available)
            extended_delta = max(0, days - available)
            self.repo.update_leave_balance(employee_code, used_delta, extended_delta, self.tenant_id)
        else:
            add_notification(
                title="New Leave Request",
                message=f"Employee {employee_code} has applied for {days} days of leave.",
                n_type="AdminAlert",
                tenant_id=self.tenant_id
            )

        return {"success": True, "message": msg}

    def get_my_leaves(self, employee_code: str):
        return self.repo.get_employee_leaves(employee_code, self.tenant_id)

    def get_all_pending_leaves(self, admin_role: str, admin_code: Optional[str]):
        return self.repo.get_all_pending_leaves(admin_role, admin_code, self.tenant_id)

    def get_daily_log(self, date: Optional[str] = None):
        target_date = date or datetime.now().strftime('%Y-%m-%d')
        return self.repo.get_daily_log(target_date, self.tenant_id)

    def approve_reject_leave(self, leave_id: int, action: str, reason: Optional[str], admin_role: str, admin_code: Optional[str]):
        leave = self.repo.get_leave_by_id(leave_id, self.tenant_id)
        if not leave:
            raise ValueError("Leave request not found")

        # 1. Prevent Self-Approval
        if admin_code and leave['employee_code'] == admin_code:
            raise ValueError("You cannot approve your own leave request.")

        # 2. Hierarchy Check
        applicant_role = self.repo.get_user_role(leave['employee_code'], self.tenant_id)
        if applicant_role in ['org_admin', 'manager'] and admin_role not in ['org_admin', 'super_admin']:
             raise ValueError("Administrative leave requests can only be approved by an Organization Admin.")

        self.repo.update_leave_status(leave_id, action, reason, self.tenant_id)
        
        if action == 'Approved':
            # Calculate days
            try:
                d1 = datetime.strptime(leave['start_date'], '%Y-%m-%d')
                d2 = datetime.strptime(leave['end_date'], '%Y-%m-%d')
                days = (d2 - d1).days + 1
            except:
                days = 0

            # Calculate and Apply Balance Logic
            balance = self.get_leave_balance(leave['employee_code'])
            available = max(0, balance['total_leaves'] - balance['used_leaves'])
            used_delta = min(days, available)
            extended_delta = max(0, days - available)
            
            self.repo.update_leave_balance(leave['employee_code'], used_delta, extended_delta, self.tenant_id)
        
        # Mark the original request notification as read
        from backend.modules.deploy.services.notification_service import NotificationService
        notif_service = NotificationService()
        notif_service.mark_relevant_as_read("New Leave Request", leave['employee_code'])

        # Notify user about the decision
        add_notification(
            title=f"Leave {action}",
            message=f"Your {leave['leave_type']} leave request for {leave['start_date']} to {leave['end_date']} has been {action.lower()}.",
            employee_code=leave['employee_code'],
            n_type="Success" if action == 'Approved' else "Alert",
            tenant_id=self.tenant_id
        )

        return {"success": True, "message": f"Leave has been {action}"}

    def get_monthly_summary(self, year: int, month: int):
        employees = self.repo.get_all_active_employees_basic(self.tenant_id)
        
        num_days = calendar.monthrange(year, month)[1]
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year}-{month:02d}-{num_days}"
        
        attendance_rows = self.repo.get_monthly_attendance(start_date, end_date, self.tenant_id)
        leave_rows = self.repo.get_monthly_approved_leaves(start_date, end_date, self.tenant_id)
        
        # Process maps
        att_map = {}
        for row in attendance_rows:
            # Ensure code and date are normalized
            e_code = row['employee_code']
            if e_code not in att_map: att_map[e_code] = {}
            
            # Normalize date to string for robust matching
            d_val = row['date']
            d_str = d_val.strftime('%Y-%m-%d') if hasattr(d_val, 'strftime') else str(d_val)
            
            clock_in = row.get('clock_in')
            clock_out = row.get('clock_out')
            
            if clock_in and clock_out:
                try:
                    # Parse times to calculate duration
                    t_in = datetime.strptime(str(clock_in), '%H:%M:%S') if isinstance(clock_in, str) else datetime.combine(datetime.min, clock_in)
                    t_out = datetime.strptime(str(clock_out), '%H:%M:%S') if isinstance(clock_out, str) else datetime.combine(datetime.min, clock_out)
                    
                    duration_hours = (t_out - t_in).total_seconds() / 3600.0
                    
                    if duration_hours >= 9.0:
                        att_map[e_code][d_str] = 'Present'
                    elif duration_hours >= 4.5:
                        att_map[e_code][d_str] = 'Half Day'
                    else:
                        att_map[e_code][d_str] = 'Absent'
                except:
                    att_map[e_code][d_str] = 'Present' # Fallback
            elif clock_in:
                # Clocked in but not clocked out yet
                today_str = datetime.now().strftime('%Y-%m-%d')
                if d_str == today_str:
                    att_map[e_code][d_str] = 'Active'
                else:
                    # Forgot to clock out on a previous day
                    att_map[e_code][d_str] = 'Absent'
            else:
                 att_map[e_code][d_str] = 'Absent'
        leave_map = {}
        for row in leave_rows:
            code = row['employee_code']
            if code not in leave_map: leave_map[code] = {}
            
            try:
                d1 = datetime.strptime(row['start_date'], '%Y-%m-%d')
                d2 = datetime.strptime(row['end_date'], '%Y-%m-%d')
                
                month_start = datetime(year, month, 1)
                month_end = datetime(year, month, num_days)
                
                curr = max(d1, month_start)
                end = min(d2, month_end)
                
                while curr <= end:
                    d_str = curr.strftime('%Y-%m-%d')
                    leave_map[code][d_str] = 'Leave'
                    curr += timedelta(days=1)
            except:
                pass

        summary = []
        for emp in employees:
            code = emp['employee_code']
            days = []
            present_count = 0
            half_day_count = 0
            leave_count = 0
            absent_count = 0
            
            for day in range(1, num_days + 1):
                date_str = f"{year}-{month:02d}-{day:02d}"
                status = 'Absent'
                
                if code in leave_map and date_str in leave_map[code]:
                    status = 'Leave'
                    leave_count += 1
                elif code in att_map and date_str in att_map[code]:
                    status = att_map[code][date_str]
                    if status == 'Present' or status == 'Active':
                        present_count += 1
                    elif status == 'Half Day':
                        half_day_count += 1
                    elif status == 'Absent':
                        absent_count += 1
                else:
                    try:
                        dt = datetime(year, month, day)
                        dt_date = dt.date()
                        today_date = datetime.now().date()
                        
                        if dt.weekday() >= 5: 
                            status = 'Weekend'
                        elif dt_date > today_date:
                            status = 'Future'
                        elif dt_date == today_date:
                            status = 'Not Started' 
                        else:
                            status = 'Absent'
                            absent_count += 1
                    except:
                        pass
                
                days.append({"day": day, "status": status, "date": date_str})

            summary.append({
                "name": emp['name'],
                "code": code,
                "days": days,
                "stats": {"present": present_count, "half_day": half_day_count, "leave": leave_count, "absent": absent_count}
            })
            
        return summary

    def get_active_employees(self):
        return self.repo.get_all_active_employees_basic(self.tenant_id)

    def edit_attendance(self, req: EditAttendanceRequest):
        # 1. Determine Status based on duration
        status = 'Absent'
        if req.clock_in and req.clock_out:
            try:
                fmt = '%H:%M:%S'
                t_in = datetime.strptime(req.clock_in, fmt)
                t_out = datetime.strptime(req.clock_out, fmt)
                duration_hours = (t_out - t_in).total_seconds() / 3600.0
                
                if duration_hours >= 9.0:
                    status = 'Present'
                elif duration_hours >= 4.5:
                    status = 'Half Day'
                else:
                    status = 'Absent'
            except:
                status = 'Present' # Fallback
        elif req.clock_in:
            status = 'Present' # Currently active or single entry
        
        # 2. Update via Repo
        self.repo.upsert_attendance(
            req.employee_code, 
            req.date, 
            req.clock_in, 
            req.clock_out, 
            req.work_log, 
            status, 
            self.tenant_id
        )
        return {"success": True, "message": "Attendance record synchronized", "status": status}
