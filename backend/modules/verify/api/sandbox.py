import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from backend.modules.deploy.api.auth import get_current_user
from backend.modules.verify.services.sandbox_service import SandboxService
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/sandbox", tags=["Verify - Sandbox"])

class RunCodeRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = ""

def get_service():
    return SandboxService()

@router.post("/execute")
async def run_code(
    body: RunCodeRequest,
    current_user: dict = Depends(get_current_user),
    service: SandboxService = Depends(get_service)
):
    """Safely executes code in an isolated environment and returns stdout/stderr."""
    try:
        result = await service.execute_code_sandbox(body.language, body.code, body.stdin)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Sandbox execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
