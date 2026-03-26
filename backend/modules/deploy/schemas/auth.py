from pydantic import BaseModel
from typing import Optional, List, Literal

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    employee_code: Optional[str] = None
    is_active: bool

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: Literal['Admin', 'HR', 'Management', 'Employee']
    employee_code: Optional[str] = None
