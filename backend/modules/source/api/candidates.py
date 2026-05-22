"""
Phygitron 360 — Source Module: Candidates API
===============================================
Handles resume upload, candidate management, AI parsing, offer letter generation,
and ATS scoring for the Talent Vault (Source) module.
"""
import json
import os
import uuid
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os

from backend.core.database import DATA_DIR
from backend.core.dependencies import get_current_user, require_permission
from backend.modules.source.services.candidate_service import CandidateService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/source/candidates", tags=["Source - Candidates"])

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ManualCandidateCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    total_experience_years: float = 0
    current_designation: Optional[str] = None
    current_company: Optional[str] = None
    expected_salary: Optional[str] = None
    notice_period: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    skills: Optional[List[str]] = None


class StatusUpdate(BaseModel):
    status: str


class NoteCreate(BaseModel):
    content: str


class OfferPreviewRequest(BaseModel):
    salary: str
    role_title: str
    department: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None


class ConvertRequest(BaseModel):
    salary: str
    role_title: str
    department: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    offer_content: Optional[dict] = None


# ---------------------------------------------------------------------------
def get_candidate_service(user=Depends(get_current_user)):
    return CandidateService(tenant_id=user.get('tenant_id', 'public'))


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload")
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    service: CandidateService = Depends(get_candidate_service)
):
    """Upload a single resume PDF/DOCX/TXT and run AI parse pipeline."""
    allowed_exts = (".pdf", ".docx", ".doc", ".txt")
    if not file.filename.lower().endswith(allowed_exts):
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_exts)}")

    try:
        content = await file.read()
        result = await service.process_and_save_resume(content, file.filename)
        return {
            "success": True,
            "message": "Resume uploaded and parsed successfully",
            "data": result,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Resume upload failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(exc)}")


@router.post("/bulk-upload")
async def bulk_upload_resumes(
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user),
    service: CandidateService = Depends(get_candidate_service)
):
    """Process multiple resume files at once. Returns per-file status."""
    files_data = []
    for f in files:
        files_data.append((f.filename, await f.read()))
        
    result = await service.bulk_upload_resumes(files_data, user.get("id"))
    return {
        "success": True,
        "data": result,
        "message": f"Bulk upload complete: {len(result['succeeded'])} of {len(files)} processed"
    }


@router.post("/manual")
def create_manual_candidate(
    data: ManualCandidateCreate,
    current_user: dict = Depends(get_current_user),
    service: CandidateService = Depends(get_candidate_service)
):
    """Create a candidate record from a manual entry form (no resume)."""
    try:
        actor_name = current_user.get("name") or current_user.get("username")
        candidate_id = service.create_manual_candidate(data.dict(), actor_name)
        return {"success": True, "message": "Candidate created successfully", "data": {"candidate_id": candidate_id}}
    except Exception as exc:
        logger.error(f"Manual candidate creation failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to create candidate: {str(exc)}")


@router.get("/search")
def search_candidates(
    pool: Optional[str] = Query(None),          # all, candidate, trainee, employee
    location: Optional[str] = Query(None),
    min_exp: Optional[float] = Query(None),
    exp_range: Optional[str] = Query(None),     # fresher, 1-2, 2-5, 5+
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("newest"),   # newest, experience
    role_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=200),
    current_user: dict = Depends(get_current_user),
    service: CandidateService = Depends(get_candidate_service)
):
    """Advanced candidate search with optional ATS scoring against a job role."""
    try:
        results = service.search_candidates(
            pool=pool, location=location, min_exp=min_exp, exp_range=exp_range,
            search=search, sort_by=sort_by, role_id=role_id, limit=limit
        )
        return {"success": True, "data": results, "count": len(results)}
    except Exception as exc:
        logger.error(f"search_candidates failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/active")
def list_active_candidates(service: CandidateService = Depends(get_candidate_service)):
    """List active candidates (those that have first_login or employee-type status)."""
    try:
        rows = service.get_active_candidates()
        return {"success": True, "data": rows, "count": len(rows)}
    except Exception as exc:
        logger.error(f"Active candidates list failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{candidate_id}")
def get_candidate(
    candidate_id: int,
    role_id: Optional[int] = Query(None),
    service: CandidateService = Depends(get_candidate_service)
):
    """Full candidate profile with skills, notes, AI scores, and latest offer letter."""
    try:
        candidate = service.get_full_candidate_profile(candidate_id, role_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return {"success": True, "data": candidate}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"get_candidate failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{candidate_id}/resume")
def get_candidate_resume(
    candidate_id: int, 
    service: CandidateService = Depends(get_candidate_service)
):
    """Download the candidate's stored resume file."""
    candidate = service.get_candidate(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    row = candidate

    if not row or not row["resume_path"]:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_path = row["resume_path"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file missing from storage")

    return FileResponse(file_path, filename=os.path.basename(file_path))


@router.put("/{candidate_id}/status")
def update_status(
    candidate_id: int,
    body: StatusUpdate,
    current_user: dict = Depends(get_current_user),
    service: CandidateService = Depends(get_candidate_service)
):
    """Update a candidate's pipeline status."""
    updated = service.update_status(candidate_id, body.status)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")

    author = current_user.get("name") or current_user.get("username")
    service.repo.log_activity(candidate_id, author, "status_changed", f"Status changed to {body.status}")
    return {"success": True, "message": "Status updated successfully"}


@router.post("/{candidate_id}/notes")
def add_note(
    candidate_id: int,
    body: NoteCreate,
    current_user: dict = Depends(get_current_user),
    service: CandidateService = Depends(get_candidate_service)
):
    """Add a note to the candidate's timeline."""
    author = current_user.get("name") or current_user.get("username")
    note = service.add_note(candidate_id, author, body.content)
    return {"success": True, "data": note}


@router.post("/{candidate_id}/offer-preview")
async def offer_preview(
    candidate_id: int,
    body: OfferPreviewRequest,
    service: CandidateService = Depends(get_candidate_service)
):
    """
    Generate an AI offer letter preview for a candidate.
    Does NOT persist — returns content only.
    """
    hiring_details = {
        "role_title": body.role_title,
        "salary": body.salary,
        "department": body.department,
        "location": body.location,
        "start_date": body.start_date,
        "company": "Phygitron 360",
    }
    
    preview = await service.generate_offer_preview(candidate_id, hiring_details)
    if not preview:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return {"success": True, "data": {"offer_content": preview}}


@router.post("/{candidate_id}/convert")
async def convert_to_offer(
    candidate_id: int,
    body: ConvertRequest,
    service: CandidateService = Depends(get_candidate_service)
):
    """
    Create an offer letter (starts in 'pending' status).
    Moves candidate to 'Offered' status.
    """
    hiring_details = {
        "role_title": body.role_title,
        "salary": body.salary,
        "department": body.department,
        "location": body.location,
        "start_date": body.start_date
    }
    
    try:
        await service.convert_to_offer(candidate_id, hiring_details, body.offer_content)
        return {"success": True, "message": "Offer letter created"}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error(f"convert_to_offer failed for candidate {candidate_id}: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    current_user: dict = Depends(require_permission("source.candidates.manage")),
    service: CandidateService = Depends(get_candidate_service)
):
    """Permanently delete a candidate and all related records."""
    try:
        deleted = service.delete_candidate(candidate_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return {"success": True, "message": "Candidate deleted successfully"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"delete_candidate({candidate_id}) failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Employee revert (testing utility)
# ---------------------------------------------------------------------------

@router.post("/employees/{employee_id}/revert")
def revert_employee_to_candidate(
    employee_id: int,
    current_user: dict = Depends(require_permission("source.candidates.manage")),
    service: CandidateService = Depends(get_candidate_service)
):
    """
    Revert an employee back to candidate status.
    Testing/correction utility — restores candidate status to 'New' and clears employee link.
    """
    try:
        reverted = service.revert_employee(employee_id)
        if not reverted:
            raise HTTPException(status_code=404, detail="Candidate/employee not found")
        return {"success": True, "message": "Reverted to candidate status", "data": {"candidate_id": employee_id}}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
