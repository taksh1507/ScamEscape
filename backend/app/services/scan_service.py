"""
scan_service.py

Analyzes a pasted message or screenshot for scam indicators (the "FraudGuard"
scanner feature). This used to live entirely in the Next.js frontend
(frontend/app/api/chat/route.ts), calling Groq directly from a server route.
It now lives here so there is a single AI integration layer for the whole
app, shared prompt/model config, and one place to add rate limiting.
"""

import json
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

# Reuse the same Groq (OpenAI-compatible) client pattern used elsewhere
# in the backend (see ai_service.py) rather than a separate client per file.
client: Optional[AsyncOpenAI] = None
if settings.GROQ_API_KEY:
    try:
        client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
        )
    except Exception as e:
        log.error(f"❌ Failed to initialize GROQ client for scan_service: {e}")
        client = None
else:
    log.warning("⚠️ GROQ_API_KEY not found. Scam scanner disabled.")

SYSTEM_PROMPT = """You are FraudGuard AI, an expert cybersecurity assistant specializing in detecting scams, phishing attempts, and fraud in India and globally.

Analyze the input and respond ONLY in this exact JSON format with no extra text, no markdown, no code fences:

{
  "riskLevel": "HIGH",
  "riskScore": 85,
  "redFlags": ["Urgent language to create panic", "Requesting bank details"],
  "explanation": "This message exhibits classic scam traits including prize winning claims and requests for sensitive bank information.",
  "recommendedActions": ["Do not share bank details", "Report to 1930 cybercrime helpline", "Block the sender"],
  "scamType": "Lottery Scam"
}

riskLevel must be one of: HIGH, MEDIUM, LOW, SAFE
scamType must be one of: Phishing, Vishing, Smishing, Investment Fraud, KYC Fraud, Job Scam, Lottery Scam, None, Other
riskScore is a number from 0 to 100.
Be aggressive in flagging scams — prize winning messages, requests for bank info, urgent claims are almost always HIGH risk.
Return ONLY the raw JSON object. No explanation outside the JSON. No markdown. No code fences."""

DEFAULT_RESULT: Dict[str, Any] = {
    "riskLevel": "UNKNOWN",
    "riskScore": 50,
    "redFlags": [],
    "explanation": "Could not parse response. Please try again.",
    "recommendedActions": ["Try again with more detail."],
    "scamType": "Other",
}


def _parse_response(raw: str) -> Dict[str, Any]:
    cleaned = raw.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        result = dict(DEFAULT_RESULT)
        if cleaned:
            result["explanation"] = cleaned
        return result


async def analyze_text(message: str) -> Dict[str, Any]:
    """Analyze a plain-text message for scam indicators."""
    if not client:
        raise RuntimeError("Scam scanner is unavailable: GROQ_API_KEY not configured.")

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=1024,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyze this for scam indicators:\n\n{message}"},
        ],
    )
    return _parse_response(response.choices[0].message.content or "")


async def analyze_image(image_base64: str, image_mime_type: str, message: Optional[str] = None) -> Dict[str, Any]:
    """Analyze a screenshot (base64-encoded) for scam indicators using a vision model."""
    if not client:
        raise RuntimeError("Scam scanner is unavailable: GROQ_API_KEY not configured.")

    mime_type = image_mime_type or "image/jpeg"
    text_prompt = (
        f"Analyze this screenshot for scam indicators. Additional context: {message}"
        if message
        else "Read all the text in this screenshot and analyze it for scam indicators. Extract every word visible in the image."
    )

    user_content: List[Dict[str, Any]] = [
        {
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{image_base64}"},
        },
        {"type": "text", "text": text_prompt},
    ]

    response = await client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens=1024,
        temperature=0.2,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )
    return _parse_response(response.choices[0].message.content or "")
