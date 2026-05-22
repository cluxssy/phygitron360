"""
Verify Module — Assignment API
================================
Handles assigning assessments to users and listing candidates.
Prefix: /api/verify/assignments
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from backend.core.database import get_db_connection
from backend.core.dependencies import get_current_user, require_permission
from backend.common.services.ai.agents import AIAgents

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/assignments", tags=["Verify - Assignments"])

# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------

def _db(tenant_id: str):
    conn = get_db_connection()
    conn.cursor().execute(f'SET search_path TO "{tenant_id}"')
    return conn

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AssignRequest(BaseModel):
    user_ids: List[int]
    deadline: Optional[str] = None          # ISO date string
    generate_variants: bool = False

# ---------------------------------------------------------------------------
# Background: generate and persist AI variants per user
# ---------------------------------------------------------------------------

async def _generate_variants_background(
    tenant_id: str,
    asm_id: int,
    user_ids: List[int],
    questions: List[Dict[str, Any]],
):
    """Called as a background task — generates unique question variants per user and stores them."""
    ai = AIAgents()
    system_prompt = """You are an assessment anti-cheating AI.
Rewrite each question with different wording (same concept and difficulty).
For MCQ questions, shuffle the options but keep correct_answer pointing to the correct content.
Respond ONLY with valid JSON: {"questions": [ ...reworded questions... ]}"""

    for user_id in user_ids:
        try:
            prompt = f"Randomize these questions for user {user_id}:\n{json.dumps(questions, default=str)}"
            result = await ai.ai.generate_json(prompt, system_prompt)
            variant_questions = result.get("questions", questions)

            conn = _db(tenant_id)
            try:
                with conn.cursor() as cur:
                    cur.execute(f'SET search_path TO "{tenant_id}"')
                    cur.execute(
                        """
                        UPDATE assessment_assignments
                        SET custom_questions = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE assessment_id = %s AND user_id = %s
                        """,
                        (json.dumps(variant_questions), asm_id, user_id),
                    )
                    conn.commit()
            finally:
                conn.close()
        except Exception as e:
            logger.error(f"Variant generation failed for user {user_id}: {e}")

# ---------------------------------------------------------------------------
# 1. GET /my-tests — list assessments assigned to current user
# ---------------------------------------------------------------------------

@router.get("/my-tests")
def list_my_tests(
    current_user: dict = Depends(get_current_user),
):
    """List all assessments assigned to the logged-in user."""
    tenant_id = current_user["tenant_id"]
    user_id = current_user["id"]

    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                SELECT
                    aa.id              AS assignment_id,
                    aa.assessment_id,
                    a.title,
                    a.description,
                    a.time_limit_minutes,
                    aa.deadline,
                    aa.status,
                    a.show_result_immediately,
                    aa.started_at,
                    aa.created_at      AS assigned_at
                FROM assessment_assignments aa
                JOIN assessments a ON a.id = aa.assessment_id
                WHERE aa.user_id = %s
                  AND a.is_deleted = FALSE
                ORDER BY aa.created_at DESC
                """,
                (user_id,),
            )
            rows = [dict(r) for r in cur.fetchall()]
        return {"success": True, "data": rows}
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 2. POST /{asm_id}/assign — bulk assign users to an assessment
# ---------------------------------------------------------------------------

@router.post("/{asm_id}/assign")
async def assign_assessment(
    asm_id: int,
    body: AssignRequest,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
):
    """Bulk-assign users to an assessment. Optionally generates AI variants."""
    tenant_id = current_user["tenant_id"]
    assigned_by = current_user["id"]

    conn = _db(tenant_id)
    assigned_count = 0
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')

            # Verify assessment exists
            cur.execute(
                "SELECT id FROM assessments WHERE id = %s AND is_deleted = FALSE",
                (asm_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Assessment not found")

            for uid in body.user_ids:
                # Check existing assignment
                cur.execute(
                    "SELECT id, status FROM assessment_assignments WHERE assessment_id = %s AND user_id = %s",
                    (asm_id, uid),
                )
                existing = cur.fetchone()
                if existing:
                    # Re-activate: reset to pending
                    cur.execute(
                        """
                        UPDATE assessment_assignments
                        SET status = 'pending', deadline = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE assessment_id = %s AND user_id = %s
                        """,
                        (body.deadline, asm_id, uid),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO assessment_assignments
                            (assessment_id, user_id, assigned_by, deadline, status)
                        VALUES (%s, %s, %s, %s, 'pending')
                        """,
                        (asm_id, uid, assigned_by, body.deadline),
                    )
                    assigned_count += 1

            conn.commit()

        # Best-effort email notification
        try:
            from backend.core.email_service_extended import send_assessment_notification_email
            for uid in body.user_ids:
                send_assessment_notification_email(uid, asm_id, tenant_id)
        except Exception as e:
            logger.warning(f"Assessment notification email failed (non-blocking): {e}")

        # Background AI variant generation
        if body.generate_variants:
            # Fetch questions for this assessment
            q_conn = _db(tenant_id)
            try:
                with q_conn.cursor(cursor_factory=RealDictCursor) as qcur:
                    qcur.execute(f'SET search_path TO "{tenant_id}"')
                    qcur.execute(
                        "SELECT * FROM assessment_questions WHERE assessment_id = %s ORDER BY order_index",
                        (asm_id,),
                    )
                    questions = [dict(r) for r in qcur.fetchall()]
            finally:
                q_conn.close()

            if questions:
                asyncio.create_task(
                    _generate_variants_background(tenant_id, asm_id, body.user_ids, questions)
                )

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"assign_assessment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    return {
        "success": True,
        "data": {"assigned": assigned_count, "total_requested": len(body.user_ids)},
        "message": f"Assessment assigned to {len(body.user_ids)} user(s)",
    }

# ---------------------------------------------------------------------------
# 3. GET /{asm_id}/candidates — list assigned candidates with status
# ---------------------------------------------------------------------------

@router.get("/{asm_id}/candidates")
def list_candidates(
    asm_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
):
    """List all users assigned to an assessment along with their status."""
    tenant_id = current_user["tenant_id"]
    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                SELECT
                    aa.id              AS assignment_id,
                    u.id               AS user_id,
                    e.name,
                    u.username         AS email,
                    aa.status,
                    aa.deadline,
                    aa.started_at,
                    aa.created_at      AS assigned_at
                FROM assessment_assignments aa
                JOIN users u ON u.id = aa.user_id
                LEFT JOIN employees e ON e.employee_code = u.employee_code
                WHERE aa.assessment_id = %s
                ORDER BY aa.created_at DESC
                """,
                (asm_id,),
            )
            rows = [dict(r) for r in cur.fetchall()]
        return {"success": True, "data": rows}
    finally:
        conn.close()
