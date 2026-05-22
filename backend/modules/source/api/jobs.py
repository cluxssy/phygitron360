"""
Phygitron 360 — Source Module: Jobs & Scoring API
===================================================
Job roles management, ATS scoring, candidate invite workflow,
and invite tracking for the Talent Vault (Source) module.
"""
import json
import logging
import secrets
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

from backend.core.dependencies import get_current_user, require_permission
from backend.modules.source.services.job_service import JobService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/source", tags=["Source - Jobs & Scoring"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class JobRoleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    required_skills: Optional[list] = None
    min_experience: int = 0


class JobRoleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[list] = None
    min_experience: Optional[int] = None


class ScoreRequest(BaseModel):
    role_id: int
    candidate_ids: List[int]


class InviteRequest(BaseModel):
    candidate_ids: List[int]
    job_role_id: int
    deadline: Optional[str] = None
    email_addresses: Optional[List[str]] = None


# ---------------------------------------------------------------------------
# Job Roles
# ---------------------------------------------------------------------------

def get_job_service(user=Depends(get_current_user)):
    return JobService(tenant_id=user.get('tenant_id', 'public'))

@router.get("/job-roles")
def list_job_roles(service: JobService = Depends(get_job_service)):
    """List all job roles for this tenant."""
    roles = service.get_all_job_roles()
    return {"success": True, "data": roles}


@router.post("/job-roles")
async def create_job_role(
    body: JobRoleCreate,
    service: JobService = Depends(get_job_service),
):
    """
    Create a new job role.
    If description is provided but no required_skills, attempts AI skill extraction.
    """
    role_id = await service.create_job_role({
        "title": body.title,
        "description": body.description,
        "required_skills": body.required_skills or [],
        "min_experience": body.min_experience,
    })
    return {"success": True, "message": "Job role created", "data": {"id": role_id}}


@router.put("/job-roles/{role_id}")
def update_job_role(
    role_id: int,
    body: JobRoleUpdate,
    service: JobService = Depends(get_job_service),
):
    """Update an existing job role."""
    updates = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.required_skills is not None:
        import json
        updates["required_skills"] = json.dumps(body.required_skills)
    if body.min_experience is not None:
        updates["min_experience"] = body.min_experience

    updated = service.update_job_role(role_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Job role not found")

    return {"success": True, "message": "Job role updated", "data": {"id": role_id}}


@router.delete("/job-roles/{role_id}")
def delete_job_role(
    role_id: int,
    current_user: dict = Depends(require_permission("source.jobs.manage")),
    service: JobService = Depends(get_job_service)
):
    """Delete a single job role with cascade on invites and ai_scores."""
    deleted = service.delete_job_role(role_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Job role not found")
    return {"success": True, "message": "Job role deleted"}


@router.delete("/job-roles")
def delete_all_job_roles(
    current_user: dict = Depends(require_permission("source.jobs.manage")),
    service: JobService = Depends(get_job_service)
):
    """Delete ALL job roles for this tenant (with cascade)."""
    service.delete_all_job_roles()
    return {"success": True, "message": "All job roles deleted"}


@router.get("/job-roles/{role_id}/rankings")
def get_candidate_rankings(
    role_id: int,
    service: JobService = Depends(get_job_service)
):
    """Get candidates ranked by AI score for a specific job role."""
    rankings = service.get_candidate_rankings(role_id)
    return {"success": True, "data": rankings}


@router.post("/job-roles/{role_id}/auto-rank")
async def auto_rank_candidates(
    role_id: int,
    current_user: dict = Depends(require_permission("source.jobs.manage")),
    service: JobService = Depends(get_job_service)
):
    """
    Trigger bulk ATS scoring for ALL candidates against a specific role.
    Upserts scores into ai_scores table.
    """
    try:
        results = service.auto_rank_candidates(role_id)
        return {
            "success": True,
            "message": f"Scored {len(results)} candidates",
            "data": results,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as exc:
        logger.error(f"auto_rank({role_id}) failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Score selected candidates
# ---------------------------------------------------------------------------

@router.post("/score-candidates")
def score_candidates(
    body: ScoreRequest,
    current_user: dict = Depends(require_permission("source.jobs.manage")),
    service: JobService = Depends(get_job_service)
):
    """
    Run ATS role-fit scoring for selected candidates against a role.
    Upserts results into ai_scores table.
    """
    try:
        results = service.score_selected_candidates(body.role_id, body.candidate_ids)
        return {"success": True, "data": results}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Invite workflow
# ---------------------------------------------------------------------------

@router.post("/send-invite", dependencies=[Depends(require_permission("source.jobs.manage"))])
def send_invites(
    body: InviteRequest,
    current_user: dict = Depends(get_current_user),
    service: JobService = Depends(get_job_service)
):
    """
    Send talent-portal invitations to a list of candidates for a job role.
    Generates temp credentials, inserts candidate_invite row, and emails (best-effort).
    """
    hr_id = current_user.get("id")
    try:
        result = service.send_invites(
            role_id=body.job_role_id,
            hr_id=hr_id,
            candidate_ids=body.candidate_ids,
            email_addresses=body.email_addresses,
            deadline=body.deadline
        )
        return {
            "success": True,
            "message": f"Invites sent to {result['sent']} candidate(s)",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/invite-status/{job_role_id}", dependencies=[Depends(require_permission("source.jobs.manage"))])
def get_invite_status(
    job_role_id: int,
    service: JobService = Depends(get_job_service)
):
    """Get invite tracking details (sent/opened/logged_in timestamps) for a role."""
    try:
        invites = service.get_invite_status(job_role_id)
        return {"success": True, "data": invites}
    except Exception as exc:
        logger.error(f"get_invite_status({job_role_id}) failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
