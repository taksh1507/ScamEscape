"""
ai_service.py

Generates dynamic scam scenarios and phase-specific call responses using Groq/LLaMA.
Each scenario includes: caller, script, question, options, and correct_answer.
"""

import json
import random
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from app.constants.scenario_types import CallPhase
from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

# Initialize Groq client (compatible with OpenAI API)
client = None
if settings.GROQ_API_KEY:
    client = AsyncOpenAI(
        api_key=settings.GROQ_API_KEY,
        base_url=settings.GROQ_BASE_URL
    )
else:
    log.warning("GROQ_API_KEY not found. AI features will be disabled. Fallback mock generator will be used.")

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

PHASE_RESPONSE_PROMPT = """
You are a convincing scammer in an interactive simulation. 
Generate a short, realistic call response based on the current phase and difficulty.

Context:
- Current Phase: {phase}
- Difficulty: {difficulty}
- Scammer Profile: {profile}
- Last User Action: {last_action}
- Call History: {history}

Difficulty Behavior Rules:
- EASY: Clear scam signals, poor grammar, one obviously safe option, others risky.
- MEDIUM: Natural tone, multiple reasonable-looking options, slight ambiguity.
- HARD: Highly realistic, professional language, all options look realistic, only subtle safety differences.

Output MUST be a valid JSON object:
{{
  "message": (string) The line you say to the user (max 2 sentences).
  "suggested_actions": (list of objects) 3-4 possible next actions for the user:
    {{
      "option": (string) The text for the button (e.g., "Confirm last 4 digits"),
      "risk_level": "low" | "medium" | "high",
      "tag": "safe" | "cautious" | "risky" | "dangerous",
      "explanation": (string) Why this option has this risk level,
      "better_action": (string) What the user should have done instead if this is risky.
    }}
}}
"""

async def generate_call_scenario(difficulty: str = "medium") -> Optional[Dict[str, Any]]:
    """
    Returns an AI-generated call scenario, or a robust mock if Groq is disabled.
    """
    if not client:
        log.debug("AI service disabled — using fallback mock generator")
        return _get_mock_scenario(difficulty)

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a professional scam simulation generator."},
                {"role": "user", "content": SCENARIO_PROMPT.format(difficulty=difficulty)}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI returned empty content")
            
        scenario_data = json.loads(content)
        log.info(f"Successfully generated AI scenario for difficulty: {difficulty}")
        return scenario_data
        
    except Exception as e:
        log.error(f"Error generating AI scenario: {e}")
        return _get_mock_scenario(difficulty)

async def generate_phase_response(
    phase: CallPhase,
    difficulty: str,
    profile: str,
    last_action: str = "none",
    history: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Generates a dynamic response for a specific phase of the scam call.
    """
    if not client:
        return _get_mock_phase_response(phase, difficulty)

    try:
        history_text = "\n".join(history[-3:]) if history else "None"
        prompt = PHASE_RESPONSE_PROMPT.format(
            phase=phase.value,
            difficulty=difficulty,
            profile=profile,
            last_action=last_action,
            history=history_text
        )

        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a professional scammer in a training simulation."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI returned empty content")
            
        scenario_data = json.loads(content)
        
        # Ensure suggested_actions is present and not empty
        if not scenario_data.get("suggested_actions"):
            scenario_data["suggested_actions"] = [
                {"option": "Ask for ID", "risk_level": "low", "tag": "safe", "explanation": "Verification is a safe step.", "better_action": "None."},
                {"option": "Agree", "risk_level": "high", "tag": "risky", "explanation": "Blindly agreeing is dangerous.", "better_action": "Verify first."},
                {"option": "Resist", "risk_level": "low", "tag": "safe", "explanation": "Resistance prevents further manipulation.", "better_action": "None."},
                {"option": "Hang up", "risk_level": "low", "tag": "safe", "explanation": "Hanging up is the safest response.", "better_action": "None."}
            ]
            
        return scenario_data
    except Exception as e:
        log.error(f"Error generating phase response: {e}")
        return _get_mock_phase_response(phase, difficulty)

def _get_mock_phase_response(phase: CallPhase, difficulty: str) -> Dict[str, Any]:
    """Fallback mock for phase responses with risk-rated options."""
    responses = {
        CallPhase.AUTHORITY: {
            "easy": "This is bank support, your account has issue.",
            "medium": "This is ICICI Bank fraud department calling regarding your account.",
            "hard": "Good evening, I’m calling from ICICI Bank’s fraud monitoring team regarding a flagged transaction."
        },
        CallPhase.URGENCY: {
            "easy": "Your account will be blocked now.",
            "medium": "Your account may be blocked within 10 minutes if not verified.",
            "hard": "We need immediate confirmation, otherwise the system will automatically restrict your account."
        }
    }
    
    msg = responses.get(phase, responses[CallPhase.AUTHORITY]).get(difficulty, "Hello?")
    
    # Mock risk-rated options based on difficulty
    if difficulty == "easy":
        suggested = [
            {"option": "Yes, I will share my OTP", "risk_level": "high", "tag": "dangerous", "explanation": "Directly sharing OTP is extremely risky.", "better_action": "Hang up immediately."},
            {"option": "I will call my bank directly", "risk_level": "low", "tag": "safe", "explanation": "Independent verification is the safest path.", "better_action": "None."},
            {"option": "Ignore the warning", "risk_level": "medium", "tag": "risky", "explanation": "Ignoring might not solve the issue if it were real.", "better_action": "Call official support."}
        ]
    elif difficulty == "medium":
        suggested = [
            {"option": "Can you confirm the transaction details?", "risk_level": "medium", "tag": "cautious", "explanation": "Engaging helps the scammer manipulate you.", "better_action": "Use the official app to check."},
            {"option": "I will verify through official app", "risk_level": "low", "tag": "safe", "explanation": "Official apps are secure channels.", "better_action": "None."},
            {"option": "Tell me what verification is needed", "risk_level": "high", "tag": "risky", "explanation": "Following their process leads to data loss.", "better_action": "Disconnect."}
        ]
    else: # hard
        suggested = [
            {"option": "Confirm the last 4 digits of my account", "risk_level": "medium", "tag": "cautious", "explanation": "Scammers often have some public info to gain trust.", "better_action": "Call using the number on your card."},
            {"option": "I will call the bank using official number", "risk_level": "low", "tag": "safe", "explanation": "Always use known official contacts.", "better_action": "None."},
            {"option": "Proceed with verification if needed", "risk_level": "high", "tag": "dangerous", "explanation": "Blindly proceeding is the goal of social engineering.", "better_action": "Stop and verify independently."}
        ]

    return {
        "message": msg,
        "suggested_actions": suggested
    }

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
    
    return random.choice(scams)
