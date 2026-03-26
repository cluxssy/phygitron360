from typing import List, Dict, Any
from backend.modules.deploy.repositories.training_repo import TrainingRepository

class TrainingService:
    def __init__(self):
        self.repo = TrainingRepository()

    def get_programs(self):
        return self.repo.get_all_programs()

    def create_program(self, data: Dict[str, Any]):
        self.repo.create_program(data['program_name'], data.get('description'), data.get('default_duration'))
        return {"success": True, "message": "Training Program created successfully"}

    def assign_training(self, employee_codes: List[str], program_id: int, date: str, duration: str):
        prog = self.repo.get_program_by_id(program_id)
        prog_name = prog['program_name'] if prog else "Unknown Program"
        
        for code in employee_codes:
            self.repo.create_assignment(code, program_id, prog_name, date, duration)
            
        return {"success": True, "message": f"Assigned training to {len(employee_codes)} employees."}

    def get_assignments(self):
        return self.repo.get_all_assignments()

    def update_status(self, assignment_id: int, status: str):
        self.repo.update_assignment_status(assignment_id, status)
        return {"success": True, "message": "Updated status successfully"}
