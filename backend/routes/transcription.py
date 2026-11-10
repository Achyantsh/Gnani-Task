import os
import time
import asyncio
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
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
from services.extraction import extract_actions, _find_quote
from services.actions import save_action
from routes.shared import tasks_store, broadcast_event, set_process_completed_transcription
from auth import get_current_user

router = APIRouter()
_processing_locks: dict[str, asyncio.Lock] = {}


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


async def process_completed_transcription(task_id: str, task: dict[str, Any]):
    lock = _processing_locks.setdefault(task_id, asyncio.Lock())
    async with lock:
        if task.get("completed_result"):
            return task["completed_result"]
        return await _process_completed_transcription(task_id, task)


async def _process_completed_transcription(task_id: str, task: dict[str, Any]):
    """Process completed transcription: fetch transcript, generate summary, extract actions, save."""
    try:
        transcript, duration, segments = await fetch_completed_transcript(task_id)
    except Exception as file_exc:
        print(f"Transcript files still finalizing for {task_id}: {file_exc}")
        raise

    file_key = task.get("file_key", "")
    filename = task.get("filename", "recording.wav")
    lang = task.get("language_code", "en-IN")
    user_id = task.get("user_id")

    # Generate summary
    summary = await generate_summary(transcript, lang)

    # Extract structured actions/commitments
    extraction = await extract_actions(transcript, lang)
    if extraction.actions:
        for action in extraction.actions:
            evidence_start = None
            evidence_end = None
            if action.evidence_quote and transcript:
                offsets = _find_quote(transcript, action.evidence_quote)
                if offsets:
                    evidence_start, evidence_end = offsets
            save_action(user_id, task_id, action, evidence_start, evidence_end)

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

    task["completed_result"] = result_data

    # Broadcast SSE event for real-time update
    if user_id:
        broadcast_event(user_id, {
            "type": "transcription_completed",
            "task_id": task_id,
            "data": result_data
        })
        # Also broadcast action_created for each new action
        if extraction.actions:
            for action in extraction.actions:
                broadcast_event(user_id, {
                    "type": "action_created",
                    "conversation_id": task_id,
                    "data": {
                        "id": action.action_type + "_" + task_id + "_" + str(hash(action.evidence_quote)),
                        "user_id": user_id,
                        "conversation_id": task_id,
                        "action_type": action.action_type,
                        "title": action.title,
                        "description": action.description,
                        "person_or_party": action.person_or_party,
                        "quantity_value": action.quantity.value if action.quantity else None,
                        "quantity_unit": action.quantity.unit if action.quantity else None,
                        "amount_minor_units": action.amount_minor_units,
                        "currency": action.currency,
                        "payment_method": action.payment_method,
                        "due_date_text": action.due_date_text,
                        "due_at": action.due_at,
                        "evidence_quote": action.evidence_quote,
                        "grounding_status": action.grounding_status,
                        "user_status": "needs_review",
                        "created_at": "",
                    }
                })

    return result_data


# Register the process_completed_transcription function with shared module
set_process_completed_transcription(process_completed_transcription)


@router.post("/transcribe", response_model=TranscribeResponse)
async def start_transcription(
    request: TranscribeRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    try:
        lang = normalize_language(request.language_code)

        audio_download_url = get_presigned_download_url(request.file_key, expires_in=7200)

        callback_url = os.getenv("GNANI_CALLBACK_URL")

        job_id = await create_batch_job(audio_download_url, lang, callback_url=callback_url)

        await start_batch_job(job_id)

        tasks_store[job_id] = {
            "file_key": request.file_key,
            "filename": request.filename,
            "language_code": lang,
            "user_id": user["id"],
            "status": "TRANSCRIBING",
            "completed_result": None,
            "error": None,
        }

        return TranscribeResponse(success=True, task_id=job_id)

    except Exception as exc:
        print(f"Error starting transcription: {exc}")
        return TranscribeResponse(success=False, error=str(exc))


@router.get("/transcribe/{task_id}", response_model=TaskStatusResponse, response_model_exclude_none=True)
async def get_transcription_status(
    task_id: str,
    user: dict[str, Any] = Depends(get_current_user),
):
    task = tasks_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task and task.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Task not found")

    if task and task.get("completed_result"):
        return TaskStatusResponse(**task["completed_result"])

    if task and task.get("error"):
        return TaskStatusResponse(status="FAILED", error=task["error"])

    # Short 4-second in-memory cache to prevent exhausting Gnani's rate limits
    if task and task.get("cached_status") and (time.time() - task.get("last_checked", 0) < 4.0):
        return TaskStatusResponse(**task["cached_status"])

    try:

        job_info = await get_batch_job_status(task_id)
        job_status = job_info.get("status", "UNKNOWN")

        if job_status == "RATE_LIMITED":
            if task and task.get("cached_status"):
                return TaskStatusResponse(**task["cached_status"])
            return TaskStatusResponse(status="TRANSCRIBING", lifecycle_stage="STARTING")

        if job_status in ("CREATED", "STARTING", "QUEUED", "IN_PROGRESS"):
            status_data = {"status": "TRANSCRIBING", "lifecycle_stage": job_status}
            if task:
                task["last_checked"] = time.time()
                task["cached_status"] = status_data
            return TaskStatusResponse(**status_data)

        if job_status in ("FAILED", "PARTIAL_FAILURE", "START_FAILED", "CANCELLED"):
            fallback_err = job_info.get("cancel_reason") or f"Gnani job ended with status: {job_status}"
            error_message = await get_batch_failure_reason(task_id, fallback_err)
            if task:
                task["error"] = error_message
            return TaskStatusResponse(status="FAILED", error=error_message)

        if job_status == "COMPLETED":
            if task and task.get("completed_result"):
                return TaskStatusResponse(**task["completed_result"])

            try:
                result = await process_completed_transcription(task_id, task)
                return TaskStatusResponse(**result)
            except Exception as file_exc:
                print(f"Transcript files still finalizing for {task_id}: {file_exc}")
                return TaskStatusResponse(status="TRANSCRIBING", lifecycle_stage="FINALIZING")

        return TaskStatusResponse(status=job_status, lifecycle_stage=job_status)

    except Exception as exc:
        print(f"Error checking status for {task_id}: {exc}")
        return TaskStatusResponse(status="FAILED", error=str(exc))


@router.post("/transcribe/{task_id}/cancel")
async def cancel_transcription(
    task_id: str,
    user: dict[str, Any] = Depends(get_current_user),
):
    task = tasks_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task and task.get("user_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        await cancel_batch_job(task_id)
        if task_id in tasks_store:
            tasks_store[task_id]["status"] = "CANCELLED"
            tasks_store[task_id]["error"] = "Transcription was cancelled by user."
        return {"success": True, "status": "CANCELLED"}
    except Exception as exc:
        print(f"Error cancelling task {task_id}: {exc}")
        return {"success": False, "error": str(exc)}