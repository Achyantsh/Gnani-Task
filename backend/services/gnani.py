import os
import httpx
from gnani.stt import GnaniSTTClient

from config import GNANI_BATCH_URL

def normalize_language(lang: str | None) -> str:
    if not lang:
        return "en-IN"
    
    lang = lang.strip()
    if "-" not in lang:
        return f"{lang}-IN"
    return lang

def get_headers() -> dict[str, str]:
    api_key = os.getenv("GNANI_API_KEY", "").strip()
    return {
        "X-API-Key-ID": api_key,
        "Content-Type": "application/json",
    }

def transcribe_short_audio_sdk(audio_path_or_bytes, language_code: str = "en-IN") -> dict:
    api_key = os.getenv("GNANI_API_KEY", "").strip()
    client = GnaniSTTClient(api_key=api_key)

    return client.transcribe(
        audio_path_or_bytes,
        language_code=normalize_language(language_code),
    )


# Creating Job Id
async def create_batch_job(file_url: str, language_code: str = "en-IN") -> str:

    payload = {
        "config": {
            "model": "gnani-prisma-v2.5",
            "language_code": normalize_language(language_code),
            "mode": "transcribe",
            "with_diarization": False,
            "is_multi_channel": False,
        },
        "source": {
            "type": "cloud_storage",
            "auth": {"mode": "public"},
            "paths": [file_url],
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as httpClient:
        response = await httpClient.post(GNANI_BATCH_URL, json=payload, headers=get_headers())

        if response.status_code not in (200, 201):
            raise RuntimeError(f"Gnani job creation failed: {response.text}")

        data = response.json()
        job_id = data.get("job_id")
        if not job_id:
            raise RuntimeError(f"No job_id returned by Gnani: {data}")

        return job_id


async def start_batch_job(job_id: str) -> None:
    url = f"{GNANI_BATCH_URL}/{job_id}/start"

    async with httpx.AsyncClient(timeout=30.0) as httpClient:
        response = await httpClient.post(url, headers=get_headers())

        if response.status_code not in (200, 202):
            raise RuntimeError(f"Failed to start Gnani job: {response.text}")


async def get_batch_job_status(job_id: str) -> dict:

    url = f"{GNANI_BATCH_URL}/{job_id}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url, headers=get_headers())

        if response.status_code != 200:
            raise RuntimeError(f"Failed to fetch Gnani job status: {response.text}")
        return response.json()


async def fetch_completed_transcript(job_id: str) -> tuple[str, float, list]:

    url = f"{GNANI_BATCH_URL}/{job_id}/files?status=COMPLETED"

    async with httpx.AsyncClient(timeout=25.0) as httpClient:
        
        resp = await httpClient.get(url, headers=get_headers())

        if resp.status_code != 200:
            raise RuntimeError("Could not retrieve completed files from Gnani.")

        data = resp.json().get("data", [])

        if not data or "transcript_url" not in data[0]:
            raise RuntimeError("Transcript URL missing in Gnani response.")

        transcript_url = data[0]["transcript_url"]

        transcript_resp = await httpClient.get(transcript_url)

        if transcript_resp.status_code != 200:
            raise RuntimeError("Could not download transcript JSON from Gnani.")

        data = transcript_resp.json()
        full_transcript = data.get("full_transcript", "").strip()
        duration = float(data.get("duration_seconds") or data[0].get("duration_seconds") or 0.0)
        segments = data.get("segments", [])

        return full_transcript, duration, segments


async def cancel_batch_job(job_id: str) -> dict:
    url = f"{GNANI_BATCH_URL}/{job_id}/cancel"
    payload = {"reason": "User cancelled transcription"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(url, json=payload, headers=get_headers())
        return response.json()


async def get_batch_failure_reason(job_id: str, fallback: str) -> str:
    url = f"{GNANI_BATCH_URL}/{job_id}/files"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=get_headers())
            if resp.status_code == 200:
                files = resp.json().get("data", [])
                if files and files[0].get("error_message"):
                    return files[0]["error_message"]
    except Exception:
        pass
    return fallback
