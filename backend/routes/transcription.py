import os
import time
from typing import Optional, Any
from fastapi import APIRouter
from pydantic import BaseModel
from supabase import create_client

from services.r2 import get_presigned_download_url
from services.summary import generate_summary
from services.gnani import (
    create_batch_job,
    start_batch_job,
    get_batch_job_status,
    fetch_completed_transcript,
    cancel_batch_job,
    get_batch_failure_reason,
    normalize_language,
)

router = APIRouter()
tasks_store: dict[str, dict[str, Any]] = {}

class TranscribeRequest(BaseModel):
    file_key: str
    filename: str
    language_code: str = "en-IN"
    user_id: Optional[str] = None


class TranscribeResponse(BaseModel):
    success: bool
    task_id: Optional[str] = None
    error: Optional[str] = None


class TaskStatusResponse(BaseModel):
    status: str
    lifecycle_stage: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    duration_seconds: Optional[float] = None
    playback_url: Optional[str] = None
    error: Optional[str] = None
    segments: Optional[list[dict[str, Any]]] = None



def save_to_supabase(user_id: Optional[str], filename: str, file_key: str, lang: str, duration: float, transcript: str, summary: str):
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")

    if not url or not key:
        return

    try:
        supabaseClient = create_client(url, key)
        payload = {
            "filename": filename,
            "file_key": file_key,
            "language_code": lang,
            "duration_seconds": duration,
            "transcript": transcript,
            "summary": summary,
            "status": "COMPLETED",
        }
        if user_id:
            payload["user_id"] = user_id
        supabaseClient.table("transcriptions").insert(payload).execute()
    except Exception as exc:
        print(f"Note: Supabase insert skipped or failed: {exc}")



@router.post("/transcribe", response_model=TranscribeResponse)
async def start_transcription(request: TranscribeRequest):
    try:
        lang = normalize_language(request.language_code)

        audio_download_url = get_presigned_download_url(request.file_key, expires_in=7200)

        job_id = await create_batch_job(audio_download_url, lang)

        await start_batch_job(job_id)

        tasks_store[job_id] = {
            "file_key": request.file_key,
            "filename": request.filename,
            "language_code": lang,
            "user_id": request.user_id,
            "status": "TRANSCRIBING",
            "completed_result": None,
            "error": None,
        }

        return TranscribeResponse(success=True, task_id=job_id)

    except Exception as exc:
        print(f"Error starting transcription: {exc}")
        return TranscribeResponse(success=False, error=str(exc))


@router.get("/transcribe/{task_id}", response_model=TaskStatusResponse, response_model_exclude_none=True)
async def get_transcription_status(task_id: str):
    task = tasks_store.get(task_id)

    if task and task.get("completed_result"):
        return TaskStatusResponse(**task["completed_result"])

    if task and task.get("error"):
        return TaskStatusResponse(status="FAILED", error=task["error"])

    try:
     
        job_info = await get_batch_job_status(task_id)
        job_status = job_info.get("status", "UNKNOWN")

       
        if job_status in ("CREATED", "STARTING", "QUEUED", "IN_PROGRESS"):
            return TaskStatusResponse(status="TRANSCRIBING", lifecycle_stage=job_status)

        
        if job_status in ("FAILED", "PARTIAL_FAILURE", "START_FAILED", "CANCELLED"):
            fallback_err = job_info.get("cancel_reason") or f"Gnani job ended with status: {job_status}"
            error_message = await get_batch_failure_reason(task_id, fallback_err)
            if task:
                task["error"] = error_message
            return TaskStatusResponse(status="FAILED", error=error_message)

        if job_status == "COMPLETED":
            
            transcript, duration, segments = await fetch_completed_transcript(task_id)

            file_key = task.get("file_key", "") if task else ""
            filename = task.get("filename", "recording.wav") if task else "recording.wav"
            lang = task.get("language_code", "en-IN") if task else "en-IN"
            user_id = task.get("user_id") if task else None

            summary = await generate_summary(transcript, lang)

            playback_url = get_presigned_download_url(file_key) if file_key else ""

            save_to_supabase(user_id, filename, file_key, lang, duration, transcript, summary)

            result_data = {
                "status": "COMPLETED",
                "lifecycle_stage": "COMPLETED",
                "transcript": transcript,
                "summary": summary,
                "duration_seconds": round(duration, 2),
                "playback_url": playback_url,
                "segments": segments,
            }

            if task:
                task["completed_result"] = result_data

            return TaskStatusResponse(**result_data)

        return TaskStatusResponse(status=job_status, lifecycle_stage=job_status)

    except Exception as exc:
        print(f"Error checking status for {task_id}: {exc}")
        return TaskStatusResponse(status="FAILED", error=str(exc))


@router.post("/transcribe/{task_id}/cancel")
async def cancel_transcription(task_id: str):
    try:
        await cancel_batch_job(task_id)
        if task_id in tasks_store:
            tasks_store[task_id]["status"] = "CANCELLED"
            tasks_store[task_id]["error"] = "Transcription was cancelled by user."
        return {"success": True, "status": "CANCELLED"}
    except Exception as exc:
        print(f"Error cancelling task {task_id}: {exc}")
        return {"success": False, "error": str(exc)}
