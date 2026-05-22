"""
Verify Module — Submissions API
=================================
Handles assessment submissions, background grading, results, analytics, leaderboard.
Prefix: /api/verify/submissions
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from backend.core.database import get_db_connection
from backend.core.dependencies import get_current_user, require_permission
from backend.common.services.ai.agents import AIAgents

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/submissions", tags=["Verify - Submissions"])

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

class SubmitRequest(BaseModel):
    assessment_id: int
    answers: Dict[str, Any]                         # {question_id: answer}
    time_taken_seconds: Optional[int] = None
    proctoring_events: List[Dict[str, Any]] = []
    is_malpractice: bool = False

# ---------------------------------------------------------------------------
# Background grading task
# ---------------------------------------------------------------------------

async def _background_grade(
    tenant_id: str,
    result_id: int,
    assessment_id: int,
    user_id: int,
    answers: Dict[str, Any],
):
    """Runs asynchronously after submission — grades all questions and updates results."""
    try:
        conn = _db(tenant_id)
        questions = []
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f'SET search_path TO "{tenant_id}"')
                cur.execute(
                    "SELECT * FROM assessment_questions WHERE assessment_id = %s ORDER BY order_index",
                    (assessment_id,),
                )
                questions = [dict(r) for r in cur.fetchall()]
                cur.execute(
                    "SELECT pass_score FROM assessments WHERE id = %s",
                    (assessment_id,),
                )
                asm_row = cur.fetchone()
                pass_score = float(asm_row["pass_score"]) if asm_row else 70.0
        finally:
            conn.close()

        total_marks = 0.0
        earned_marks = 0.0
        scores_per_q: Dict[str, Any] = {}
        ai = AIAgents()

        for q in questions:
            qid = str(q["id"])
            candidate_answer = answers.get(qid, "")
            marks = float(q.get("marks") or 1.0)
            total_marks += marks
            q_type = (q.get("question_type") or "").lower()
            score = 0.0

            if q_type == "mcq":
                ca = str(q.get("correct_answer") or "").strip().upper()
                ans = str(candidate_answer).strip().upper()
                score = marks if ans == ca else 0.0

            elif q_type == "mcq_multi":
                correct_set = set(
                    s.strip().upper()
                    for s in str(q.get("correct_answer") or "").split(",")
                    if s.strip()
                )
                if isinstance(candidate_answer, list):
                    ans_set = {str(a).strip().upper() for a in candidate_answer}
                else:
                    ans_set = {str(candidate_answer).strip().upper()}
                score = marks if ans_set == correct_set else 0.0

            elif q_type == "coding":
                try:
                    from backend.modules.verify.services.sandbox_service import SandboxService
                    svc = SandboxService()
                    lang = q.get("programming_language") or "python"
                    code = str(candidate_answer)
                    tc_raw = q.get("test_cases") or []
                    test_cases = tc_raw if isinstance(tc_raw, list) else json.loads(tc_raw or "[]")
                    sandbox_result = await svc.execute_code_sandbox(lang, code, "", test_cases)
                    tr = sandbox_result.get("test_results", [])
                    passed_count = sum(1 for t in tr if t.get("passed"))
                    total_count = len(tr) if tr else 1
                    score = round(marks * passed_count / total_count, 2)
                except Exception as ex:
                    logger.warning(f"Coding sandbox failed for q{qid}: {ex}")
                    score = 0.0

            elif q_type == "written":
                try:
                    grade_result = await ai.ai.generate_json(
                        prompt=json.dumps({
                            "question": q.get("question_text"),
                            "model_answer": q.get("model_answer"),
                            "candidate_answer": candidate_answer,
                            "max_marks": marks,
                        }),
                        system_prompt=(
                            "You are a grading AI. Grade this written answer.\n"
                            "Respond ONLY with JSON: {\"score\": <float>, \"feedback\": \"<string>\"}"
                        ),
                    )
                    score = min(float(grade_result.get("score", 0)), marks)
                except Exception as ex:
                    logger.warning(f"Written grading failed for q{qid}: {ex}")
                    score = 0.0

            elif q_type == "file_upload":
                # Requires manual review
                scores_per_q[qid] = {"score": None, "max": marks, "status": "pending_review"}
                continue

            earned_marks += score
            scores_per_q[qid] = {"score": score, "max": marks}

        pct_score = round((earned_marks / total_marks * 100) if total_marks > 0 else 0.0, 2)
        passed = pct_score >= pass_score

        # Generate AI feedback
        try:
            feedback_data = await ai.generate_assessment_feedback(
                questions=questions,
                answers=answers,
                scores=scores_per_q,
                total_score=pct_score,
                passed=passed,
            )
            feedback_str = json.dumps(feedback_data)
        except Exception as e:
            logger.warning(f"AI feedback generation failed: {e}")
            feedback_str = json.dumps({"summary": "Grading complete.", "passed": passed})

        # Persist results
        conn = _db(tenant_id)
        try:
            with conn.cursor() as cur:
                cur.execute(f'SET search_path TO "{tenant_id}"')
                cur.execute(
                    """
                    UPDATE assessment_results
                    SET scores_per_question = %s,
                        score = %s,
                        pass_status = %s,
                        feedback = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                    """,
                    (
                        json.dumps(scores_per_q),
                        pct_score,
                        passed,
                        feedback_str,
                        result_id,
                    ),
                )
                cur.execute(
                    """
                    UPDATE assessment_assignments
                    SET status = 'graded', updated_at = CURRENT_TIMESTAMP
                    WHERE assessment_id = %s AND user_id = %s
                    """,
                    (assessment_id, user_id),
                )
                conn.commit()
        finally:
            conn.close()

    except Exception as e:
        logger.error(f"Background grading failed for result {result_id}: {e}")

# ---------------------------------------------------------------------------
# 1. POST /submit — submit assessment
# ---------------------------------------------------------------------------

@router.post("/submit")
async def submit_assessment(
    body: SubmitRequest,
    current_user: dict = Depends(get_current_user),
):
    """Submit a completed assessment. Returns result_id immediately; grading runs in background."""
    tenant_id = current_user["tenant_id"]
    user_id = current_user["id"]

    conn = _db(tenant_id)
    try:
        with conn.cursor() as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')

            # Create result record immediately
            if body.is_malpractice:
                initial_score = 0.0
                initial_feedback = "Terminated for Malpractice"
                pass_status = False
            else:
                initial_score = None
                initial_feedback = "Grading in progress..."
                pass_status = None

            cur.execute(
                """
                INSERT INTO assessment_results
                    (assessment_id, user_id, answers, score, pass_status, feedback,
                     is_malpractice, time_taken_seconds, submitted_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                RETURNING id
                """,
                (
                    body.assessment_id,
                    user_id,
                    json.dumps(body.answers),
                    initial_score,
                    pass_status,
                    initial_feedback,
                    body.is_malpractice,
                    body.time_taken_seconds,
                ),
            )
            result_id = cur.fetchone()[0]

            # Log proctoring events
            for evt in body.proctoring_events:
                cur.execute(
                    """
                    INSERT INTO proctoring_flags (assessment_result_id, flag_type, details)
                    VALUES (%s, %s, %s)
                    """,
                    (result_id, evt.get("type", "unknown"), json.dumps(evt.get("details", evt))),
                )

            # Update assignment status to submitted
            cur.execute(
                """
                UPDATE assessment_assignments
                SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
                WHERE assessment_id = %s AND user_id = %s
                """,
                (body.assessment_id, user_id),
            )

            conn.commit()

        # Kick off background grading only if not malpractice
        if not body.is_malpractice:
            asyncio.create_task(
                _background_grade(tenant_id, result_id, body.assessment_id, user_id, body.answers)
            )

        return {"success": True, "data": {"result_id": result_id}, "message": "Submission received"}

    except Exception as e:
        conn.rollback()
        logger.error(f"submit_assessment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 3. GET /my-results — list all results for current user
# ---------------------------------------------------------------------------

@router.get("/my-results")
def list_my_results(
    current_user: dict = Depends(get_current_user),
):
    """List all assessment results for the logged-in user."""
    tenant_id = current_user["tenant_id"]
    user_id = current_user["id"]

    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                SELECT
                    r.id           AS result_id,
                    r.assessment_id,
                    a.title,
                    a.show_result_immediately,
                    r.score,
                    r.pass_status,
                    r.submitted_at,
                    r.is_malpractice
                FROM assessment_results r
                JOIN assessments a ON a.id = r.assessment_id
                WHERE r.user_id = %s
                ORDER BY r.submitted_at DESC
                """,
                (user_id,),
            )
            rows = []
            for r in cur.fetchall():
                row = dict(r)
                # Mask score if show_result_immediately=False
                if not row.get("show_result_immediately"):
                    row["score"] = None
                    row["pass_status"] = None
                rows.append(row)
        return {"success": True, "data": rows}
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 4. GET /result/{result_id} — full result details
# ---------------------------------------------------------------------------

@router.get("/result/{result_id}")
def get_result(
    result_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get full result details. Must own the result or have manage permission."""
    tenant_id = current_user["tenant_id"]
    user_id = current_user["id"]
    user_permissions = current_user.get("permissions", [])

    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                SELECT r.*, a.show_result_immediately, a.pass_score
                FROM assessment_results r
                JOIN assessments a ON a.id = r.assessment_id
                WHERE r.id = %s
                """,
                (result_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Result not found")

            result = dict(row)
            is_owner = result["user_id"] == user_id
            has_manage = "verify.assessments.manage" in user_permissions

            if not is_owner and not has_manage:
                raise HTTPException(status_code=403, detail="Access denied")

            # Fetch proctoring flags
            cur.execute(
                "SELECT * FROM proctoring_flags WHERE assessment_result_id = %s ORDER BY flagged_at",
                (result_id,),
            )
            result["proctoring_flags"] = [dict(f) for f in cur.fetchall()]

        return {"success": True, "data": result}
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 5. GET /review/{asm_id} — HR: list all submissions for an assessment
# ---------------------------------------------------------------------------

@router.get("/review/{asm_id}")
def review_submissions(
    asm_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.view_results")),
):
    """HR view: list all submissions for an assessment."""
    tenant_id = current_user["tenant_id"]
    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                SELECT
                    r.id           AS result_id,
                    r.user_id,
                    e.name         AS candidate_name,
                    u.username     AS email,
                    r.score,
                    r.pass_status,
                    r.is_malpractice,
                    r.submitted_at
                FROM assessment_results r
                JOIN users u ON u.id = r.user_id
                LEFT JOIN employees e ON e.employee_code = u.employee_code
                WHERE r.assessment_id = %s
                ORDER BY r.score DESC NULLS LAST
                """,
                (asm_id,),
            )
            rows = [dict(r) for r in cur.fetchall()]
        return {"success": True, "data": rows}
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 6. POST /result/{result_id}/release — release result to candidate
# ---------------------------------------------------------------------------

@router.post("/result/{result_id}/release")
def release_result(
    result_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
):
    """Release a result to the candidate (sets _is_released flag in feedback JSON)."""
    tenant_id = current_user["tenant_id"]
    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute("SELECT feedback FROM assessment_results WHERE id = %s", (result_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Result not found")

            feedback_raw = row["feedback"] or "{}"
            try:
                feedback = json.loads(feedback_raw) if isinstance(feedback_raw, str) else feedback_raw
            except Exception:
                feedback = {"raw": feedback_raw}

            feedback["_is_released"] = True

            cur.execute(
                """
                UPDATE assessment_results
                SET feedback = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (json.dumps(feedback), result_id),
            )
            conn.commit()
        return {"success": True, "message": "Result released to candidate"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 7. POST /result/{result_id}/flag-malpractice — HR flags malpractice
# ---------------------------------------------------------------------------

@router.post("/result/{result_id}/flag-malpractice")
def flag_malpractice(
    result_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
):
    """Flag a submission as malpractice and zero out the score."""
    tenant_id = current_user["tenant_id"]
    conn = _db(tenant_id)
    try:
        with conn.cursor() as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                UPDATE assessment_results
                SET is_malpractice = TRUE, score = 0, pass_status = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (result_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Result not found")
            conn.commit()
        return {"success": True, "message": "Flagged as malpractice"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 8. GET /analytics/{asm_id} — assessment analytics
# ---------------------------------------------------------------------------

@router.get("/analytics/{asm_id}")
def get_analytics(
    asm_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.view_results")),
):
    """Return aggregate analytics for an assessment."""
    tenant_id = current_user["tenant_id"]
    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')

            cur.execute(
                "SELECT COUNT(*) AS total_assigned FROM assessment_assignments WHERE assessment_id = %s",
                (asm_id,),
            )
            total_assigned = (cur.fetchone() or {}).get("total_assigned", 0)

            cur.execute(
                """
                SELECT
                    COUNT(*) AS submitted,
                    SUM(CASE WHEN pass_status = TRUE THEN 1 ELSE 0 END) AS passed,
                    AVG(score) AS average_score
                FROM assessment_results
                WHERE assessment_id = %s AND is_malpractice = FALSE
                """,
                (asm_id,),
            )
            stats = dict(cur.fetchone() or {})

        submitted = int(stats.get("submitted") or 0)
        passed = int(stats.get("passed") or 0)
        avg_score = float(stats.get("average_score") or 0.0)
        pending = max(int(total_assigned) - submitted, 0)
        pass_rate = round(passed / submitted * 100, 1) if submitted > 0 else 0.0

        return {
            "success": True,
            "data": {
                "total_assigned": int(total_assigned),
                "submitted": submitted,
                "pending": pending,
                "passed": passed,
                "pass_rate": pass_rate,
                "average_score": round(avg_score, 2),
            },
        }
    finally:
        conn.close()

# ---------------------------------------------------------------------------
# 9. GET /leaderboard/{asm_id} — ranked results
# ---------------------------------------------------------------------------

@router.get("/leaderboard/{asm_id}")
def get_leaderboard(
    asm_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Return a ranked leaderboard for an assessment."""
    tenant_id = current_user["tenant_id"]
    me = current_user["id"]

    conn = _db(tenant_id)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'SET search_path TO "{tenant_id}"')
            cur.execute(
                """
                SELECT
                    ROW_NUMBER() OVER (ORDER BY r.score DESC NULLS LAST) AS rank,
                    r.user_id,
                    COALESCE(e.name, u.username)                          AS user_name,
                    r.score,
                    r.pass_status
                FROM assessment_results r
                JOIN users u ON u.id = r.user_id
                LEFT JOIN employees e ON e.employee_code = u.employee_code
                WHERE r.assessment_id = %s AND r.is_malpractice = FALSE
                ORDER BY r.score DESC NULLS LAST
                """,
                (asm_id,),
            )
            rows = []
            for r in cur.fetchall():
                row = dict(r)
                row["is_me"] = row["user_id"] == me
                rows.append(row)
        return {"success": True, "data": rows}
    finally:
        conn.close()
