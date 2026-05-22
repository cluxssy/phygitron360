import asyncio
import json
import logging
from typing import List, Dict, Any, Optional

from backend.modules.verify.repositories.submission_repo import SubmissionRepository
from backend.modules.verify.repositories.assessment_repo import AssessmentRepository
from backend.common.services.ai.agents import AIAgents

logger = logging.getLogger(__name__)

class SubmissionService:
    def __init__(self, tenant_id: str = 'public'):
        self.tenant_id = tenant_id
        self.repo = SubmissionRepository(tenant_id=tenant_id)
        self.assessment_repo = AssessmentRepository(tenant_id=tenant_id)
        self.ai = AIAgents()

    def submit_assessment(self, data: Dict[str, Any]) -> int:
        """Create initial submission record and trigger background grading."""
        # Create initial result record
        submit_data = {
            "assessment_id": data["assessment_id"],
            "user_id": data["user_id"],
            "answers": data["answers"],
            "time_taken_seconds": data.get("time_taken_seconds"),
            "is_malpractice": data.get("is_malpractice", False),
            "proctoring_events": data.get("proctoring_events", []),
            "assignment_status": "submitted",
        }

        if submit_data["is_malpractice"]:
            submit_data["initial_score"] = 0.0
            submit_data["initial_feedback"] = "Terminated for Malpractice"
            submit_data["pass_status"] = False
        else:
            submit_data["initial_score"] = None
            submit_data["initial_feedback"] = "Grading in progress..."
            submit_data["pass_status"] = None

        result_id = self.repo.create_result(submit_data)

        # Start grading in background
        if not submit_data["is_malpractice"]:
            asyncio.create_task(
                self._background_grade(
                    result_id, 
                    data["assessment_id"], 
                    data["user_id"], 
                    data["answers"]
                )
            )

        return result_id

    async def _background_grade(self, result_id: int, assessment_id: int, user_id: int, answers: Dict[str, Any]):
        """Runs asynchronously after submission — grades all questions and updates results."""
        try:
            asm = self.assessment_repo.get_assessment_by_id(assessment_id)
            if not asm:
                return

            questions = asm.get("questions", [])
            pass_score = float(asm.get("pass_score", 70.0))

            total_marks = 0.0
            earned_marks = 0.0
            scores_per_q: Dict[str, Any] = {}

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
                        grade_result = await self.ai.ai.generate_json(
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
                    scores_per_q[qid] = {"score": None, "max": marks, "status": "pending_review"}
                    continue

                earned_marks += score
                scores_per_q[qid] = {"score": score, "max": marks}

            pct_score = round((earned_marks / total_marks * 100) if total_marks > 0 else 0.0, 2)
            passed = pct_score >= pass_score

            # Generate AI feedback
            try:
                feedback_data = await self.ai.generate_assessment_feedback(
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
            self.repo.update_result_grading(result_id, assessment_id, user_id, scores_per_q, pct_score, passed, feedback_str)

        except Exception as e:
            logger.error(f"Background grading failed for result {result_id}: {e}")

    def get_results_by_assessment(self, asm_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_results_by_assessment(asm_id)

    def get_result_by_id(self, result_id: int) -> Optional[Dict[str, Any]]:
        return self.repo.get_result_by_id(result_id)

    def get_leaderboard(self, asm_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_leaderboard(asm_id)

    def get_my_results(self, user_id: int) -> List[Dict[str, Any]]:
        return self.repo.get_my_results(user_id)

    def get_assessment_analytics(self, asm_id: int) -> Dict[str, Any]:
        return self.repo.get_assessment_analytics(asm_id)

    def release_result(self, result_id: int) -> bool:
        result = self.get_result_by_id(result_id)
        if not result:
            return False
            
        feedback_raw = result.get("feedback") or "{}"
        try:
            feedback = json.loads(feedback_raw) if isinstance(feedback_raw, str) else feedback_raw
        except Exception:
            feedback = {"raw": feedback_raw}

        feedback["_is_released"] = True
        return self.repo.update_result_feedback(result_id, json.dumps(feedback))
