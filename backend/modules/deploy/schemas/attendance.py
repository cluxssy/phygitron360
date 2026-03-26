from pydantic import BaseModel
from typing import Optional, List

# --- Request Schemas ---

class ClockOutRequest(BaseModel):
    work_log: str

class LeaveRequest(BaseModel):
    start_date: str
    end_date: str
    leave_type: str
    reason: str

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
    sick_total: int
    sick_used: int
    casual_total: int
    casual_used: int
    privilege_total: int
    privilege_used: int
