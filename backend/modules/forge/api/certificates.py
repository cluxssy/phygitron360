"""
Forge Module — Certificates API
Prefix: /api/forge
"""
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException

from backend.core.dependencies import get_current_user
from backend.modules.forge.repositories.course_repo import CourseRepository

router = APIRouter(prefix="/api/forge", tags=["Forge - Certificates"])


def get_course_repo(current_user: dict = Depends(get_current_user)) -> CourseRepository:
    return CourseRepository(tenant_id=current_user.get("tenant_id", "public"))


def get_public_course_repo() -> CourseRepository:
    return CourseRepository(tenant_id="public")


@router.get("/certificates/{user_id}")
def get_user_certificates(
    user_id: int,
    repo: CourseRepository = Depends(get_course_repo)
):
    """List certificates earned by user."""
    certs = repo.get_user_certificates(user_id)
    return {"data": certs, "message": "Certificates retrieved successfully"}


@router.get("/verify-certificate/{code}")
def verify_certificate(
    code: str,
    repo: CourseRepository = Depends(get_public_course_repo)
):
    """
    Public endpoint: verify certificate authenticity via verification code.
    No login required.
    """
    cert = repo.verify_certificate(code)
    if not cert:
        raise HTTPException(status_code=404, detail="Invalid or expired certificate code")
    return {"data": cert, "message": "Certificate verified successfully"}
