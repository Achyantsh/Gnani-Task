"""Shared state and functions to break circular imports between routes."""
from typing import Any, Dict
import asyncio

# In-memory task store (replace with Redis in production)
tasks_store: Dict[str, Dict[str, Any]] = {}

# Function to be set by transcription module
_process_completed_transcription = None

# Function to be set by webhooks module
_broadcast_event = None


def set_process_completed_transcription(func):
    """Set the process_completed_transcription function from transcription module."""
    global _process_completed_transcription
    _process_completed_transcription = func


def set_broadcast_event(func):
    """Set the broadcast_event function from webhooks module."""
    global _broadcast_event
    _broadcast_event = func


async def process_completed_transcription_wrapper(job_id: str, task: dict[str, Any]):
    """Wrapper that calls the actual process_completed_transcription function."""
    if _process_completed_transcription:
        await _process_completed_transcription(job_id, task)
    else:
        print(f"[Shared] process_completed_transcription not set yet for {job_id}")


def broadcast_event_wrapper(user_id: str, event: dict):
    """Wrapper that calls the actual broadcast_event function."""
    if _broadcast_event:
        _broadcast_event(user_id, event)
    else:
        print(f"[Shared] broadcast_event not set yet for {user_id}")


# Export broadcast_event for transcription module
broadcast_event = broadcast_event_wrapper