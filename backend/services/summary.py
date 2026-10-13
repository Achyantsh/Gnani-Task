import os
import sys
import asyncio
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

    models = [
        "gemini-3.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash-lite"
    ]


    # url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={api_key}"

    prompt = f"""
        Provide a clear and concise summary of this transcript in {target_language} for the given transcript in PLAIN TEXT (NO MARKDOWN, example: **Tailwind CSS** to Tailwind CSS):

        {transcript}
        """

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        # Retry up to 3 times with exponential backoff
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=60.0) as httpClient:
                    response = await httpClient.post(url, json=payload)

                    if response.status_code == 200:
                        data = response.json()
                        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

                    if response.status_code == 503:
                        wait_time = 2 ** attempt  # 1s, 2s, 4s
                        print(f"Gemini 503 on {model}, retrying in {wait_time}s (attempt {attempt + 1}/3)")
                        await asyncio.sleep(wait_time)
                        continue

                    # Non-retryable error — skip to next model
                    print(f"Gemini API error {response.status_code} on {model}: {response.text[:150]}")
                    break

            except Exception as exc:
                wait_time = 2 ** attempt
                print(f"Error with {model} (attempt {attempt + 1}/3): {exc}")
                await asyncio.sleep(wait_time)

        print(f"All retries exhausted for model {model}, trying next...")

    return "Summary unavailable."
