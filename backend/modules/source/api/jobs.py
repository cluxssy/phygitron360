import logging
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from backend.modules.deploy.api.auth import get_current_user, require_role
from backend.modules.source.services.recruitment_service import RecruitmentService
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/source", tags=["Source - Jobs & Scoring"])

class JobRoleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    required_skills: Optional[list] = None
    min_experience: int = 0

class ScoreRequest(BaseModel):
    role_id: int
    candidate_ids: List[int]

class InviteRequest(BaseModel):
    candidate_id: int
    role_id: int

class ConvertRequest(BaseModel):
    candidate_id: int
    employee_code: str
    doj: str

def get_service(current_user: dict = Depends(get_current_user)):
    return RecruitmentService(tenant_id=current_user.get("tenant_id", "public"))

# --- Job Roles ---

@router.get("/job-roles")
def list_job_roles(service: RecruitmentService = Depends(get_service)):
    """Returns all available job roles."""
    roles = service.role_repo.get_all_job_roles()
    return {"success": True, "data": roles}

@router.post("/job-roles")
def create_job_role(
    body: JobRoleCreate,
    current_user: dict = Depends(require_role(["HR", "Admin", "org_admin", "super_admin"])),
    service: RecruitmentService = Depends(get_service)
):
    """Creates a new job role template."""
    role_id = service.role_repo.create_job_role(body.dict())
    return {"success": True, "data": {"id": role_id}}

@router.get("/job-roles/{role_id}/rankings")
def get_candidate_rankings(
    role_id: int,
    service: RecruitmentService = Depends(get_service)
):
    """Returns candidates ranked by AI scores for this specific job role."""
    rankings = service.get_candidate_rankings(role_id)
    return {"success": True, "data": rankings}

@router.post("/job-roles/{role_id}/auto-rank")
async def auto_rank_candidates(
    role_id: int,
    service: RecruitmentService = Depends(get_service)
):
    """Triggers bulk AI scoring for all candidates against this role."""
    result = await service.auto_rank_all_candidates(role_id)
    return result

# --- AI Scoring & Matching ---

@router.post("/score-candidates")
async def score_candidates(
    body: ScoreRequest,
    current_user: dict = Depends(require_role(["HR", "Admin", "org_admin", "super_admin"])),
    service: RecruitmentService = Depends(get_service)
):
    """Triggers AI fitment scoring for multiple candidates."""
    results = []
    for cid in body.candidate_ids:
        try:
            score_res = await service.score_candidate_fit(cid, body.role_id)
            results.append({"candidate_id": cid, "score": score_res.get("score")})
        except Exception as e:
            logger.error(f"Scoring failed for candidate {cid}: {e}")
            results.append({"candidate_id": cid, "error": str(e)})

    return {"success": True, "data": results}

# --- Actions & Conversion ---

@router.post("/send-invite")
def send_invite(
    body: InviteRequest,
    current_user: dict = Depends(require_role(["HR", "Admin", "org_admin", "super_admin"])),
    service: RecruitmentService = Depends(get_service)
):
    """Sends a talent-portal invitation to a candidate."""
    try:
        hr_id = current_user.get("id")
        result = service.send_invite(body.candidate_id, body.role_id, hr_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invite-status")
def get_invite_status(
    role_id: int = Query(...),
    current_user: dict = Depends(require_role(["HR", "Admin", "org_admin", "super_admin"])),
    service: RecruitmentService = Depends(get_service)
):
    """Fetches invitation and login status for a specific job role."""
    invites = service.role_repo.get_invites_by_role(role_id)
    return {"success": True, "data": invites}

@router.post("/convert-to-employee")
def convert_to_employee(
    body: ConvertRequest,
    current_user: dict = Depends(require_role(["HR", "Admin", "org_admin", "super_admin"])),
    service: RecruitmentService = Depends(get_service)
):
    """Converts a hired candidate into an HRMS employee record."""
    try:
        result = service.convert_candidate_to_employee(body.candidate_id, body.employee_code, body.doj)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
