"""
scoring.py

Evaluates a player's action against the correct answer.
Grade thresholds and point values mirror the frontend's POINTS and GRADE
constants in CallSimulation.tsx so the result screen renders consistently.
"""

import time
from typing import Dict, Any

# Points per action — mirrors POINTS in CallSimulation.tsx
# For non-call rounds the same keys are reused where applicable;
# any action not in this map scores 0.
_BASE_POINTS: Dict[str, int] = {
    # call round keys
    "hang_up":       10,
    "call_back":      8,
    "ask_questions":  6,
    "share":          0,
    # sms / email / bank round keys
    "ignore":        10,
    "report":         8,
    "login_direct":  10,
    "visit_branch":   8,
    "call_bank":      8,
    "call_friend":   10,
    # danger keys
    "click":          0,
    "send_money":     0,
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
