"""
scoring.py

Evaluates a player's action against the correct answer.
Grade thresholds and point values mirror the frontend's POINTS and GRADE
constants in CallSimulation.tsx so the result screen renders consistently.

Enhanced with GROQ AI-powered dynamic scoring and vulnerability analysis.
"""

import time
import asyncio
from typing import Dict, Any, Optional
from app.utils.logger import get_logger

log = get_logger(__name__)

# Points per action — mirrors POINTS in CallSimulation.tsx
# For non-call rounds the same keys are reused where applicable;
# any action not in this map scores 0.
_BASE_POINTS: Dict[str, int] = {
    # call round keys
    "hang_up":           10,
    "call_back":          8,
    "ask_questions":      6,
    "share":              0,
    # chat round keys (WhatsApp scam detection)
    "detected_scam":     10,
    "detect_scam":       10,  # Alternate spelling
    "fell_for_scam":      0,
    "no_response":        0,
    # sms / email / bank round keys
    "ignore":            10,
    "report":             8,
    "login_direct":      10,
    "visit_branch":       8,
    "call_bank":          8,
    "call_friend":       10,
    # danger keys
    "click":              0,
    "send_money":         0,
}

# Grade metadata — mirrors GRADE in CallSimulation.tsx
_GRADE_MAP: Dict[str, Dict[str, str]] = {
    "A+": {"letter": "A+", "color": "#00e676", "label": "PERFECT RESPONSE"},
    "A":  {"letter": "A",  "color": "#00e5ff", "label": "STRONG RESPONSE"},
    "B":  {"letter": "B",  "color": "#ffb700", "label": "PARTIAL RESPONSE"},
    "F":  {"letter": "F",  "color": "#ff1744", "label": "CRITICAL FAILURE"},
}

def _grade_for_points(points: int) -> Dict[str, str]:
    if points == 10:
        return _GRADE_MAP["A+"]
    if points >= 8:
        return _GRADE_MAP["A"]
    if points >= 6:
        return _GRADE_MAP["B"]
    return _GRADE_MAP["F"]


def evaluate_action(
    action: str,
    correct_action: str,
    submission_time: float,
    round_start_time: float,
    round_duration: int,
    tip: str = "Stay alert and always verify unsolicited calls.",
    speed_bonus_max: int = 5,
) -> Dict[str, Any]:
    """
    Returns a result dict with:
        points_awarded : int
        grade          : dict (letter, color, label)
        is_correct     : bool
        response_time  : float (seconds taken)
        speed_bonus    : int
        tip            : str
    """
    base = _BASE_POINTS.get(action, 0)
    # Handle cases where correct_action might be a full string from AI
    if action.lower() == correct_action.lower():
        is_correct = True
        base = 10
    else:
        is_correct = (action == correct_action)

    # Speed bonus only on correct answers
    speed_bonus = 0
    response_time = submission_time - round_start_time
    if is_correct and response_time < round_duration:
        # Linear bonus: faster = more points, max at 0s, 0 at round_duration
        ratio = max(0.0, 1.0 - (response_time / round_duration))
        speed_bonus = round(ratio * speed_bonus_max)

    total = base + speed_bonus
    grade = _grade_for_points(base)   # grade based on base only (not speed bonus)

    return {
        "points_awarded": total,
        "grade": grade,
        "is_correct": is_correct,
        "response_time": round(response_time, 2),
        "speed_bonus": speed_bonus,
        "tip": tip
    }


def score_round(
    round_actions: Dict[str, str],          # player_id -> action
    round_action_times: Dict[str, float],   # player_id -> submission epoch
    correct_action: str,
    round_start_time: float,
    round_duration: int,
    tip: str = "Stay alert!",
    speed_bonus_max: int = 5,
) -> Dict[str, Dict[str, Any]]:
    """
    Scores all players for a round.
    Returns: player_id -> evaluate_action result dict
    """
    results = {}
    for player_id, action in round_actions.items():
        sub_time = round_action_times.get(player_id, round_start_time + round_duration)
        results[player_id] = evaluate_action(
            action=action,
            correct_action=correct_action,
            submission_time=sub_time,
            round_start_time=round_start_time,
            round_duration=round_duration,
            tip=tip,
            speed_bonus_max=speed_bonus_max,
        )
    return results


async def analyze_response_with_ai(
    player_action: str,
    correct_action: str,
    scenario_context: Dict[str, Any],
    is_correct: bool,
    response_time: float,
    difficulty: str = "medium"
) -> Dict[str, Any]:
    """
    🔥 AI-POWERED DYNAMIC SCORING
    Uses GROQ API to analyze player's response and generate:
    - Vulnerability percentage (0-100): How susceptible they are to this scam
    - Behavioral analysis: Why they chose this action
    - Personalized feedback: What they learned
    - Risk assessment: Specific vulnerabilities exploited
    
    Args:
        player_action: Action taken by player (hang_up, share, click, etc)
        correct_action: The correct/safe action
        scenario_context: Details about the scenario (caller, red_flags, script)
        is_correct: Whether the action was correct
        response_time: Time taken to respond
        difficulty: Game difficulty level
        
    Returns:
        Dict with vulnerability_percentage, analysis, and recommendations
    """
    try:
        from app.services.ai_service import get_groq_client
        from app.core.config import settings
        
        client = get_groq_client()
        if not client:
            log.warning("⚠️ GROQ client not available, using fallback scoring")
            return _get_fallback_ai_analysis(player_action, correct_action, is_correct)
        
        # Prepare analysis prompt
        scenario_desc = f"""
Scenario Type: {scenario_context.get('caller', 'Unknown')}
Red Flags: {', '.join(scenario_context.get('red_flags', []))}
Script Preview: {scenario_context.get('script', ['Unknown'])[0] if scenario_context.get('script') else 'Unknown'}
Difficulty: {difficulty}
"""
        
        analysis_prompt = f"""You are an expert scam analyst and cybersecurity trainer. Analyze this player's response to a scam scenario and provide a vulnerability score.

SCENARIO:
{scenario_desc}

PLAYER RESPONSE:
- Action Taken: {player_action}
- Correct Action: {correct_action}
- Action Correct: {'Yes' if is_correct else 'No'}
- Response Time: {response_time} seconds
- Difficulty Level: {difficulty}

ANALYZE AND RESPOND IN JSON FORMAT:
{{
    "vulnerability_percentage": <0-100 number. 0=immune to scam, 100=highly vulnerable>,
    "risk_assessment": "<2-3 sentence assessment of their vulnerability>",
    "behavioral_analysis": "<Why they chose this action based on human psychology>",
    "specific_vulnerabilities": ["<vulnerability 1>", "<vulnerability 2>", "<vulnerability 3>"],
    "safety_score": <0-100 number. 100=perfect safety decision>,
    "decision_speed_assessment": "<Was their response speed appropriate? Too fast/slow? Rushed decisions indicate panic>",
    "personalized_feedback": "<Specific, encouraging feedback for improvement>",
    "learning_point": "<Key lesson they should remember>",
    "real_world_impact": "<What would happen in a real scam if they made this choice>",
    "recommendation": "<Specific action to improve next time>"
}}

Be encouraging but honest. Focus on growth and learning. Provide actionable insights."""
        
        # Call GROQ API (run in thread pool to avoid blocking)
        log.info(f"🔥 Analyzing response with GROQ AI...")
        
        async def call_groq_api():
            return await asyncio.to_thread(
                client.messages.create,
                model="llama-3.3-70b-versatile",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": analysis_prompt}
                ]
            )
        
        message = await call_groq_api()
        response_text = message.content[0].text
        
        # Parse JSON response
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            analysis = json.loads(json_match.group())
        else:
            log.warning(f"⚠️ Failed to parse AI response, using fallback")
            return _get_fallback_ai_analysis(player_action, correct_action, is_correct)
        
        log.info(f"✅ AI Analysis Complete - Vulnerability: {analysis.get('vulnerability_percentage', 0)}%")
        return {
            "vulnerability_percentage": min(100, max(0, analysis.get("vulnerability_percentage", 50))),
            "risk_assessment": analysis.get("risk_assessment", ""),
            "behavioral_analysis": analysis.get("behavioral_analysis", ""),
            "specific_vulnerabilities": analysis.get("specific_vulnerabilities", []),
            "safety_score": min(100, max(0, analysis.get("safety_score", 0))),
            "decision_speed_assessment": analysis.get("decision_speed_assessment", ""),
            "personalized_feedback": analysis.get("personalized_feedback", ""),
            "learning_point": analysis.get("learning_point", ""),
            "real_world_impact": analysis.get("real_world_impact", ""),
            "recommendation": analysis.get("recommendation", ""),
            "ai_powered": True
        }
        
    except Exception as e:
        log.error(f"❌ AI Analysis Error: {e}", exc_info=True)
        return _get_fallback_ai_analysis(player_action, correct_action, is_correct)


def _get_fallback_ai_analysis(player_action: str, correct_action: str, is_correct: bool) -> Dict[str, Any]:
    """Fallback analysis when AI is unavailable"""
    if is_correct:
        vulnerability = 15  # Low vulnerability for correct action
        feedback = "Great job! You made the safe choice."
    else:
        vulnerability = 75  # High vulnerability for incorrect action
        feedback = "This action could be risky. Consider the safer option next time."
    
    return {
        "vulnerability_percentage": vulnerability,
        "risk_assessment": f"Your choice to {player_action} puts you at {'low' if is_correct else 'high'} risk for this scam.",
        "behavioral_analysis": "You responded based on your instincts without fully verifying the situation.",
        "specific_vulnerabilities": ["Trust without verification", "Rush to act"],
        "safety_score": 100 if is_correct else 40,
        "decision_speed_assessment": "Make sure not to rush important security decisions.",
        "personalized_feedback": feedback,
        "learning_point": f"Always verify requests independently, especially from unsolicited contacts.",
        "real_world_impact": f"In reality, {player_action} would {'protect you' if is_correct else 'put you at risk'}.",
        "recommendation": f"Try to {correct_action} instead next time.",
        "ai_powered": False
    }

