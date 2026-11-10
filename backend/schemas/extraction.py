"""Pydantic schemas for structured action/commitment extraction."""
from typing import Optional, Any
from pydantic import BaseModel, Field


class QuantityModel(BaseModel):
    """A quantity with optional unit (e.g. 5 cartons)."""
    value: Optional[float] = None
    unit: Optional[str] = None


class ExtractedAction(BaseModel):
    """A single extracted action/commitment from a transcript."""
    action_type: str = Field(..., description="task|delivery|payment_promise|appointment|follow_up|other")
    title: str = Field(..., description="Short action title")
    description: Optional[str] = None
    person_or_party: Optional[str] = None
    quantity: Optional[QuantityModel] = None
    amount_minor_units: Optional[int] = Field(None, description="Amount in minor currency units (e.g. paise)")
    currency: Optional[str] = Field(None, description="ISO 4217 currency code (e.g. INR)")
    payment_method: Optional[str] = None
    due_date_text: Optional[str] = Field(None, description="Original phrase such as 'Friday'")
    due_at: Optional[str] = Field(None, description="ISO 8601 timestamp if resolvable, else null")
    evidence_quote: str = Field(..., description="Verbatim quote from transcript")
    grounding_status: str = Field("needs_review", description="grounded|ungrounded|needs_review")
    missing_or_ambiguous_fields: list[str] = Field(default_factory=list)


class ExtractionResponse(BaseModel):
    """Full extraction response from the LLM."""
    summary: str = Field(..., description="Short factual summary")
    actions: list[ExtractedAction] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)