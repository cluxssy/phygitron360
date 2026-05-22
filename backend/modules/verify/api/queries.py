"""
Phygitron 360 — Verify Module: Assessment Queries API
======================================================
Candidates raise disputes/appeals; HR manages resolution.
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from backend.core.database import get_db_connection
from backend.core.dependencies import get_current_user, require_permission

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/queries", tags=["Verify - Queries"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class QueryCreate(BaseModel):
    assessment_result_id: int
    subject: Optional[str] = None
    message: str


class QueryUpdate(BaseModel):
    status: Optional[str] = None     # open, resolved, closed
    response: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
async def list_queries(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission("verify.assessments.manage")),
):
    """HR view: list all candidate queries for the tenant."""
    tenant_id = current_user.get("tenant_id", "public")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            query = """
                SELECT q.*,
                       a.title AS assessment_title,
                       u.name AS candidate_name,
                       u.email AS candidate_email
                FROM assessment_queries q
                LEFT JOIN assessments a ON a.id = q.assessment_id
                LEFT JOIN users u ON u.id = q.user_id
            """
            params = []
            if status:
                query += " WHERE q.status = %s"
                params.append(status)
            query += " ORDER BY q.created_at DESC"
            cur.execute(query, params)
            rows = [dict(r) for r in cur.fetchall()]
        return {"success": True, "data": rows}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"list_queries failed: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        conn.close()


@router.post("")
async def create_query(
    body: QueryCreate,
    current_user: dict = Depends(get_current_user),
):
    """Candidate raises a query/appeal for one of their results."""
    tenant_id = current_user.get("tenant_id", "public")
    user_id = current_user["id"]
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')

            # Verify the result belongs to this user
            cur.execute(
                "SELECT id, assessment_id FROM assessment_results WHERE id = %s AND user_id = %s",
                (body.assessment_result_id, user_id),
            )
            result_row = cur.fetchone()
            if not result_row:
                raise HTTPException(
                    status_code=403,
                    detail="Result not found or you do not own this result"
                )

            cur.execute(
                """
                INSERT INTO assessment_queries
                    (assessment_id, assessment_result_id, user_id, subject, message, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, 'open', %s, %s)
                RETURNING id
                """,
                (
                    result_row["assessment_id"],
                    body.assessment_result_id,
                    user_id,
                    body.subject,
                    body.message,
                    datetime.utcnow(),
                    datetime.utcnow(),
                ),
            )
            new_id = cur.fetchone()["id"]
        conn.commit()
        return {"success": True, "message": "Query submitted", "data": {"id": new_id}}
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        conn.close()


@router.patch("/{query_id}")
async def respond_to_query(
    query_id: int,
    body: QueryUpdate,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission("verify.assessments.manage")),
):
    """HR responds to or closes a candidate query."""
    tenant_id = current_user.get("tenant_id", "public")
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute("SELECT id FROM assessment_queries WHERE id = %s", (query_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Query not found")

            updates: dict = {"updated_at": datetime.utcnow()}
            if body.status:
                updates["status"] = body.status
            if body.response is not None:
                updates["response"] = body.response

            set_clause = ", ".join(f"{k} = %s" for k in updates)
            cur.execute(
                f"UPDATE assessment_queries SET {set_clause} WHERE id = %s",
                list(updates.values()) + [query_id],
            )
        conn.commit()
        return {"success": True, "message": "Query updated"}
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        conn.close()


@router.get("/my")
async def my_queries(
    current_user: dict = Depends(get_current_user),
):
    """Candidate: list their own submitted queries."""
    tenant_id = current_user.get("tenant_id", "public")
    user_id = current_user["id"]
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                SELECT q.*, a.title AS assessment_title
                FROM assessment_queries q
                LEFT JOIN assessments a ON a.id = q.assessment_id
                WHERE q.user_id = %s
                ORDER BY q.created_at DESC
                """,
                (user_id,),
            )
            rows = [dict(r) for r in cur.fetchall()]
        return {"success": True, "data": rows}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        conn.close()
