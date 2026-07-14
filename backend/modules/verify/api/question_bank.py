"""
Verify Module — Question Bank API
=================================
Handles CRUD for reusable questions and AI extraction.
Prefix: /api/verify/question-bank
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from backend.core.dependencies import get_current_user, require_permission
from backend.modules.verify.services.question_bank_service import QuestionBankService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/verify/question-bank", tags=["Verify - Question Bank"])

def get_qb_service(current_user: dict = Depends(get_current_user)) -> QuestionBankService:
    return QuestionBankService(tenant_id=current_user.get("tenant_id", "public"))

class QuestionCreate(BaseModel):
    question_text: str
    question_type: str = "mcq"
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    model_answer: Optional[str] = None
    starter_code: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    programming_language: Optional[str] = None
    accepted_file_types: Optional[str] = None
    marks: float = 1.0
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    topic: Optional[str] = None

@router.post("")
def create_question(
    body: QuestionCreate,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
    service: QuestionBankService = Depends(get_qb_service)
):
    try:
        data = body.dict()
        data["created_by"] = current_user["id"]
        q_id = service.create_question(data)
        return {"success": True, "data": {"id": q_id}, "message": "Question added to bank"}
    except Exception as e:
        logger.error(f"Error creating question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("")
def list_questions(
    tags: Optional[str] = None,
    q_type: Optional[str] = None,
    topic: Optional[str] = None,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
    service: QuestionBankService = Depends(get_qb_service)
):
    tag_list = tags.split(",") if tags else None
    rows = service.list_questions(tags=tag_list, q_type=q_type, topic=topic)
    return {"success": True, "data": rows}

@router.get("/{q_id}")
def get_question(
    q_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
    service: QuestionBankService = Depends(get_qb_service)
):
    q = service.get_question_by_id(q_id)
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"success": True, "data": q}

@router.put("/{q_id}")
def update_question(
    q_id: int,
    body: QuestionCreate,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
    service: QuestionBankService = Depends(get_qb_service)
):
    success = service.update_question(q_id, body.dict())
    if not success:
        raise HTTPException(status_code=404, detail="Question not found or update failed")
    return {"success": True, "message": "Question updated successfully"}

@router.delete("/{q_id}")
def delete_question(
    q_id: int,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
    service: QuestionBankService = Depends(get_qb_service)
):
    success = service.delete_question(q_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"success": True, "message": "Question deleted"}

class URLImportRequest(BaseModel):
    url: str
    tags: Optional[List[str]] = None
    topic: Optional[str] = None

@router.post("/import-url")
async def import_url(
    body: URLImportRequest,
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
    service: QuestionBankService = Depends(get_qb_service)
):
    try:
        count = await service.import_from_url(body.url, current_user["id"], body.topic, body.tags)
        return {"success": True, "data": {"added": count}, "message": f"Imported {count} questions successfully from URL"}
    except Exception as e:
        logger.error(f"URL Import Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/import-file")
async def import_questions_from_file(
    file: UploadFile = File(...),
    topic: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(require_permission("verify.assessments.manage")),
    service: QuestionBankService = Depends(get_qb_service)
):
    """Extract text from file and use AI to parse questions into the bank."""
    content = await file.read()
    text = ""
    filename = file.filename.lower()
    
    try:
        if filename.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                text += page.get_text()
        elif filename.endswith(".docx"):
            import docx
            import io
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join([para.text for para in doc.paragraphs])
        else:
            text = content.decode("utf-8")
    except Exception as e:
        logger.error(f"File extraction error: {e}")
        raise HTTPException(status_code=400, detail="Could not extract text from file. Unsupported format or corrupted file.")
            
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from file")
        
    try:
        tag_list = tags.split(",") if tags else None
        count = await service.import_from_text(text, current_user["id"], topic, tag_list)
        return {"success": True, "message": f"Imported {count} questions successfully"}
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail="AI Extraction failed")
