"""
ai_service.py

Generates dynamic scam scenarios using OpenAI based on difficulty.
Each scenario includes: caller, script, question, options, and correct_answer.
"""

import json
from typing import Optional, Dict, Any
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    AsyncOpenAI = None

from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

# Initialize OpenAI client if key is present and package is installed
client = None
if OPENAI_AVAILABLE and settings.OPENAI_API_KEY:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
elif not OPENAI_AVAILABLE:
    log.warning("OpenAI package not found. AI features will be disabled. Fallback mock generator will be used.")

SCENARIO_PROMPT = """
You are a creative scammer designing a realistic scam call scenario for a security training simulation.
Generate a JSON object for a "{difficulty}" difficulty scam call.

Rules:
1. Act as the scammer in the script, NOT an assistant.
2. The script must have 4-6 lines that logically follow this flow:
   - Introduction (who you are, e.g., Bank, E-commerce, Authority)
   - Problem (what is wrong, e.g., suspicious transaction, account locked)
   - Urgency/Threat (what will happen if they don't act, e.g., arrest, lose funds)
   - Action Request (what you want them to do, e.g., share OTP, click link)
3. Difficulty scaling:
   - Easy: Obvious scam, clear red flags, slightly unprofessional tone.
   - Medium: Semi-realistic, plausible caller, better grammar, moderate pressure.
   - Hard: Highly convincing, very professional tone, subtle manipulation, extreme pressure.
4. Output MUST be a valid JSON object with these keys:
   "caller": (string) The name of the organization/person calling.
   "script": (list of strings) 4-6 lines of dialogue.
   "question": (string) A question asking the user what to do next.
   "options": (list of strings) 4 distinct options for the user.
   "correct_answer": (string) The safest/correct option from the list.
   "tip": (string) A short (1 sentence) educational tip about this specific scam.

JSON format:
{{
  "caller": "...",
  "script": ["...", "..."],
  "question": "...",
  "options": ["...", "..."],
  "correct_answer": "...",
  "tip": "..."
}}
"""

async def generate_call_scenario(difficulty: str = "medium") -> Optional[Dict[str, Any]]:
    """
    Returns an AI-generated call scenario, or a robust mock if OpenAI is disabled.
    """
    if not client:
        log.debug("AI service disabled — using fallback mock generator")
        return _get_mock_scenario(difficulty)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a professional scam simulation generator."},
                {"role": "user", "content": SCENARIO_PROMPT.format(difficulty=difficulty)}
            ],
            response_format={"type": "json_object"}
        )
        
        scenario_data = json.loads(response.choices[0].message.content)
        log.info(f"Successfully generated AI scenario for difficulty: {difficulty}")
        return scenario_data
        
    except Exception as e:
        log.error(f"Error generating AI scenario: {e}")
        return _get_mock_scenario(difficulty)

def _get_mock_scenario(difficulty: str) -> Dict[str, Any]:
    """Fallback mock generator with some variety."""
    scams = [
        {
            "caller": "HDFC Bank Fraud Dept",
            "script": [
                "Hello, this is HDFC Bank fraud department calling.",
                "We have detected a transaction of ₹32,000 from your account.",
                "If this was not you, your account may be blocked temporarily.",
                "We need to verify your identity immediately to stop the transaction.",
                "Please confirm your card details to proceed."
            ],
            "question": "The caller is asking for your card details to 'stop' a fraud. What is your choice?",
            "options": ["Share details", "Hang up", "Ask for employee ID", "Call back officially"],
            "correct_answer": "Hang up",
            "tip": "Legitimate banks will never ask for your card details or OTP over a phone call."
        },
        {
            "caller": "Amazon Customer Care",
            "script": [
                "Hi, I am calling from Amazon support regarding your recent order.",
                "There was a payment failure and we need to process your refund.",
                "To receive your money back, I will send you a secure link via SMS.",
                "Please click the link and enter your bank login to accept the refund.",
                "If you don't do this now, the refund will expire in 10 minutes."
            ],
            "question": "The agent wants you to click a link to receive a refund. What do you do?",
            "options": ["Click link", "Disconnect", "Check app", "Ask for order ID"],
            "correct_answer": "Disconnect",
            "tip": "Amazon and other retailers never send links asking for bank login details to process refunds."
        }
    ]
    
    variant = random.choice(scams) if 'random' in globals() else scams[0]
    return variant

import random # for mock variety
