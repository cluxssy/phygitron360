from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import sys
import types
import io
import wave
import logging
from datetime import datetime
import numpy as np

try:
    import audioop
except ImportError:
    import audioop_lts as audioop

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lexai/speech-to-text", tags=["lexai-voice"])
alias_voice_router = APIRouter(prefix="/api/speech-to-text", tags=["lexai-voice-alias"])

# Global singleton for local Whisper model
_whisper_model = None

LOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "voice_debug.log"))

def debug_log(msg: str):
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    except Exception:
        pass
    logger.info(msg)


def get_whisper_model():
    """
    Lazy-load local faster-whisper model (int8 on CPU).
    100% free, offline, zero API keys, no external network calls, no billing.
    """
    global _whisper_model
    if _whisper_model is None:
        # Mock PyAV if blocked by Windows Application Control policies
        if 'av' not in sys.modules:
            try:
                import av
            except Exception:
                sys.modules['av'] = types.ModuleType('av')

        from faster_whisper import WhisperModel
        debug_log("Initializing local Whisper model (base.en, int8 on CPU)...")
        _whisper_model = WhisperModel("base.en", device="cpu", compute_type="int8")
        debug_log("Local Whisper model loaded successfully.")
    return _whisper_model


def decode_wav_to_16k_mono(audio_bytes: bytes) -> np.ndarray:
    """
    Converts raw WAV bytes (any sample rate, 8/16/24/32 bit, mono or stereo)
    into a 16kHz float32 mono numpy array expected by Whisper.
    """
    with wave.open(io.BytesIO(audio_bytes), 'rb') as wf:
        n_channels = wf.getnchannels()
        sampwidth = wf.getsampwidth()
        framerate = wf.getframerate()
        raw_frames = wf.readframes(wf.getnframes())

    if not raw_frames:
        return np.array([], dtype=np.float32)

    # Normalize sample width to 16-bit (2 bytes)
    if sampwidth == 1:
        raw_frames = audioop.bias(raw_frames, 1, -128)
        raw_frames = audioop.lin2lin(raw_frames, 1, 2)
        sampwidth = 2
    elif sampwidth == 3:
        a24 = np.frombuffer(raw_frames, dtype=np.uint8)
        a16 = (a24[1::3].astype(np.int16) | (a24[2::3].astype(np.int16) << 8))
        raw_frames = a16.tobytes()
        sampwidth = 2
    elif sampwidth == 4:
        raw_frames = audioop.lin2lin(raw_frames, 4, 2)
        sampwidth = 2

    # Downmix to mono if stereo
    if n_channels == 2:
        raw_frames = audioop.tomono(raw_frames, sampwidth, 1, 1)
        n_channels = 1
    elif n_channels > 2:
        arr = np.frombuffer(raw_frames, dtype=np.int16).reshape(-1, n_channels)
        raw_frames = arr.mean(axis=1).astype(np.int16).tobytes()

    # Resample to 16,000 Hz if needed
    if framerate != 16000:
        raw_frames, _ = audioop.ratecv(raw_frames, sampwidth, 1, framerate, 16000, None)

    # Convert 16-bit PCM to normalized float32 [-1.0, 1.0]
    audio_np = np.frombuffer(raw_frames, dtype=np.int16).astype(np.float32) / 32768.0
    return audio_np


async def speech_to_text_impl(audio: UploadFile = File(...)):
    try:
        audio_bytes = await audio.read()
        debug_log(f"Received audio upload: {audio.filename}, size: {len(audio_bytes)} bytes")
        if not audio_bytes or len(audio_bytes) < 200:
            debug_log("Audio bytes too small, returning empty.")
            return {"text": ""}

        # 1. Decode WAV to 16kHz float32 mono array
        try:
            audio_np = decode_wav_to_16k_mono(audio_bytes)
        except Exception as e:
            debug_log(f"Failed to decode WAV: {e}")
            return {"text": "", "error": f"Audio decode error: {e}"}

        if audio_np.size == 0:
            debug_log("Decoded audio array is empty.")
            return {"text": ""}

        max_amp = float(np.max(np.abs(audio_np)))
        debug_log(f"Decoded audio: {audio_np.size} samples, max amplitude: {max_amp:.5f}")

        # Check for near total silence / muted mic
        if max_amp < 0.0005:
            debug_log("Audio is near silent (<0.0005), microphone may be muted.")
            return {"text": "", "notice": "Audio was silent. Please speak closer to your microphone."}

        # Normalize volume so speech is loud and clear for Whisper
        if max_amp > 0 and max_amp < 0.8:
            audio_np = audio_np * (0.7 / max_amp)

        # 2. Transcribe using Local Whisper Model
        try:
            model = get_whisper_model()

            # First try with VAD filter
            segments, info = model.transcribe(
                audio_np,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=300)
            )

            text_pieces = [s.text.strip() for s in segments if s.text and s.text.strip()]
            full_text = " ".join(text_pieces).strip()

            # If VAD was too aggressive on quiet speech, try without VAD
            if not full_text:
                debug_log("VAD returned empty, retrying without VAD filter...")
                segments, info = model.transcribe(audio_np, beam_size=5, vad_filter=False)
                text_pieces = [s.text.strip() for s in segments if s.text and s.text.strip()]
                full_text = " ".join(text_pieces).strip()

            debug_log(f"Whisper transcription result: '{full_text}'")

            if full_text:
                full_text = full_text[0].upper() + full_text[1:]
                return {"text": full_text}

            return {"text": ""}
        except Exception as e:
            debug_log(f"Local Whisper transcription error: {e}")
            return {"text": "", "error": str(e)}

    except Exception as e:
        debug_log(f"Speech to text general error: {e}")
        return {"text": "", "error": str(e)}


@router.post("")
@router.post("/")
async def speech_to_text(audio: UploadFile = File(...)):
    return await speech_to_text_impl(audio)


@alias_voice_router.post("")
@alias_voice_router.post("/")
async def speech_to_text_alias(audio: UploadFile = File(...)):
    return await speech_to_text_impl(audio)
