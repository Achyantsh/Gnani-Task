"""API routes for Timbre TTS."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.timbre import generate_speech, select_voice
from services.r2 import upload_to_r2, get_presigned_download_url
from auth import get_current_user
import uuid

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language_code: str = "en-IN"
    voice: Optional[str] = None
    speed: float = 1.0
    conversation_id: Optional[str] = None

class TTSResponse(BaseModel):
    success: bool
    audio_url: Optional[str] = None
    error: Optional[str] = None
    voice_used: Optional[str] = None

@router.post("/tts/generate", response_model=TTSResponse)
async def generate_tts(
    request: TTSRequest,
    user: dict = Depends(get_current_user),
):
    """Generate speech from text using Gnani Timbre."""
    try:
        # Validate input
        if not request.text.strip():
            return TTSResponse(success=False, error="Text cannot be empty")

        if len(request.text) > 5000:
            return TTSResponse(success=False, error="Text too long (max 5000 characters)")

        # Generate speech
        audio_bytes = await generate_speech(
            text=request.text,
            language_code=request.language_code,
            voice=request.voice,
            speed=request.speed,
        )

        if not audio_bytes:
            return TTSResponse(success=False, error="Failed to generate speech")

        # Store in R2
        file_key = f"tts/{user['id']}/{request.conversation_id or 'general'}/{uuid.uuid4()}.wav"
        if not upload_to_r2(file_key, audio_bytes, "audio/wav"):
            return TTSResponse(success=False, error="Failed to store generated audio")

        # Get presigned URL for playback
        playback_url = get_presigned_download_url(file_key, expires_in=3600)

        return TTSResponse(
            success=True,
            audio_url=playback_url,
            voice_used=select_voice(request.language_code) if not request.voice else request.voice,
        )

    except Exception as exc:
        print(f"TTS generation error: {exc}")
        return TTSResponse(success=False, error=str(exc))

@router.get("/tts/voices")
async def list_voices(language: Optional[str] = None):
    """List available voices for a language."""
    from config import LANGUAGE_NAMES

    # Return known voice mapping
    voices = {
        "hi": ["Nalini", "Deepak"],
        "hinglish": ["Poorvi"],
        "en": ["Priya", "Rohan"],
    }

    if language:
        lang = language.lower().split("-")[0]
        return {"voices": voices.get(lang, voices.get("en", []))}

    return {"voices": voices}