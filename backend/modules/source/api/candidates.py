import os
import shutil
import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Query, Body
from fastapi.responses import FileResponse
from backend.modules.deploy.api.auth import get_current_user, require_role
from backend.modules.source.services.candidate_service import CandidateService
from backend.modules.source.schemas.candidates import CandidateStatusUpdate, CandidateNoteCreate, CandidateCreate, CandidateSearchFilters
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/source/candidates", tags=["Source - Candidates"])

def get_service(current_user: dict = Depends(get_current_user)):
    tenant_id = current_user.get("tenant_id", "public")
    return CandidateService(tenant_id=tenant_id)

# --- Upload & Creation ---

@router.post("/upload")
async def upload_and_parse_resume(
    file: UploadFile = File(...), 
    service: CandidateService = Depends(get_service)
):
    """
    1. Uploads a resume file (PDF/DOCX/TXT)
    2. Extracts text
    3. Runs AI ResumeParser
    4. Saves to database with structured skills
    """
    if not file.filename.lower().endswith((".pdf", ".docx", ".txt")):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOCX, and TXT are allowed.")

    try:
        content = await file.read()
        result = await service.process_and_save_resume(content, file.filename)
        
        return {
            "status": "success",
            "message": "Resume parsed and saved successfully!",
            "candidate_id": result["candidate_id"],
            "parsed_data": result["parsed_data"]
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Process failed: {str(e)}")

@router.post("/bulk-upload")
async def bulk_upload_resumes(
    files: List[UploadFile] = File(...),
    service: CandidateService = Depends(get_service)
):
    """Processes multiple resumes at once."""
    succeeded = []
    failed = []
    skipped = []

    for file in files:
        filename = file.filename
        if not filename.lower().endswith((".pdf", ".docx", ".txt")):
            skipped.append(filename)
            continue
        
        try:
            content = await file.read()
            result = await service.process_and_save_resume(content, filename)
            succeeded.append({
                "filename": filename,
                "candidate_id": result["candidate_id"],
                "full_name": result["parsed_data"].get("full_name")
            })
        except Exception as e:
            failed.append({"filename": filename, "error": str(e)})

    return {
        "status": "complete",
        "succeeded": succeeded,
        "failed": failed,
        "skipped": skipped,
        "summary": f"{len(succeeded)} uploaded, {len(failed)} failed, {len(skipped)} skipped"
    }

@router.post("/manual")
async def create_manual_candidate(
    data: CandidateCreate,
    service: CandidateService = Depends(get_service)
):
    """Creates a new candidate from a manual entry form."""
    try:
        candidate_id = service.create_manual_candidate(data.dict())
        return {"status": "success", "message": "Candidate created successfully", "candidate_id": candidate_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create candidate: {str(e)}")

# --- Retrieval & Search ---

@router.get("/")
async def list_candidates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    service: CandidateService = Depends(get_service)
):
    """Returns a paginated list of all candidates."""
    try:
        result = service.get_all_candidates(page=page, page_size=page_size)
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/search")
def search_candidates(
    search: str = Query(None),
    status: str = Query(None),
    service: CandidateService = Depends(get_service)
):
    """Simple search with filters."""
    filters = {"search": search, "status": status}
    results = service.repo.search_candidates(filters)
    return {"status": "success", "data": results}

@router.post("/advanced-search")
async def advanced_search(
    filters: CandidateSearchFilters,
    service: CandidateService = Depends(get_service)
):
    """Advanced filtering (skills, experience, etc.)"""
    try:
        results = service.search_candidates(filters.dict(exclude_none=True))
        return {"status": "success", "data": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

# --- Profile Management ---

@router.get("/{candidate_id}")
async def get_candidate(candidate_id: int, service: CandidateService = Depends(get_service)):
    """Returns full profile with skills and notes."""
    try:
        candidate = service.get_candidate(candidate_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return {"status": "success", "data": candidate}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{candidate_id}/resume")
async def get_candidate_resume(candidate_id: int, service: CandidateService = Depends(get_service)):
    """Downloads or views the candidate's uploaded resume."""
    try:
        candidate = service.get_candidate(candidate_id)
        if not candidate or not candidate.get("resume_path"):
            raise HTTPException(status_code=404, detail="Resume not found")
        
        file_path = candidate["resume_path"]
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Resume file missing from storage")
            
        return FileResponse(file_path, filename=os.path.basename(file_path))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{candidate_id}/status")
async def update_status(
    candidate_id: int, 
    update_data: CandidateStatusUpdate,
    current_user: dict = Depends(get_current_user),
    service: CandidateService = Depends(get_service)
):
    """Updates status and logs activity."""
    try:
        success = service.update_status(candidate_id, update_data.status)
        if not success:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Log activity
        author = current_user.get("name") or current_user.get("username")
        service.repo.log_activity(candidate_id, author, 'status_changed', f'Status changed to {update_data.status}')
        
        return {"status": "success", "message": "Status updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{candidate_id}/notes")
async def add_note(
    candidate_id: int, 
    note_data: CandidateNoteCreate,
    current_user: dict = Depends(get_current_user),
    service: CandidateService = Depends(get_service)
):
    """Adds a note to the candidate's activity log."""
    try:
        author = current_user.get("name") or current_user.get("username")
        note = service.add_note(candidate_id, author, note_data.content)
        return {"status": "success", "data": note}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: int, 
    current_user: dict = Depends(require_role(["HR", "Admin", "Superadmin", "org_admin", "super_admin"])),
    service: CandidateService = Depends(get_service)
):
    """Permanently removes a candidate record."""
    try:
        success = service.repo.delete_candidate(candidate_id)
        if not success:
            raise HTTPException(status_code=404, detail="Candidate not found")
        return {"status": "success", "message": "Candidate deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
