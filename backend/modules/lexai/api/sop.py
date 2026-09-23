import os
import io
import json
import tempfile
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from typing import Optional, Dict, Any
from backend.core.dependencies import get_current_user, require_permission
from backend.core.permissions import P
from ..services import sop_service

router = APIRouter(prefix="/api/lexai/sop", tags=["lexai-sop"])
alias_sop_router = APIRouter(prefix="/api/sop", tags=["lexai-sop-alias"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# ---------------------------------------------------------------------------
# Shared implementation helpers
# ---------------------------------------------------------------------------

async def _analyze_impl(file: UploadFile) -> dict:
    """
    Analyzes an uploaded DOCX SOP document and returns structural properties,
    detected fonts, headings, tables, missing headers/footers, and baseline compliance.
    """
    filename = file.filename
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only DOCX files are supported for SOP analysis.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 50 MB size limit.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        analysis_result = sop_service.analyze_sop_document(temp_path)
        return analysis_result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def _suggest_content_impl(file: UploadFile, categories: str = "{}") -> dict:
    """
    Generates AI content suggestions (Grammar & Spelling, Clarity, Professional Tone,
    Terminology Consistency) using Gemini without applying them to the document yet.
    """
    filename = file.filename
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only DOCX files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 50 MB size limit.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server.")

    try:
        cat_dict = json.loads(categories) if isinstance(categories, str) else categories
    except Exception:
        cat_dict = {
            "grammar_spelling": True,
            "clarity": True,
            "professional_tone": True,
            "terminology_consistency": True,
        }

    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        suggestions = sop_service.generate_content_suggestions(gemini_key, temp_path, cat_dict)
        return {"suggestions": suggestions, "count": len(suggestions)}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestion error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def _format_impl(
    file: UploadFile,
    config: Optional[str],
    accepted_suggestions: Optional[str],
    header_file: Optional[UploadFile],
    footer_file: Optional[UploadFile],
) -> StreamingResponse:
    """
    Formats the SOP document.
    - Format Only mode: Deterministic typography and layout formatting with pre/post
      text snapshot integrity verification.
    - Format + Content mode: Applies only the user-approved content suggestions,
      then applies deterministic formatting.
    """
    filename = file.filename
    if not filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only DOCX files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 50 MB size limit.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    header_file_stream = None
    if header_file:
        hdr_bytes = await header_file.read()
        if hdr_bytes:
            header_file_stream = io.BytesIO(hdr_bytes)

    footer_file_stream = None
    if footer_file:
        ftr_bytes = await footer_file.read()
        if ftr_bytes:
            footer_file_stream = io.BytesIO(ftr_bytes)

    parsed_config = {}
    if config:
        try:
            parsed_config = json.loads(config)
        except Exception:
            parsed_config = {}

    parsed_accepted_suggestions = []
    if accepted_suggestions:
        try:
            parsed_accepted_suggestions = json.loads(accepted_suggestions)
        except Exception:
            parsed_accepted_suggestions = []

    mode = parsed_config.get("mode", "format_only")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        # If Format + Content mode and there are accepted suggestions, apply them first
        working_input = temp_path
        if mode == "format_and_content" and parsed_accepted_suggestions:
            content_updated_buf = sop_service.apply_accepted_content_changes(
                temp_path, parsed_accepted_suggestions
            )
            working_input = content_updated_buf

        formatted_io, applied_changes, final_compliance = sop_service.apply_sop_formatting(
            working_input,
            parsed_config,
            header_file=header_file_stream,
            footer_file=footer_file_stream,
        )

        name_part, ext_part = os.path.splitext(filename)
        output_filename = f"{name_part}_Formatted{ext_part}"

        headers = {
            "Content-Disposition": f'attachment; filename="{output_filename}"',
            "X-Compliance-Final": str(final_compliance),
            "X-Formatting-Changes-Count": str(len(applied_changes)),
            "X-Content-Changes-Count": str(
                len(parsed_accepted_suggestions) if mode == "format_and_content" else 0
            ),
        }

        return StreamingResponse(
            formatted_io,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=headers,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred during formatting: {str(e)}"
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


async def _change_report_impl(payload: Dict[str, Any]) -> StreamingResponse:
    """
    Generates and downloads a DOCX Change Report summarizing applied formatting rules
    and accepted content changes.
    """
    filename = payload.get("filename", "Document.docx")
    mode = payload.get("mode", "format_only")
    formatting_changes = payload.get("formatting_changes", [])
    content_changes_count = payload.get("content_changes_count", 0)
    accepted_content_suggestions = payload.get("accepted_content_suggestions", [])
    baseline_compliance = payload.get("baseline_compliance", 70)
    final_compliance = payload.get("final_compliance", 98)

    try:
        report_io = sop_service.generate_change_report(
            filename=filename,
            mode=mode,
            formatting_changes=formatting_changes,
            content_changes_count=content_changes_count,
            accepted_content_suggestions=accepted_content_suggestions,
            baseline_compliance=baseline_compliance,
            final_compliance=final_compliance,
        )

        name_part, _ = os.path.splitext(filename)
        output_filename = f"{name_part}_Change_Report.docx"

        return StreamingResponse(
            report_io,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{output_filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate change report: {str(e)}")


# ---------------------------------------------------------------------------
# /api/lexai/sop  routes
# ---------------------------------------------------------------------------

@router.post("/analyze", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))])
async def analyze_sop_document_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Analyzes an uploaded DOCX SOP document and returns structural properties,
    detected fonts, headings, tables, missing headers/footers, and baseline compliance.
    """
    return await _analyze_impl(file)


@router.post("/suggest-content", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))])
async def suggest_content_enhancements_endpoint(
    file: UploadFile = File(...),
    categories: str = Form("{}"),
    current_user: dict = Depends(get_current_user),
):
    """
    Generates AI content suggestions (Grammar & Spelling, Clarity, Professional Tone,
    Terminology Consistency) using Gemini without applying them to the document yet.
    """
    return await _suggest_content_impl(file, categories)


@router.post("/format", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))])
async def format_sop_document(
    file: UploadFile = File(...),
    config: Optional[str] = Form(None),
    accepted_suggestions: Optional[str] = Form(None),
    header_file: Optional[UploadFile] = File(None),
    footer_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Formats the SOP document.
    - Format Only mode: Deterministic typography and layout formatting with pre/post
      text snapshot integrity verification.
    - Format + Content mode: Applies only the user-approved content suggestions,
      then applies deterministic formatting.
    """
    return await _format_impl(file, config, accepted_suggestions, header_file, footer_file)


@router.post("/change-report", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))])
async def download_change_report_endpoint(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Generates and downloads a DOCX Change Report summarizing applied formatting rules
    and accepted content changes.
    """
    return await _change_report_impl(payload)


# ---------------------------------------------------------------------------
# /api/sop  alias routes
# ---------------------------------------------------------------------------

@alias_sop_router.post("/analyze", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))])
async def analyze_sop_document_endpoint_alias(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Alias: /api/sop/analyze → delegates to SOP analysis implementation."""
    return await _analyze_impl(file)


@alias_sop_router.post(
    "/suggest-content", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))]
)
async def suggest_content_enhancements_endpoint_alias(
    file: UploadFile = File(...),
    categories: str = Form("{}"),
    current_user: dict = Depends(get_current_user),
):
    """Alias: /api/sop/suggest-content → delegates to AI suggestions implementation."""
    return await _suggest_content_impl(file, categories)


@alias_sop_router.post("/format", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))])
async def format_sop_document_alias(
    file: UploadFile = File(...),
    config: Optional[str] = Form(None),
    accepted_suggestions: Optional[str] = Form(None),
    header_file: Optional[UploadFile] = File(None),
    footer_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Alias: /api/sop/format → delegates to SOP formatting implementation."""
    return await _format_impl(file, config, accepted_suggestions, header_file, footer_file)


@alias_sop_router.post(
    "/change-report", dependencies=[Depends(require_permission(P.LEXAI_DESIGN_RUN))]
)
async def download_change_report_endpoint_alias(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user),
):
    """Alias: /api/sop/change-report → delegates to change report generation implementation."""
    return await _change_report_impl(payload)
