"""Gnani Timbre TTS service for generating spoken summaries."""
import os
import asyncio
import httpx
import struct
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Timbre API constants
TIMBRE_INFERENCE_URL = "https://api.vachana.ai/api/v1/tts/inference"

# Recommended model (verify with current docs)
TIMBRE_MODEL = "timbre-v2.5"

# Supported voices for timbre-v2.5 (from API error message)
SUPPORTED_VOICES = [
    "Nalini", "Bhavna", "Yashvi", "Urmila", "Jwala",
    "Chitra", "Ambuja", "Deepak", "Roopes"
]

# Language to voice mapping (using supported voices)
VOICE_MAP = {
    "hi": "Nalini",       # Hindi - female
    "en": "Deepak",       # English - male
    "hinglish": "Nalini", # Hinglish - default to Hindi voice
    "bn": "Bhavna",
    "gu": "Yashvi",
    "kn": "Urmila",
    "ml": "Jwala",
    "mr": "Chitra",
    "pa": "Ambuja",
    "ta": "Deepak",
    "te": "Roopes",
}

def get_timbre_headers() -> dict[str, str]:
    api_key = os.getenv("GNANI_API_KEY", "").strip()
    return {
        "X-API-Key-ID": api_key,
        "Content-Type": "application/json",
    }

def select_voice(language_code: str) -> str:
    """Select appropriate voice based on language."""
    lang = language_code.lower().split("-")[0]
    return VOICE_MAP.get(lang, "Nalini")

def create_wav_header(pcm_data: bytes, sample_rate: int = 22050, channels: int = 1, bits_per_sample: int = 16) -> bytes:
    """Create a WAV header for raw PCM data."""
    byte_rate = sample_rate * channels * bits_per_sample // 8
    block_align = channels * bits_per_sample // 8
    data_size = len(pcm_data)

    header = struct.pack(
        '<4sI4s4sIHHIIHH4sI',
        b'RIFF',                    # ChunkID
        36 + data_size,             # ChunkSize (36 + data_size)
        b'WAVE',                    # Format
        b'fmt ',                    # Subchunk1ID
        16,                         # Subchunk1Size (PCM = 16)
        1,                          # AudioFormat (1 = PCM)
        channels,                   # NumChannels
        sample_rate,                # SampleRate
        byte_rate,                  # ByteRate
        block_align,                # BlockAlign
        bits_per_sample,            # BitsPerSample
        b'data',                    # Subchunk2ID
        data_size                   # Subchunk2Size
    )
    return header

async def generate_speech(
    text: str,
    language_code: str = "en-IN",
    voice: Optional[str] = None,
    speed: float = 1.0,
) -> Optional[bytes]:
    """
    Generate speech using Gnani Timbre TTS.

    Args:
        text: Text to synthesize (max ~500 chars recommended)
        language_code: BCP-47 language code (e.g., 'hi-IN', 'en-IN')
        voice: Specific voice name (auto-selected if None)
        speed: Speech speed (0.5-2.0)

    Returns:
        Audio bytes (WAV with header) or None on failure
    """
    api_key = os.getenv("GNANI_API_KEY", "").strip()
    if not api_key or not text.strip():
        return None

    selected_voice = voice or select_voice(language_code)

    # Validate voice is supported
    if selected_voice not in SUPPORTED_VOICES:
        selected_voice = "Nalini"

    payload = {
        "text": text.strip(),
        "model": TIMBRE_MODEL,
        "voice": selected_voice,
        "language": language_code,
        "speed": speed,
        "audio_config": {
            "audio_format": "wav",
            "sample_rate": 22050,
        }
    }

    headers = get_timbre_headers()

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(3):
            try:
                response = await client.post(TIMBRE_INFERENCE_URL, json=payload, headers=headers)

                if response.status_code == 200:
                    pcm_data = response.content
                    # Wrap raw PCM with WAV header
                    wav_header = create_wav_header(pcm_data, sample_rate=22050, channels=1, bits_per_sample=16)
                    return wav_header + pcm_data

                if response.status_code == 429 and attempt < 2:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue

                print(f"Timbre TTS error {response.status_code}: {response.text[:200]}")
                break

            except Exception as exc:
                if attempt < 2:
                    await asyncio.sleep(2 * (attempt + 1))
                    continue
                print(f"Timbre TTS exception: {exc}")
                break

    return None