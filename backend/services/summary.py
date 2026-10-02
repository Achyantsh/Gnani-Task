import os
import sys
from pathlib import Path
import httpx
from dotenv import load_dotenv
from config import LANGUAGE_NAMES

load_dotenv()

async def generate_summary(transcript: str, language_code: str = "en-IN") -> str:

    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if not api_key or not transcript.strip():
        return "Summary unavailable."

    lang_code = (language_code or "en").split("-")[0].lower()
    target_language = LANGUAGE_NAMES.get(lang_code, "English")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

    prompt = f"""
        Provide a clear and concise summary of this transcript in {target_language} for the given transcript:

        {transcript}
        """

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as httpClient:
            response = await httpClient.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()

            print(f"Gemini API error {response.status_code}: {response.text[:150]}")
    except Exception as exc:
        print(f"Error generating summary: {exc}")

    return "Summary unavailable."
