from pydantic import BaseModel
from typing import List, Optional

# --- Assessment Models ---
class AssessmentEntry(BaseModel):
    category: str
    subcategory: str
    self_score: int = 0
    manager_score: int = 0
    score: int = 0
    manager_comment: Optional[str] = ""
    employee_comment: Optional[str] = ""

class AssessmentQuarter(BaseModel):
    quarter: str # Q1, Q2, Q3, Q4
    status: str
    total_score: int
    percentage: float
    entries: List[AssessmentEntry]
    exists: bool = False

class SaveAssessmentRequest(BaseModel):
    employee_code: str
    year: int
    quarter: str
    entries: List[AssessmentEntry]
    status: str = "Draft"
