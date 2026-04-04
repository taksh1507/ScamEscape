"""
round_manager.py

Controls the lifecycle of a single round:
  1. Broadcast scenario to all players
  2. Start countdown timer (backend-controlled for sync)
  3. Collect actions
  4. Score the round
  5. Broadcast results + updated scores
"""

import asyncio
import time
from typing import Dict, Any

from app.models.game_state import GameState
from app.state.game_store import get_game, save_game
from app.state.player_store import get_player, get_players_in_room
from app.services.scoring import score_round
from app.services.scenario_manager import get_scenario_for_round
from app.constants.game_constants import (
    ROUND_DURATION_SECONDS,
    ROUND_BUFFER_SECONDS,
    BASE_CORRECT_POINTS,
    SPEED_BONUS_MAX,
)
from app.utils.timer import countdown
from app.utils.logger import get_logger

log = get_logger(__name__)


from app.constants.scenario_types import ScenarioType, CallPhase
from app.services.adaptive_call_manager import AdaptiveCallManager
from app.services.ai_service import generate_phase_response
from app.models.game_state import CallState

async def run_round(room_code: str, round_number: int, broadcast_fn) -> None:
    """
    Runs a single round end-to-end.
    """
    game = get_game(room_code)
    if not game:
        return

    scenario_data = game.scenarios[round_number - 1]
    scenario_type = scenario_data["type"]
    
    if scenario_type == ScenarioType.CALL:
        await run_adaptive_call_round(room_code, round_number, broadcast_fn)
    else:
        await run_standard_timed_round(room_code, round_number, broadcast_fn)

async def run_adaptive_call_round(room_code: str, round_number: int, broadcast_fn) -> None:
    """Runs a multi-turn adaptive call round."""
    game = get_game(room_code)
    if not game: return

    scenario_data = game.scenarios[round_number - 1]
    game.round_active = True
    game.current_round_index = round_number - 1
    
    # Initialize call states for all players
    players = get_players_in_room(room_code)
    for p in players:
        game.call_states[p.player_id] = CallState(phase=CallPhase.AUTHORITY)
    
    save_game(game)

    # ── 1. Broadcast start_round so phone starts ringing ──
    await broadcast_fn(room_code, {
        "event": "start_round",
        "data": {
            "type": ScenarioType.CALL.value,  # 🔥 FIX: Ensure enum is converted to string
            "round_number": round_number,
            "duration": 120, # 2 min max
            "content": {
                "caller": scenario_data["payload"]["caller"],
                "script": [],
                "question": "Choose your response",
                "options": []
            },
            "red_flags": scenario_data["red_flags"],
        }
    })

    # Initial Scammer Message for each player
    for p in players:
        # 🔥 CRITICAL FIX: Use the actual scenario script, not a generic phase response
        script_lines = scenario_data["payload"].get("script", [])
        initial_message = script_lines[0] if script_lines else "Hello, this is a call."
        
        # Convert simple string options to proper action objects with risk_level
        raw_options = scenario_data["payload"].get("options", [])
        suggested_actions = []
        risk_levels = ["high", "medium", "low", "medium"]  # Assign risk levels to options
        for idx, opt_text in enumerate(raw_options):
            risk_level = risk_levels[idx % len(risk_levels)]
            suggested_actions.append({
                "option": opt_text,
                "risk_level": risk_level,
                "tag": "safe" if risk_level == "low" else "risky" if risk_level == "high" else "cautious",
                "explanation": f"This is a {risk_level} risk action.",
                "better_action": "Seek independent verification."
            })
        
        # Track that they were called
        game.round_actions[p.player_id] = "connected"
        game.round_action_times[p.player_id] = time.time()
        
        await broadcast_fn(room_code, {
            "event": "call_update",
            "player_id": p.player_id,
            "data": {
                "phase": CallPhase.AUTHORITY,
                "message": initial_message,  # ← Use real script, not generic phase response
                "suggested_actions": suggested_actions,  # ← Use properly formatted options
                "caller": scenario_data["payload"]["caller"]
            }
        })

    # Adaptive scoring helper
    def all_calls_ended(g):
        return all(cs.phase in [CallPhase.SUCCESS, CallPhase.FAILURE] for cs in g.call_states.values())

    # The adaptive round stays active until all players reach SUCCESS/FAILURE or timeout
    ADAPTIVE_ROUND_TIMEOUT = 120 # 2 minutes
    start_time = time.time()
    
    while time.time() - start_time < ADAPTIVE_ROUND_TIMEOUT:
        game = get_game(room_code)
        if not game or all_calls_ended(game):
            break
        
        # Broadcast timer tick for UI
        remaining = int(ADAPTIVE_ROUND_TIMEOUT - (time.time() - start_time))
        await broadcast_fn(room_code, {
            "event": "timer_tick",
            "round_number": round_number,
            "remaining": remaining,
        })
        
        await asyncio.sleep(2)
    
    game = get_game(room_code)
    if not game: return
    game.round_active = False
    save_game(game)
    
    # ── Scoring ──
    # For adaptive round, we determine points based on final phase
    result_entries = []
    from app.services.scoring import evaluate_action
    from app.state.player_store import save_player, get_player
    
    for p in players:
        call_state = game.call_states.get(p.player_id)
        # Determine final action type based on phase
        final_action = "no_action"
        if call_state:
            if call_state.phase == CallPhase.FAILURE: # Scammer failed (User won)
                final_action = "hang_up"
            elif call_state.phase == CallPhase.SUCCESS: # Scammer won (User fell for it)
                final_action = "share"
        
        res = evaluate_action(
            action=final_action,
            correct_action="hang_up", # The goal is to hang up
            submission_time=time.time(), # Not critical for adaptive
            round_start_time=start_time,
            round_duration=ADAPTIVE_ROUND_TIMEOUT,
            tip=scenario_data.get("payload", {}).get("tip", "Stay alert!")
        )
        
        player = get_player(p.player_id)
        if player:
            player.score += res["points_awarded"]
            save_player(player)
            result_entries.append({
                "player_id": p.player_id,
                "nickname": player.nickname,
                "action": final_action,
                "points_awarded": res["points_awarded"],
                "grade_letter": res["grade"]["letter"],
                "grade_label": res["grade"]["label"],
                "grade_color": res["grade"]["color"],
                "tip": res["tip"],
                "total_score": player.score,
            })

    # Broadcast round_result
    await broadcast_fn(room_code, {
        "event": "round_result",
        "round_number": round_number,
        "correct_action": "Hang up or block",
        "red_flags": scenario_data["red_flags"],
        "results": result_entries,
    })
    
    log.info(f"Adaptive round {round_number} complete in room {room_code}")
    await asyncio.sleep(ROUND_BUFFER_SECONDS)

async def run_standard_timed_round(room_code: str, round_number: int, broadcast_fn) -> None:
    """The original timed round logic."""
    game = get_game(room_code)
    if not game:
        return

    from app.services.scenario_manager import get_scenario_for_round
    scenario_public = get_scenario_for_round(game.scenarios, round_number)
    correct_action  = game.scenarios[round_number - 1]["correct_action"]
    tip = game.scenarios[round_number - 1].get("payload", {}).get("tip", "Stay alert!")

    # ── 1. Broadcast start_round with scenario ────────────────────────────────
    game.round_active = True
    game.round_actions = {}
    game.round_action_times = {}
    game.current_round_index = round_number - 1
    save_game(game)

    round_start_time = time.time()

    await broadcast_fn(room_code, {
        "event": "start_round",
        "data": {
            "type": scenario_public["type"],
            "round_number": round_number,
            "duration": ROUND_DURATION_SECONDS,
            "content": scenario_public["payload"],
            "red_flags": scenario_public["red_flags"],
        }
    })

    # ── 2. Countdown timer ────────────────────────────────────────────────────
    async def on_tick(remaining: int):
        await broadcast_fn(room_code, {
            "event": "timer_tick",
            "round_number": round_number,
            "remaining": remaining,
        })

    await countdown(ROUND_DURATION_SECONDS, on_tick)

    # ── 3. Close action window ────────────────────────────────────────────────
    game = get_game(room_code)   # re-fetch in case actions arrived
    if not game:
        return
    game.round_active = False
    save_game(game)

    # ── 4. Score the round ────────────────────────────────────────────────────
    score_results = score_round(
        round_actions=game.round_actions,
        round_action_times=game.round_action_times,
        correct_action=correct_action,
        round_start_time=round_start_time,
        round_duration=ROUND_DURATION_SECONDS,
        tip=tip,
        speed_bonus_max=SPEED_BONUS_MAX,
    )

    # Update player scores
    result_entries = []
    for player_id, res in score_results.items():
        player = get_player(player_id)
        if player:
            player.score += res["points_awarded"]
            from app.state.player_store import save_player
            save_player(player)
            result_entries.append({
                "player_id": player_id,
                "nickname": player.nickname,
                "action": game.round_actions.get(player_id, "no_action"),
                "points_awarded": res["points_awarded"],
                "grade_letter": res["grade"]["letter"],
                "grade_label": res["grade"]["label"],
                "grade_color": res["grade"]["color"],
                "tip": res["tip"],
                "total_score": player.score,
            })

    # Players who didn't respond get 0
    all_players = get_players_in_room(room_code)
    responded_ids = set(score_results.keys())
    for player in all_players:
        if player.player_id not in responded_ids:
            result_entries.append({
                "player_id": player.player_id,
                "nickname": player.nickname,
                "action": "no_action",
                "points_awarded": 0,
                "grade_letter": "F",
                "grade_label": "NO RESPONSE",
                "grade_color": "#ff1744",
                "tip": tip,
                "total_score": player.score,
            })

    # ── 5. Broadcast round_result ─────────────────────────────────────────────
    await broadcast_fn(room_code, {
        "event": "round_result",
        "round_number": round_number,
        "correct_action": correct_action,
        "red_flags": game.scenarios[round_number - 1]["red_flags"],
        "results": result_entries,
    })

    log.info(f"Room {room_code} — round {round_number} complete")

    # Buffer between rounds
    await asyncio.sleep(ROUND_BUFFER_SECONDS)
