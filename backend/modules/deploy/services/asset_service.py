from typing import Dict, Any, List
from backend.modules.deploy.repositories.asset_repo import AssetRepository

class AssetService:
    def __init__(self):
        self.repo = AssetRepository()

    def get_checklist(self, employee_code: str) -> Dict[str, Any]:
        result = self.repo.get_asset_checklist(employee_code)
        
        if result:
            return result
        else:
            # Default
            ob_pf = 0
            ob_mediclaim = 0
            
            emp_defaults = self.repo.get_employee_defaults(employee_code)
            if emp_defaults:
                pf = emp_defaults['pf_included']
                med = emp_defaults['mediclaim_included']
                if pf and str(pf).lower() in ['yes', 'true', '1', 'on']: ob_pf = 1
                if med and str(med).lower() in ['yes', 'true', '1', 'on']: ob_mediclaim = 1
            
            return {
                "employee_code": employee_code,
                "ob_pf": ob_pf,
                "ob_mediclaim": ob_mediclaim
            }

    def upsert_checklist(self, employee_code: str, data: Dict[str, Any]):
        if self.repo.check_exists(employee_code):
            self.repo.update_asset_checklist(employee_code, data)
        else:
            self.repo.create_asset_checklist(employee_code, data)
        
        return {"success": True, "message": "Checklist updated successfully"}
