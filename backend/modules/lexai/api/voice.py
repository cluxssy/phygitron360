import os
import re
import base64
import logging
import requests
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from backend.core.dependencies import get_current_user, require_permission
from backend.core.permissions import P

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lexai/speech-to-text", tags=["lexai-voice"])
alias_voice_router = APIRouter(prefix="/api/speech-to-text", tags=["lexai-voice-alias"])


def _get_api_key() -> str:
    """Resolve API key using Phygitron's unified key precedence."""
    for var in ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_API_KEY_SELF"]:
        val = os.getenv(var, "").strip().strip("'\"")
        if val:
            return val
    multi = os.getenv("GEMINI_API_KEYS", "").strip()
    if multi:
        keys = [k.strip().strip("'\"") for k in multi.split(",") if k.strip().strip("'\"")]
        if keys:
            return keys[0]
    return ""


async def speech_to_text_impl(audio: UploadFile) -> dict:
    api_key = _get_api_key() or os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="AI transcription is not configured. GEMINI_API_KEY or GOOGLE_API_KEY is missing."
        )

    try:
        audio_bytes = await audio.read()
        if not audio_bytes or len(audio_bytes) < 100:
            return {"text": ""}

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        mime_type = "audio/webm"
        if audio.filename:
            fn = audio.filename.lower()
            if fn.endswith(".mp3"):
                mime_type = "audio/mp3"
            elif fn.endswith(".wav"):
                mime_type = "audio/wav"
            elif fn.endswith(".ogg") or fn.endswith(".opus"):
                mime_type = "audio/ogg"

        model = os.getenv("GEMINI_VOICE_MODEL", os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"))
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        payload = {
            "contents": [{
                "parts": [
                    {
                        "text": (
                            "Transcribe this audio clip precisely. Return ONLY the raw spoken words. "
                            "Do NOT include sound event tags like <noise>, <laughter>, or <silence>. "
                            "Do not add any introductory or concluding remarks."
                        )
                    },
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": audio_b64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0.0,
            }
        }

        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()

        data = response.json()

        try:
            transcription = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            transcription = re.sub(r"<[^>]+>", "", transcription).strip()
            return {"text": transcription}
        except (KeyError, IndexError):
            raise HTTPException(status_code=500, detail=f"Failed to parse Gemini response: {data}")

    except requests.exceptions.RequestException as e:
        logger.error("AI voice transcription network error: %s", e)
        raise HTTPException(status_code=502, detail=f"AI transcription service error: {str(e)}")
    except Exception as e:
        logger.error("Speech to text error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", dependencies=[Depends(require_permission(P.LEXAI_VOICE_USE))])
@router.post("/", dependencies=[Depends(require_permission(P.LEXAI_VOICE_USE))])
async def speech_to_text(audio: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return await speech_to_text_impl(audio)


@alias_voice_router.post("", dependencies=[Depends(require_permission(P.LEXAI_VOICE_USE))])
@alias_voice_router.post("/", dependencies=[Depends(require_permission(P.LEXAI_VOICE_USE))])
async def speech_to_text_alias(audio: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return await speech_to_text_impl(audio)
