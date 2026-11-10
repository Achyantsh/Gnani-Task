"""Structured extraction service: turns a transcript into evidence-grounded actions."""
import os
import asyncio
import re
import json
import httpx
from typing import Optional

from schemas.extraction import ExtractionResponse, ExtractedAction


def _normalize_with_offsets(text: str) -> tuple[str, list[int]]:
    """Normalize whitespace while retaining each normalized character's source index."""
    normalized: list[str] = []
    offsets: list[int] = []
    pending_space = False
    for index, character in enumerate(text):
        if character.isspace():
            pending_space = bool(normalized)
            continue
        if pending_space and normalized:
            normalized.append(" ")
            offsets.append(index - 1)
        normalized.append(character.lower())
        offsets.append(index)
        pending_space = False
    return "".join(normalized), offsets


def _find_quote(transcript: str, quote: str) -> Optional[tuple[int, int]]:
    """Find a verbatim quote in the transcript. Returns (start, end) char offsets or None."""
    if not quote:
        return None
    norm_transcript, transcript_offsets = _normalize_with_offsets(transcript)
    norm_quote, _ = _normalize_with_offsets(quote)
    idx = norm_transcript.find(norm_quote)
    if idx == -1:
        return None
    end_index = idx + len(norm_quote) - 1
    return transcript_offsets[idx], transcript_offsets[end_index] + 1


def validate_evidence(transcript: str, actions: list[ExtractedAction]) -> list[ExtractedAction]:
    """Validate each action's evidence_quote against the transcript."""
    validated = []
    for action in actions:
        if not action.evidence_quote:
            action.grounding_status = "ungrounded"
            action.missing_or_ambiguous_fields = list(action.missing_or_ambiguous_fields or []) + ["evidence_quote"]
            validated.append(action)
            continue

        offsets = _find_quote(transcript, action.evidence_quote)
        if offsets is None:
            action.grounding_status = "ungrounded"
            action.missing_or_ambiguous_fields = list(action.missing_or_ambiguous_fields or []) + ["evidence_quote_not_found"]
            validated.append(action)
            continue

        action.grounding_status = "grounded"
        validated.append(action)
    return validated


EXTRACTION_PROMPT = """You are a careful assistant that extracts structured commitments from a conversation transcript.

STRICT RULES:
1. Use ONLY facts explicitly stated in the transcript.
2. Do NOT infer amounts, people, deadlines, payment methods, ownership, or completed status.
3. Every action MUST include a verbatim `evidence_quote` copied from the transcript.
4. If a fact is absent, return `null`.
5. If a phrase is ambiguous, preserve the original wording and flag it for review.
6. Distinguish a promise/request from a completed action.
7. Preserve negations, cancellations, corrections, and changed plans.
8. If the speaker says "don't send tomorrow", do NOT extract "send tomorrow".
9. Do NOT treat hypothetical examples or questions as commitments.
10. Do NOT infer who owns a task unless the transcript identifies the owner.
11. Do NOT use external knowledge to fill missing business information.
12. Return ONLY valid JSON with no markdown fences.

JSON schema:
{{
  "summary": "Short factual summary of the conversation.",
  "actions": [
    {{
      "action_type": "delivery|task|payment_promise|appointment|follow_up|other",
      "title": "Short action title",
      "description": null,
      "person_or_party": null,
      "quantity": {{"value": 5, "unit": "cartons"}},
      "amount_minor_units": null,
      "currency": null,
      "payment_method": null,
      "due_date_text": "Friday",
      "due_at": null,
      "evidence_quote": "verbatim quote",
      "grounding_status": "needs_review",
      "missing_or_ambiguous_fields": []
    }}
  ],
  "open_questions": []
}}

Transcript:
{transcript}
"""


async def extract_actions(transcript: str, language_code: str = "en-IN") -> ExtractionResponse:
    """Extract structured actions from a transcript using Gemini."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or not transcript.strip():
        return ExtractionResponse(summary="Summary unavailable.", actions=[], open_questions=[])

    prompt = EXTRACTION_PROMPT.format(transcript=transcript)
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    models = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite"]

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0) as httpClient:
                    response = await httpClient.post(url, json=payload)

                    if response.status_code == 200:
                        data = response.json()
                        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                        text = re.sub(r"^```(?:json)?\s*", "", text)
                        text = re.sub(r"\s*```$", "", text)
                        parsed = json.loads(text)
                        result = ExtractionResponse(**parsed)
                        result.actions = validate_evidence(transcript, result.actions)
                        return result

                    if response.status_code == 503:
                        await asyncio.sleep(2 ** attempt)
                        continue

                    print(f"Gemini extraction error {response.status_code} on {model}: {response.text[:150]}")
                    break
            except Exception as exc:
                await asyncio.sleep(2 ** attempt)

    return ExtractionResponse(summary="Summary unavailable.", actions=[], open_questions=["Extraction failed."])