"""Webhook endpoints for real-time Gnani callbacks."""
from typing import Any
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
import asyncio
import os
import base64
import uuid

from services.gnani import fetch_completed_transcript, create_batch_job, start_batch_job
from services.summary import generate_summary
from services.extraction import extract_actions
from services.actions import save_action
from services.r2 import get_presigned_download_url, upload_to_r2
from routes.shared import tasks_store, process_completed_transcription_wrapper, broadcast_event, set_broadcast_event
from fastapi.responses import HTMLResponse
from auth import get_current_user

router = APIRouter()

# Register the local broadcast_event with shared module
set_broadcast_event(broadcast_event)


class GnaniWebhookPayload(BaseModel):
    """Expected payload from Gnani Batch callback."""
    job_id: str
    status: str
    progress: dict[str, Any] | None = None
    config: dict[str, Any] | None = None
    cancel_reason: str | None = None


# In-memory set to track processed webhook job_ids for idempotency
processed_webhook_jobs: set[str] = set()


@router.post("/webhooks/gnani")
async def gnani_webhook(request: Request):
    """
    Receive Gnani Batch STT completion callback.

    Expected payload:
    {
        "job_id": "...",
        "status": "COMPLETED",
        "progress": {...},
        "config": {...}
    }
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    job_id = payload.get("job_id")
    status = payload.get("status", "").upper()

    if not job_id:
        raise HTTPException(status_code=400, detail="job_id required")

    print(f"[Webhook] Gnani job {job_id} status: {status}")

    # Idempotency: skip if we've already processed this job_id
    if job_id in processed_webhook_jobs:
        print(f"[Webhook] Job {job_id} already processed, skipping")
        return {"success": True, "message": "Webhook already processed"}

    if status == "COMPLETED":
        # Mark as processing to prevent duplicate processing from webhook+poll race
        processed_webhook_jobs.add(job_id)

        # Get task info from tasks_store
        task = tasks_store.get(job_id)
        if not task:
            print(f"[Webhook] Job {job_id} not found in tasks_store, may have been processed by polling")
            return {"success": True, "message": "Job not in local store"}

        # Process in background to return webhook quickly
        asyncio.create_task(process_webhook_completion(job_id, task))

    return {"success": True, "message": "Webhook received"}


async def process_webhook_completion(job_id: str, task: dict[str, Any]):
    """Process completed transcription from webhook (runs in background)."""
    try:
        print(f"[Webhook] Processing completion for {job_id}")

        # Check if already completed (polling may have finished first)
        if task.get("completed_result"):
            print(f"[Webhook] Job {job_id} already completed by polling, skipping")
            return

        # Process the transcription
        await process_completed_transcription_wrapper(job_id, task)
        print(f"[Webhook] Successfully processed {job_id}")

    except Exception as exc:
        print(f"[Webhook] Error processing {job_id}: {exc}")
        # Remove from processed set so retry can happen
        processed_webhook_jobs.discard(job_id)


@router.post("/webhooks/gnani/test")
async def gnani_webhook_test(request: Request):
    """Test endpoint to verify webhook delivery."""
    payload = await request.json()
    print(f"[Test Webhook] Received: {payload}")
    return {"success": True, "received": payload}


# SSE Event streaming for real-time frontend updates
from fastapi.responses import StreamingResponse
import asyncio
import json

# In-memory event store (replace with Redis in production)
event_subscribers: dict[str, list[asyncio.Queue]] = {}


async def event_generator(user_id: str):
    """SSE event generator for a user with heartbeat to prevent timeout."""
    queue = asyncio.Queue()

    if user_id not in event_subscribers:
        event_subscribers[user_id] = []
    event_subscribers[user_id].append(queue)

    try:
        # Send initial connection event
        yield f"data: {json.dumps({'type': 'connected', 'user_id': user_id})}\n\n"

        # Heartbeat interval - send a comment every 30 seconds to keep connection alive
        heartbeat_interval = 30
        last_heartbeat = asyncio.get_event_loop().time()

        while True:
            # Wait for event with timeout for heartbeat
            try:
                event = await asyncio.wait_for(queue.get(), timeout=heartbeat_interval)
                yield f"data: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Send heartbeat as SSE comment (doesn't trigger onmessage)
                current_time = asyncio.get_event_loop().time()
                if current_time - last_heartbeat >= heartbeat_interval:
                    yield ": heartbeat\n\n"
                    last_heartbeat = current_time
    finally:
        if user_id in event_subscribers:
            event_subscribers[user_id].remove(queue)


def broadcast_event(user_id: str, event: dict):
    """Broadcast event to all subscribers of a user."""
    if user_id in event_subscribers:
        for queue in event_subscribers[user_id]:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass


@router.get("/events/{user_id}")
async def sse_events(user_id: str, user: dict[str, Any] = Depends(get_current_user)):
    """Server-Sent Events endpoint for real-time updates."""
    if user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return StreamingResponse(
        event_generator(user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/webhooks/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Receive WhatsApp voice message webhook.

    Expected from WhatsApp Business API or Twilio:
    - MediaUrl for audio file
    - From (phone number)
    - MessageSid
    """
    # This is a placeholder for WhatsApp integration
    # In production, you'd:
    # 1. Verify webhook signature
    # 2. Download audio from MediaUrl
    # 3. Upload to R2
    # 4. Create Gnani job with callback_url
    # 5. Return TwiML response

    try:
        payload = await request.json()
    except Exception:
        # Try form data (Twilio sends form)
        form = await request.form()
        payload = dict(form)

    print(f"[WhatsApp Webhook] Received: {payload}")

    # For demo: just acknowledge
    return {"success": True, "message": "WhatsApp webhook received (demo mode)"}


@router.post("/demo/whatsapp-receive")
async def demo_whatsapp_receive(request: Request):
    """
    Demo endpoint to simulate receiving a WhatsApp voice note.
    This bypasses the need for ngrok/WhatsApp API during development.

    Expected JSON:
    {
        "audio_base64": "base64_encoded_audio",
        "filename": "voice_note.ogg",
        "phone_number": "+919876543210",
        "language_code": "hi-IN"
    }
    """
    import base64
    import uuid

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    audio_base64 = payload.get("audio_base64")
    filename = payload.get("filename", "voice_note.ogg")
    phone_number = payload.get("phone_number", "demo_user")
    language_code = payload.get("language_code", "hi-IN")

    if not audio_base64:
        raise HTTPException(status_code=400, detail="audio_base64 required")

    # Decode base64 audio
    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {e}")

    # Upload to R2
    file_key = f"whatsapp/{phone_number}/{uuid.uuid4()}_{filename}"
    upload_success = upload_to_r2(file_key, audio_bytes, "audio/ogg")

    if not upload_success:
        raise HTTPException(status_code=500, detail="R2 upload failed")

    # Create Gnani job with callback_url
    from services.gnani import create_batch_job, start_batch_job
    from config import GNANI_CALLBACK_URL

    audio_download_url = get_presigned_download_url(file_key, expires_in=7200)
    callback_url = os.getenv("GNANI_CALLBACK_URL")

    job_id = await create_batch_job(audio_download_url, language_code, callback_url=callback_url)
    await start_batch_job(job_id)

    # Store task for polling
    from routes.transcription import tasks_store
    tasks_store[job_id] = {
        "file_key": file_key,
        "filename": filename,
        "language_code": language_code,
        "user_id": phone_number,
        "status": "TRANSCRIBING",
        "completed_result": None,
        "error": None,
    }

    # Broadcast via SSE to update UI if user is connected
    from routes.webhooks import broadcast_event
    broadcast_event(phone_number, {
        "type": "whatsapp_received",
        "task_id": job_id,
        "data": {
            "filename": filename,
            "phone_number": phone_number,
            "language_code": language_code
        }
    })

    return {
        "success": True,
        "task_id": job_id,
        "message": "WhatsApp voice note received and processing started",
        "file_key": file_key
    }


@router.get("/demo/whatsapp-test")
async def whatsapp_test_page():
    """Serve a simple HTML page to test WhatsApp demo flow."""
    from fastapi.responses import HTMLResponse
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>AudioNote WhatsApp Demo</title>
        <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .dropzone { border: 2px dashed #ccc; padding: 40px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .dropzone.dragover { border-color: #007bff; background: #f0f8ff; }
            button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:disabled { background: #ccc; cursor: not-allowed; }
            .result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 4px; }
            .status { padding: 10px; background: #e8f5e9; border-radius: 4px; margin: 10px 0; }
            .error { background: #fdeaea; }
        </style>
    </head>
    <body>
        <h1>🎙️ AudioNote WhatsApp Demo</h1>
        <p>Upload a voice note to simulate WhatsApp forward flow</p>

        <div class="dropzone" id="dropzone">
            <p>Drag & drop audio file here or click to browse</p>
            <input type="file" id="fileInput" accept="audio/*" style="display:none">
        </div>

        <div>
            <label>Language: </label>
            <select id="language">
                <option value="hi-IN">Hindi (हिंदी)</option>
                <option value="en-IN">English (India)</option>
                <option value="ta-IN">Tamil (தமிழ்)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
            </select>
        </div>

        <br>
        <button id="submitBtn" onclick="submitAudio()" disabled>Process Voice Note</button>

        <div id="result"></div>

        <script>
            const dropzone = document.getElementById('dropzone');
            const fileInput = document.getElementById('fileInput');
            const submitBtn = document.getElementById('submitBtn');
            const resultDiv = document.getElementById('result');

            let selectedFile = null;

            dropzone.addEventListener('click', () => fileInput.click());
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) handleFile(e.target.files[0]);
            });

            function handleFile(file) {
                if (!file.type.startsWith('audio/')) {
                    alert('Please select an audio file');
                    return;
                }
                selectedFile = file;
                dropzone.innerHTML = `<p>Selected: ${file.name} (${(file.size/1024).toFixed(1)} KB)</p>`;
                submitBtn.disabled = false;
            }

            async function submitAudio() {
                if (!selectedFile) return;

                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
                resultDiv.innerHTML = '<div class="status">Converting to base64...</div>';

                const base64 = await fileToBase64(selectedFile);
                const language = document.getElementById('language').value;

                resultDiv.innerHTML = '<div class="status">Sending to AudioNote...</div>';

                try {
                    const response = await fetch('/demo/whatsapp-receive', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            audio_base64: base64,
                            filename: selectedFile.name,
                            phone_number: '+919876543210',
                            language_code: language
                        })
                    });

                    const data = await response.json();
                    if (data.success) {
                        resultDiv.innerHTML = `
                            <div class="status">✅ ${data.message}</div>
                            <p><strong>Task ID:</strong> ${data.task_id}</p>
                            <p><strong>File Key:</strong> ${data.file_key}</p>
                            <p>Check the <a href="/inbox" target="_blank">Action Inbox</a> for results!</p>
                        `;
                        // Start polling for completion
                        pollForCompletion(data.task_id);
                    } else {
                        resultDiv.innerHTML = `<div class="status error">❌ ${data.message || data.error}</div>`;
                    }
                } catch (e) {
                    resultDiv.innerHTML = `<div class="status error">❌ Error: ${e.message}</div>`;
                }

                submitBtn.disabled = false;
                submitBtn.textContent = 'Process Voice Note';
            }

            function fileToBase64(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            async function pollForCompletion(taskId) {
                resultDiv.innerHTML += '<div class="status">⏳ Polling for completion...</div>';
                while (true) {
                    await new Promise(r => setTimeout(r, 5000));
                    try {
                        const res = await fetch(`/transcribe/${taskId}`);
                        const data = await res.json();
                        if (data.status === 'COMPLETED') {
                            resultDiv.innerHTML = `
                                <div class="status">✅ Transcription Complete!</div>
                                <p><strong>Transcript:</strong> ${data.transcript?.substring(0, 200)}...</p>
                                <p><strong>Summary:</strong> ${data.summary?.substring(0, 200)}...</p>
                                <p><a href="/inbox" target="_blank">View Actions in Inbox →</a></p>
                            `;
                            break;
                        } else if (data.status === 'FAILED') {
                            resultDiv.innerHTML += `<div class="status error">❌ Failed: ${data.error}</div>`;
                            break;
                        } else {
                            resultDiv.innerHTML += `<div class="status">⏳ Status: ${data.lifecycle_stage || data.status}</div>`;
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)