from pydantic import BaseModel
from typing import Optional, List

# --- Request Schemas ---

class ClockInRequest(BaseModel):
    local_date: Optional[str] = None
    local_time: Optional[str] = None

class ClockOutRequest(BaseModel):
    work_log: str
    local_date: Optional[str] = None
    local_time: Optional[str] = None

class LeaveRequest(BaseModel):
    start_date: str
    end_date: str
    leave_type: str
    reason: str

class EditAttendanceRequest(BaseModel):
    employee_code: str
    date: str
    clock_in: Optional[str] = None
    clock_out: Optional[str] = None
    work_log: Optional[str] = None

class LeaveActionRequest(BaseModel):
    action: str
    reason: Optional[str] = None

# --- Response Schemas ---

class AttendanceRecord(BaseModel):
    id: int
    employee_code: str
    date: str
    clock_in: Optional[str]
    clock_out: Optional[str]
    work_log: Optional[str]
    status: str
    ip_address: Optional[str]

class LeaveRecord(BaseModel):
    id: int
    employee_code: str
    start_date: str
    end_date: str
    leave_type: str
    reason: str
    status: str
    rejection_reason: Optional[str]
    applied_at: str
    employee_name: Optional[str] = None # Enriched field

class AttendanceStatus(BaseModel):
    status: str
    data: Optional[AttendanceRecord] = None

class LeaveBalance(BaseModel):
    total_leaves: int
    used_leaves: int
    extended_leaves: int
