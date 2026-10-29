"""
Forge Module — Learning Journeys API
Chains Verify Assessments and Forge Courses into sequenced career/upskilling paths.
Prefixes: /api/journey
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from backend.core.dependencies import get_current_user, require_permission
from backend.core.permissions import P
from backend.modules.forge.repositories.journey_repo import JourneyRepository

router = APIRouter(prefix="/api/journey", tags=["Learning Journeys"])


def get_journey_repo(current_user: dict = Depends(get_current_user)) -> JourneyRepository:
    return JourneyRepository(tenant_id=current_user.get("tenant_id", "public"))


class JourneyStepIn(BaseModel):
    type: str  # 'verify' or 'forge'
    reference_id: int
    title: Optional[str] = None
    order_index: Optional[int] = 0


class JourneyCreateIn(BaseModel):
    title: str
    description: Optional[str] = None
    steps: Optional[List[JourneyStepIn]] = []


class JourneyUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    steps: Optional[List[JourneyStepIn]] = None


class AssignJourneyIn(BaseModel):
    user_ids: Optional[List[int]] = None
    employee_ids: Optional[List[int]] = None
    deadline: Optional[datetime] = None


@router.post("/journeys", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def create_journey(
    payload: JourneyCreateIn,
    current_user: dict = Depends(get_current_user),
    repo: JourneyRepository = Depends(get_journey_repo)
):
    """Create a new learning journey path."""
    steps = [s.model_dump() for s in payload.steps] if payload.steps else []
    journey = repo.create_journey(
        title=payload.title,
        description=payload.description,
        created_by=current_user["id"],
        steps=steps
    )
    return {"data": journey, "message": "Journey created successfully"}


@router.get("/journeys")
def list_journeys(
    repo: JourneyRepository = Depends(get_journey_repo)
):
    """List all created learning journeys."""
    journeys = repo.list_journeys()
    return {"data": journeys, "message": "Journeys retrieved successfully"}


@router.get("/journeys/{journey_id}")
def get_journey(
    journey_id: int,
    repo: JourneyRepository = Depends(get_journey_repo)
):
    """Fetch a journey and its resolved steps."""
    journey = repo.get_journey(journey_id)
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return {"data": journey, "message": "Journey details retrieved successfully"}


@router.patch("/journeys/{journey_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
@router.put("/journeys/{journey_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def update_journey(
    journey_id: int,
    payload: JourneyUpdateIn,
    repo: JourneyRepository = Depends(get_journey_repo)
):
    """Update a journey and re-sequence steps."""
    steps = [s.model_dump() for s in payload.steps] if payload.steps is not None else None
    journey = repo.update_journey(
        journey_id=journey_id,
        title=payload.title,
        description=payload.description,
        steps=steps
    )
    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")
    return {"data": journey, "message": "Journey updated successfully"}


@router.delete("/journeys/{journey_id}", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def delete_journey(
    journey_id: int,
    repo: JourneyRepository = Depends(get_journey_repo)
):
    """Delete a journey."""
    repo.delete_journey(journey_id)
    return {"data": {"deleted": True}, "message": "Journey deleted successfully"}


@router.post("/journeys/{journey_id}/assign", dependencies=[Depends(require_permission(P.FORGE_COURSES_MANAGE))])
def assign_journey(
    journey_id: int,
    payload: AssignJourneyIn,
    current_user: dict = Depends(get_current_user),
    repo: JourneyRepository = Depends(get_journey_repo)
):
    """Assign journey to learners (auto-assigns all underlying assessments and courses)."""
    count = repo.assign_journey(
        journey_id=journey_id,
        user_ids=payload.user_ids,
        employee_ids=payload.employee_ids,
        assigned_by_id=current_user["id"],
        deadline=payload.deadline
    )
    return {"data": {"assigned": count}, "message": f"Journey assigned to {count} users"}


@router.get("/my-journeys")
def get_my_journeys(
    current_user: dict = Depends(get_current_user),
    repo: JourneyRepository = Depends(get_journey_repo)
):
    """Learner view: assigned journeys with step-by-step completion tracking."""
    journeys = repo.get_my_journeys(current_user["id"])
    return {"data": journeys, "message": "My journeys retrieved successfully"}
