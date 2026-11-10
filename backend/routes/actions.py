"""API routes for managing extracted actions."""
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.actions import (
    save_action,
    update_action_status,
    list_actions,
    get_action,
)
from schemas.extraction import ExtractedAction
from auth import get_current_user

router = APIRouter()


class ActionListResponse(BaseModel):
    actions: list[dict[str, Any]] = []
    count: int = 0


class ActionUpdateRequest(BaseModel):
    user_status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    person_or_party: Optional[str] = None
    due_date_text: Optional[str] = None
    due_at: Optional[str] = None
    payment_method: Optional[str] = None
    amount_minor_units: Optional[int] = None
    currency: Optional[str] = None
    user_id: Optional[str] = None


@router.get("/actions", response_model=ActionListResponse)
async def get_actions(status: Optional[str] = None, user: dict[str, Any] = Depends(get_current_user)):
    actions = list_actions(user["id"], status)
    return ActionListResponse(actions=actions, count=len(actions))


@router.get("/actions/{action_id}")
async def get_single_action(action_id: str, user_id: Optional[str] = None, user: dict[str, Any] = Depends(get_current_user)):
    action = get_action(action_id, user["id"])
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    return action


@router.post("/actions")
async def create_action(
    action: ExtractedAction,
    user_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    user: dict[str, Any] = Depends(get_current_user),
):
    saved = save_action(user["id"], conversation_id, action)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save action")
    return saved


@router.patch("/actions/{action_id}")
async def patch_action(
    action_id: str,
    request: ActionUpdateRequest,
    user_id: Optional[str] = None,
    user: dict[str, Any] = Depends(get_current_user),
):
    updates = request.model_dump(exclude_none=True)
    updates.pop("user_id", None)
    if updates.get("user_status") == "confirmed":
        current = get_action(action_id, user["id"])
        if not current:
            raise HTTPException(status_code=404, detail="Action not found")
        if current.get("grounding_status") != "grounded":
            raise HTTPException(
                status_code=409,
                detail="Only evidence-grounded actions can be confirmed",
            )
    updated = update_action_status(action_id, user["id"], updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Action not found or update failed")
    return updated