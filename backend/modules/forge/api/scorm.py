"""
Forge Module — SCORM Upload & Playback API
Prefix: /api/forge/scorm
"""
import os
import shutil
import tempfile
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, UploadFile, Query, HTTPException, status
from fastapi.responses import FileResponse

from backend.core.dependencies import get_current_user, require_permission
from backend.core.permissions import P
from backend.modules.forge.repositories.course_repo import CourseRepository
from backend.modules.forge.services.course_service import CourseService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forge/scorm", tags=["Forge - SCORM"])


def get_course_repo(current_user: dict = Depends(get_current_user)) -> CourseRepository:
    return CourseRepository(tenant_id=current_user.get("tenant_id", "public"))


def get_course_service(current_user: dict = Depends(get_current_user)) -> CourseService:
    return CourseService(tenant_id=current_user.get("tenant_id", "public"))


@router.post("/upload", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
async def upload_scorm(
    file: UploadFile = File(...),
    title: Optional[str] = Query(None),
    domain_id: Optional[int] = Query(None),
    difficulty: Optional[str] = Query("beginner"),
    category: Optional[str] = Query("General"),
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo),
    service: CourseService = Depends(get_course_service)
):
    """
    Upload a SCORM 1.2 or 2004 .zip package.
    Extracts the archive, parses manifest metadata, injects the runtime bridge,
    and publishes the course to the library.
    """
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip SCORM packages are supported")

    # 1. Create a placeholder course row to get the course_id
    initial_title = title.strip() if title and title.strip() else os.path.splitext(file.filename)[0]
    course = repo.create_course({
        "title": initial_title,
        "difficulty": difficulty or "beginner",
        "domain_id": domain_id,
        "category": category or "General",
        "instructor_id": current_user["id"],
        "is_scorm": True,
        "status": "draft"
    })
    course_id = course["id"]

    # 2. Save uploaded zip temporarily
    tmp_dir = tempfile.mkdtemp()
    tmp_zip_path = os.path.join(tmp_dir, file.filename)
    try:
        with open(tmp_zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 3. Extract, parse, and inject SCORM runtime shim
        meta = service.extract_and_parse_scorm(tmp_zip_path, course_id)

        # 4. Update course with manifest metadata
        final_title = title if (title and title.strip()) else meta.get("title", initial_title)
        updated_course = repo.update_course(course_id, {
            "title": final_title,
            "scorm_package_path": meta["package_path"],
            "scorm_entry_url": meta["scorm_entry_url"],
            "scorm_version": meta["scorm_version"],
            "scorm_mastery_score": meta["scorm_mastery_score"],
            "estimated_hours": meta["estimated_hours"],
            "status": "published",
            "is_scorm": True
        })
        return {"data": updated_course, "message": "SCORM course uploaded and extracted successfully"}

    except Exception as e:
        logger.exception("Failed to process SCORM upload: %s", e)
        repo.delete_course(course_id)
        raise HTTPException(status_code=400, detail=f"Failed to process SCORM package: {str(e)}")
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@router.get("/{course_id}/{file_path:path}")
async def serve_scorm_file(
    course_id: int,
    file_path: str,
    current_user: dict = Depends(get_current_user),
    service: CourseService = Depends(get_course_service)
):
    """
    Serve extracted SCORM package assets (HTML, JS, CSS, media) with path traversal security.
    """
    base_dir = Path(service.get_course_storage_dir(course_id)).resolve()
    target_path = (base_dir / file_path).resolve()

    # Prevent directory traversal attacks
    if not str(target_path).startswith(str(base_dir)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="SCORM resource not found")

    return FileResponse(
        str(target_path),
        headers={
            "Cache-Control": "no-cache",
            "X-Frame-Options": "SAMEORIGIN"
        }
    )
