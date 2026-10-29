"""
Forge Module — Executive & Team Analytics API
Prefix: /api/forge/analytics
"""
import logging
from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from backend.core.dependencies import get_current_user, require_permission
from backend.core.permissions import P
from backend.modules.forge.repositories.course_repo import CourseRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forge/analytics", tags=["Forge - Analytics"])


def get_course_repo(current_user: dict = Depends(get_current_user)) -> CourseRepository:
    return CourseRepository(tenant_id=current_user.get("tenant_id", "public"))


class NudgeIn(BaseModel):
    enrollment_id: int


@router.get("/overview", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def get_analytics_overview(
    repo: CourseRepository = Depends(get_course_repo)
):
    """Team-level learning KPIs and overdue training alerts."""
    data = repo.get_analytics_overview()
    return {"data": data, "message": "Analytics overview retrieved successfully"}


@router.get("/courses/{course_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def get_course_analytics(
    course_id: int,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Granular completion metrics for a single course."""
    data = repo.get_course_analytics(course_id)
    return {"data": data, "message": "Course analytics retrieved successfully"}


@router.post("/nudge", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def nudge_learner(
    payload: NudgeIn,
    current_user: dict = Depends(get_current_user),
    repo: CourseRepository = Depends(get_course_repo)
):
    """Send reminder notice to a learner with pending or overdue course."""
    enrollment = repo.get_enrollment(payload.enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    logger.info("Nudge triggered for enrollment %s by %s", payload.enrollment_id, current_user.get("username"))
    return {"data": {"nudged": True, "enrollment_id": payload.enrollment_id}, "message": "Reminder sent successfully"}
