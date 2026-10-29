"""
Forge Module — Courses API
Prefix: /api/forge
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from pydantic import BaseModel, Field

from backend.core.dependencies import get_current_user, require_permission
from backend.core.permissions import P
from backend.modules.forge.repositories.course_repo import CourseRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forge", tags=["Forge - Courses"])


def get_course_repo(current_user: dict = Depends(get_current_user)) -> CourseRepository:
    return CourseRepository(tenant_id=current_user.get("tenant_id", "public"))


# ── Schemas ───────────────────────────────────────────────────────────────────

class CourseCreateIn(BaseModel):
    title: str
    description: Optional[str] = None
    difficulty: Optional[str] = "beginner"
    estimated_hours: Optional[float] = 1.0
    domain_id: Optional[int] = None
    category: Optional[str] = "General"
    is_scorm: Optional[bool] = True
    scorm_package_path: Optional[str] = None
    scorm_entry_url: Optional[str] = None
    scorm_version: Optional[str] = "1.2"
    scorm_mastery_score: Optional[float] = 70.0
    status: Optional[str] = "draft"
    is_featured: Optional[bool] = False
    thumbnail_url: Optional[str] = None
    target_skill_ids: Optional[List[Any]] = []


class CourseUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_hours: Optional[float] = None
    domain_id: Optional[int] = None
    category: Optional[str] = None
    scorm_mastery_score: Optional[float] = None
    status: Optional[str] = None
    is_featured: Optional[bool] = None
    thumbnail_url: Optional[str] = None
    scorm_entry_url: Optional[str] = None
    is_scorm: Optional[bool] = None


class ProgressSyncIn(BaseModel):
    progress_percent: Optional[float] = None
    status: Optional[str] = None
    score: Optional[float] = None
    scorm_location: Optional[str] = None
    scorm_suspend_data: Optional[str] = None


class AssignCourseIn(BaseModel):
    user_ids: Optional[List[int]] = []
    employee_ids: Optional[List[int]] = []
    deadline: Optional[datetime] = None


class BulkEnrollIn(BaseModel):
    course_id: int
    user_ids: List[int]
    deadline: Optional[datetime] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/dashboard")
@router.get("/my-learning")
def get_my_learning(
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Learner dashboard with stats, continue_learning, in_progress, assigned, and completed courses."""
    data = repo.get_my_learning(current_user["id"])
    return {"data": data, "message": "My learning retrieved successfully"}


@router.get("/transcript")
def get_transcript(
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Learner complete transcript history."""
    data = repo.get_transcript(current_user["id"])
    return {"data": data, "message": "Transcript retrieved successfully"}


@router.get("/library")
def get_library(
    q: Optional[str] = None,
    domain_id: Optional[int] = None,
    difficulty: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(18, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Course catalog with search, domain chips, and difficulty filter."""
    result = repo.list_courses(
        user_id=current_user["id"],
        q=q,
        domain_id=domain_id,
        difficulty=difficulty,
        page=page,
        limit=limit
    )
    return {"data": result, "message": "Library retrieved successfully"}


@router.get("/courses")
def list_courses(
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """List all courses for instructor / admin view."""
    courses = repo.list_all_courses()
    return {"data": courses, "message": "Courses retrieved successfully"}


@router.get("/courses/{course_id}")
def get_course(
    course_id: int,
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Course detail with sections, inline quizzes, and current user's enrollment."""
    course = repo.get_course_by_id(course_id, user_id=current_user["id"])
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"data": course, "message": "Course details retrieved successfully"}


@router.post("/courses", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def create_course(
    payload: CourseCreateIn,
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Create a new course (native or SCORM draft)."""
    data = payload.model_dump()
    data["instructor_id"] = current_user["id"]
    course = repo.create_course(data)
    return {"data": course, "message": "Course created successfully"}


@router.put("/courses/{course_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def update_course(
    course_id: int,
    payload: CourseUpdateIn,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Update course attributes."""
    course = repo.update_course(course_id, payload.model_dump(exclude_unset=True))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"data": course, "message": "Course updated successfully"}


@router.delete("/courses/{course_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def delete_course(
    course_id: int,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Delete a course."""
    success = repo.delete_course(course_id)
    return {"data": {"deleted": success}, "message": "Course deleted successfully"}


@router.post("/courses/{course_id}/publish", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def publish_course(
    course_id: int,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Publish a course to the library."""
    course = repo.publish_course(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"data": course, "message": "Course published successfully"}


@router.get("/my-courses")
def get_my_courses(
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Courses authored or managed by current instructor/admin."""
    courses = repo.my_courses(current_user["id"])
    return {"data": courses, "message": "My courses retrieved successfully"}


# ── SCORM / Learner Progress Sync ─────────────────────────────────────────────

@router.post("/courses/{course_id}/progress")
def sync_progress(
    course_id: int,
    body: ProgressSyncIn,
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """
    Real-time progress synchronization called by CoursePlayer postMessage bridge.
    Debounced auto-save for SCORM suspend_data, location, score, and completion.
    """
    enrollment = repo.get_or_create_enrollment(
        user_id=current_user["id"],
        course_id=course_id,
        triggered_by="manual"
    )

    update_data: Dict[str, Any] = {}
    current_progress = float(enrollment.get("progress_percent", 0) or 0)
    was_completed = enrollment.get("status") == "completed"

    if body.progress_percent is not None:
        new_pct = min(100.0, max(0.0, float(body.progress_percent)))
        # Only advance progress forward (never lose progress)
        if new_pct > current_progress:
            update_data["progress_percent"] = new_pct
        else:
            update_data["progress_percent"] = current_progress
    else:
        update_data["progress_percent"] = current_progress

    if body.scorm_location is not None:
        update_data["scorm_location"] = body.scorm_location
    if body.scorm_suspend_data is not None:
        update_data["scorm_suspend_data"] = body.scorm_suspend_data
    if body.score is not None:
        update_data["score"] = body.score

    # Status transition
    effective_progress = update_data.get("progress_percent", current_progress)
    raw_status = (body.status or "").lower()

    if raw_status in ("completed", "passed", "complete", "success") or effective_progress >= 100.0:
        update_data["status"] = "completed"
        update_data["progress_percent"] = 100.0
        if not was_completed:
            update_data["completed_at"] = datetime.utcnow()
            update_data["completion_date"] = datetime.utcnow()
    elif effective_progress > 0.0 and enrollment.get("status") in ("not_started", "enrolled"):
        update_data["status"] = "in_progress"

    update_data["last_accessed_at"] = datetime.utcnow()

    updated = repo.update_enrollment_progress(enrollment["id"], update_data)
    is_now_completed = updated.get("status") == "completed"

    # Issue certificate automatically on first completion
    if is_now_completed and not was_completed:
        repo.issue_certificate(current_user["id"], course_id, enrollment["id"])

    return {
        "data": {
            "enrollment_id": enrollment["id"],
            "progress_percent": float(updated.get("progress_percent", 0)),
            "status": updated.get("status"),
            "completed": is_now_completed,
            "scorm_location": updated.get("scorm_location")
        },
        "message": "Progress synced successfully"
    }


# ── Assignments & Enrollment ──────────────────────────────────────────────────

@router.get("/assignable-employees")
def get_assignable_employees(
    course_id: Optional[int] = None,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Active employees list with enrollment indicators for assigning training."""
    employees = repo.get_assignable_employees(course_id=course_id)
    return {"data": employees, "message": "Assignable employees retrieved successfully"}


@router.post("/courses/{course_id}/assign", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def assign_course(
    course_id: int,
    payload: AssignCourseIn,
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Assign course to selected employees."""
    uids = list(payload.user_ids or [])
    if payload.employee_ids and not uids:
        # Resolve employee IDs to user IDs
        conn = repo._set_path
        # Use bulk enroll with whatever IDs are provided
        uids = payload.employee_ids

    count = repo.bulk_enroll(
        course_id=course_id,
        user_ids=uids,
        assigned_by_id=current_user["id"],
        deadline=payload.deadline
    )
    return {"data": {"assigned": count}, "message": f"Course assigned to {count} learners"}


@router.post("/bulk-enroll", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def bulk_enroll(
    payload: BulkEnrollIn,
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    count = repo.bulk_enroll(
        course_id=payload.course_id,
        user_ids=payload.user_ids,
        assigned_by_id=current_user["id"],
        deadline=payload.deadline
    )
    return {"data": {"enrolled": count}, "message": f"Enrolled {count} learners"}


@router.post("/enroll")
def enroll_self(
    course_id: int = Query(...),
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Self-enroll into a course from the library."""
    enrollment = repo.get_or_create_enrollment(
        user_id=current_user["id"],
        course_id=course_id,
        triggered_by="manual"
    )
    return {"data": enrollment, "message": "Enrolled successfully"}


@router.get("/courses/{course_id}/enrollments")
def get_course_enrollments(
    course_id: int,
    repo: CourseRepository = Depends(get_course_repo)
):
    """View all learners enrolled in a course."""
    enrollments = repo.list_course_enrollments(course_id)
    return {"data": enrollments, "message": "Enrollments retrieved successfully"}


@router.get("/employee-courses/{employee_id}")
def get_employee_courses(
    employee_id: int,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Course list for employee profile view."""
    courses = repo.get_employee_courses(employee_id)
    return {"data": courses, "message": "Employee courses retrieved successfully"}
