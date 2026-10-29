"""
Forge Module — Domains / Categories API
Prefix: /api/forge/domains
"""
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.core.dependencies import get_current_user, require_permission
from backend.core.permissions import P
from backend.modules.forge.repositories.course_repo import CourseRepository

router = APIRouter(prefix="/api/forge/domains", tags=["Forge - Domains"])


def get_course_repo(current_user: dict = Depends(get_current_user)) -> CourseRepository:
    return CourseRepository(tenant_id=current_user.get("tenant_id", "public"))


class DomainIn(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#7C3AED"
    icon: Optional[str] = "Layers"


@router.get("")
def list_domains(
    repo: CourseRepository = Depends(get_course_repo)
):
    """List all course domains/categories."""
    domains = repo.list_domains()
    return {"data": domains, "message": "Domains retrieved successfully"}


@router.post("", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def create_domain(
    payload: DomainIn,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Create a new domain."""
    domain = repo.create_domain(payload.model_dump())
    return {"data": domain, "message": "Domain created successfully"}


@router.put("/{domain_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def update_domain(
    domain_id: int,
    payload: DomainIn,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Update domain attributes."""
    domain = repo.update_domain(domain_id, payload.model_dump(exclude_unset=True))
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    return {"data": domain, "message": "Domain updated successfully"}


@router.delete("/{domain_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def delete_domain(
    domain_id: int,
    repo: CourseRepository = Depends(get_course_repo)
):
    """Delete a domain."""
    success = repo.delete_domain(domain_id)
    return {"data": {"deleted": success}, "message": "Domain deleted successfully"}
