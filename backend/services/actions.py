"""Service for persisting and managing extracted actions."""
import os
from typing import Optional, Any
from supabase import create_client

from schemas.extraction import ExtractedAction


def _get_supabase_client():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)


def save_action(
    user_id: Optional[str],
    conversation_id: Optional[str],
    action: ExtractedAction,
    evidence_start_char: Optional[int] = None,
    evidence_end_char: Optional[int] = None,
) -> Optional[dict]:
    """Persist an extracted action. Returns the saved row or None."""
    client = _get_supabase_client()
    if not client:
        return None

    payload = {
        "user_id": user_id,
        "conversation_id": conversation_id,
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
        "evidence_start_char": evidence_start_char,
        "evidence_end_char": evidence_end_char,
        "grounding_status": action.grounding_status,
        "user_status": "needs_review",
    }
    try:
        result = client.table("extracted_actions").insert(payload).execute()
        return result.data[0] if result.data else None
    except Exception as exc:
        if conversation_id and action.evidence_quote:
            existing = (
                client.table("extracted_actions")
                .select("*")
                .eq("user_id", user_id)
                .eq("conversation_id", conversation_id)
                .eq("evidence_quote", action.evidence_quote)
                .limit(1)
                .execute()
            )
            if existing.data:
                return existing.data[0]
        print(f"Action save failed: {exc}")
        return None


def update_action_status(action_id: str, user_id: str, updates: dict) -> Optional[dict]:
    """Update an action's status (confirm, dismiss, complete, edit)."""
    client = _get_supabase_client()
    if not client:
        return None

    payload = {"updated_at": "now()"}
    if "user_status" in updates:
        payload["user_status"] = updates["user_status"]
    if "title" in updates:
        payload["title"] = updates["title"]
        payload["user_edited"] = True
    if "description" in updates:
        payload["description"] = updates["description"]
        payload["user_edited"] = True
    if "person_or_party" in updates:
        payload["person_or_party"] = updates["person_or_party"]
        payload["user_edited"] = True
    if "due_date_text" in updates:
        payload["due_date_text"] = updates["due_date_text"]
        payload["user_edited"] = True
    if "due_at" in updates:
        payload["due_at"] = updates["due_at"]
        payload["user_edited"] = True
    if "payment_method" in updates:
        payload["payment_method"] = updates["payment_method"]
        payload["user_edited"] = True
    if "amount_minor_units" in updates:
        payload["amount_minor_units"] = updates["amount_minor_units"]
        payload["user_edited"] = True
    if "currency" in updates:
        payload["currency"] = updates["currency"]
        payload["user_edited"] = True
    if updates.get("user_status") == "confirmed":
        payload["confirmed_at"] = "now()"
    if updates.get("user_status") == "completed":
        payload["completed_at"] = "now()"

    try:
        result = (
            client.table("extracted_actions")
            .update(payload)
            .eq("id", action_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as exc:
        print(f"Action update failed: {exc}")
        return None


def list_actions(user_id: str, status: Optional[str] = None) -> list[dict]:
    """List actions for a user, optionally filtered by status."""
    client = _get_supabase_client()
    if not client:
        return []

    query = client.table("extracted_actions").select("*").eq("user_id", user_id)
    if status:
        query = query.eq("user_status", status)
    try:
        result = query.order("created_at", desc=True).execute()
        return result.data or []
    except Exception as exc:
        print(f"Action list failed: {exc}")
        return []


def get_action(action_id: str, user_id: str) -> Optional[dict]:
    """Get a single action by ID, enforcing user ownership."""
    client = _get_supabase_client()
    if not client:
        return None
    try:
        result = (
            client.table("extracted_actions")
            .select("*")
            .eq("id", action_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as exc:
        print(f"Action get failed: {exc}")
        return None