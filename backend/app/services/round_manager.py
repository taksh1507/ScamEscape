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
    Supports: Call (Round 1), Chat (Round 2)
    """
    game = get_game(room_code)
    if not game:
        return

    scenario_data = game.scenarios[round_number - 1]
    scenario_type = scenario_data.get("type", "call")
    
    if scenario_type == "call" or scenario_type == ScenarioType.CALL:
        await run_adaptive_call_round(room_code, round_number, broadcast_fn)
    elif scenario_type == "chat":
        await run_chat_simulation_round(room_code, round_number, broadcast_fn)
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
            "ttl": time.time() + 120  # Message valid for 2 minutes
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
        
        # ❌ REMOVED: Don't mark action as done until user actually submits
        # game.round_actions[p.player_id] = "connected"
        # game.round_action_times[p.player_id] = time.time()
        
        await broadcast_fn(room_code, {
            "event": "call_update",
            "player_id": p.player_id,
            "data": {
                "phase": CallPhase.AUTHORITY,
                "message": initial_message,  # ← Use real script, not generic phase response
                "suggested_actions": suggested_actions,  # ← Use properly formatted options
                "caller": scenario_data["payload"]["caller"],
                "ttl": time.time() + 30  # Message valid for 30 seconds
            }
        })

    # Adaptive scoring helper
    def all_calls_ended(g):
        if not g:
            log.warning("Game is None in all_calls_ended")
            return False
        if not g.call_states:
            log.warning(f"call_states is empty for room {g.room_code}")
            return False
        
        phases = [(pid, cs.phase.value) for pid, cs in g.call_states.items()]
        ended_count = sum(1 for _, phase in phases if phase in ['success', 'failure'])
        total_count = len(phases)
        
        result = all(cs.phase in [CallPhase.SUCCESS, CallPhase.FAILURE] for cs in g.call_states.values())
        log.info(f"all_calls_ended: {ended_count}/{total_count} calls ended - phases={phases} - result={result}")
        return result

    # The adaptive round stays active until all players reach SUCCESS/FAILURE or timeout
    ADAPTIVE_ROUND_TIMEOUT = 120 # 2 minutes
    start_time = time.time()
    
    while time.time() - start_time < ADAPTIVE_ROUND_TIMEOUT:
        game = get_game(room_code)
        if not game or all_calls_ended(game):
            log.info(f"🎯 All calls ended for room {room_code} - breaking loop")
            break
        
        # Broadcast timer tick for UI
        remaining = int(ADAPTIVE_ROUND_TIMEOUT - (time.time() - start_time))
        await broadcast_fn(room_code, {
            "event": "timer_tick",
            "round_number": round_number,
            "remaining": remaining,
            "ttl": time.time() + 2  # Timer tick valid for 2 seconds (updates every 0.5s)
        })
        
        # 🔥 Check more frequently (every 0.5 seconds) so hangups are detected immediately
        await asyncio.sleep(0.5)
    
    game = get_game(room_code)
    if not game: return
    game.round_active = False
    save_game(game)
    
    log.info(f"Round {round_number} ended for room {room_code}. Call states: {[(p, c.phase.value if c else 'None') for p, c in game.call_states.items()]}")
    
    # ── Scoring ──
    # For adaptive round, we determine points based on final phase
    result_entries = []
    from app.services.scoring import evaluate_action
    from app.state.player_store import save_player, get_player
    from app.services.mongodb_service import MongoDBService
    from app.utils.id_generator import generate_id
    
    for p in players:
        call_state = game.call_states.get(p.player_id)
        # Determine final action type based on phase
        final_action = "no_action"
        was_scammed = False  # 🔥 Track if player was scammed
        
        if call_state:
            if call_state.phase == CallPhase.FAILURE: # Scammer failed (User won)
                final_action = "hang_up"
                was_scammed = False  # ✅ Player avoided scam
            elif call_state.phase == CallPhase.SUCCESS: # Scammer won (User fell for it)
                final_action = "share"
                was_scammed = True  # ❌ Player got scammed
        
        log.debug(f"Player {p.player_id}: phase={call_state.phase.value if call_state else 'None'} -> action={final_action} -> was_scammed={was_scammed}")
        
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
            # 🔥 Check if frontend submitted a score - use it if available
            frontend_score = game.frontend_scores.get(p.player_id)
            if frontend_score:
                # Use frontend AI score
                points_awarded = frontend_score.get("points", res["points_awarded"])
                grade_letter = frontend_score.get("grade", "B")
                tip = frontend_score.get("tip", res["tip"])
                # Map grade letter to color
                grade_colors = {"A": "#00e676", "B": "#fbc02d", "C": "#ff9800", "D": "#f44336", "F": "#d32f2f"}
                grade_color = grade_colors.get(grade_letter, "#fbc02d")
                grade_label = {"A": "Excellent", "B": "Good", "C": "Average", "D": "Poor", "F": "Failed"}.get(grade_letter, "Good")
                log.info(f"✅ Using frontend score for {p.player_id}: points={points_awarded}, grade={grade_letter}")
            else:
                # Fall back to backend evaluation
                points_awarded = res["points_awarded"]
                grade_letter = res["grade"]["letter"]
                grade_label = res["grade"]["label"]
                grade_color = res["grade"]["color"]
                tip = res["tip"]
                log.info(f"ℹ️ No frontend score for {p.player_id}, using backend evaluation")
            
            # 🔥 RECORD PLAYER PERFORMANCE for leaderboard
            from app.services.game_engine import record_player_performance
            record_player_performance(p.player_id, was_scammed, points_awarded)
            
            player.score += points_awarded
            save_player(player)
            
            result_entries.append({
                "player_id": p.player_id,
                "nickname": player.nickname,
                "action": final_action,
                "points_awarded": points_awarded,
                "grade_letter": grade_letter,
                "grade_label": grade_label,
                "grade_color": grade_color,
                "tip": tip,
                "total_score": player.score,
            })
            
            # Save response analysis to MongoDB
            response_data = {
                "response_id": generate_id("resp"),
                "room_code": room_code,
                "player_id": p.player_id,
                "round_number": round_number,
                "scenario_type": "call",
                "player_action": final_action,
                "correct_action": "hang_up",
                "is_correct": res["is_correct"],
                "points_awarded": res["points_awarded"],
                "response_time": res["response_time"],
                "speed_bonus": res["speed_bonus"],
                "grade": res["grade"]["letter"],
                "difficulty": game.difficulty,
                "feedback": f"{'✓ Great response!' if res['is_correct'] else '✗ Consider a safer approach next time.'}"
            }
            
            try:
                import asyncio
                asyncio.create_task(MongoDBService.save_response(response_data))
            except Exception as e:
                log.warning(f"⚠️ Failed to queue response save: {e}")

    # Broadcast round_result with AI analysis included
    log.info(f"📢 Broadcasting round_result for round {round_number} in room {room_code}")
    await broadcast_fn(room_code, {
        "event": "round_result",
        "round_number": round_number,
        "correct_action": "Hang up or block",
        "red_flags": scenario_data["red_flags"],
        "results": result_entries,
        "ttl": time.time() + 60  # Result valid for 60 seconds
    })
    
    log.info(f"Adaptive round {round_number} complete in room {room_code}")
    await asyncio.sleep(ROUND_BUFFER_SECONDS)

async def run_standard_timed_round(room_code: str, round_number: int, broadcast_fn) -> None:
    """The original timed round logic."""
    game = get_game(room_code)
    if not game:
        return

    # Get scenario from game state (now provided by game_engine)
    scenario_data = game.scenarios[round_number - 1] if game.scenarios else {}
    correct_action  = scenario_data.get("correct_action", "block")
    tip = game.scenarios[round_number - 1].get("payload", {}).get("tip", "Stay alert!")

    # ── 1. Broadcast start_round with scenario ────────────────────────────────
    game.round_active = True
    game.round_actions = {}
    game.submit_actions = {}       # 🔥 Clear submit_actions for new round
    game.user_actions = {}         # 🔥 Clear user_actions for new round
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
            "ttl": time.time() + ROUND_DURATION_SECONDS  # Valid for the round duration
        }
    })

    # ── 2. Countdown timer ────────────────────────────────────────────────────
    async def on_tick(remaining: int):
        await broadcast_fn(room_code, {
            "event": "timer_tick",
            "round_number": round_number,
            "remaining": remaining,
            "ttl": time.time() + 2  # Timer tick valid for 2 seconds
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
        "ttl": time.time() + 60  # Result valid for 60 seconds
    })

    log.info(f"Room {room_code} — round {round_number} complete")

    # Buffer between rounds
    await asyncio.sleep(ROUND_BUFFER_SECONDS)


async def run_chat_simulation_round(room_code: str, round_number: int, broadcast_fn) -> None:
    """
    Runs Round 2: Chat Simulation
    
    This round is handled primarily on the frontend (WhatsApp-style chat UI).
    Backend waits for player decisions via WebSocket and scores them.
    """
    game = get_game(room_code)
    if not game:
        log.error(f"Game not found for room {room_code}")
        return

    scenario_data = game.scenarios[round_number - 1]
    game.round_active = True
    game.current_round_index = round_number - 1
    
    # 🔥 CRITICAL: Reset round state for new round
    game.round_actions = {}
    game.submit_actions = {}       # 🔥 Clear submit_actions for new round
    game.user_actions = {}         # 🔥 Clear user_actions for new round
    game.round_action_times = {}
    
    save_game(game)

    players = get_players_in_room(room_code)
    correct_action = scenario_data.get("correct_action", "detect_scam")
    round_start_time = time.time()

    # ── 1. Broadcast start_round for chat simulation ──
    await broadcast_fn(room_code, {
        "event": "start_round",
        "data": {
            "type": "chat",
            "round_number": round_number,
            "duration": 180,  # 3 minutes for chat
            "content": {
                "scenario_type": scenario_data.get("payload", {}).get("scenario_type", "relative_emergency"),
            },
            "red_flags": scenario_data.get("red_flags", ["Emotional pressure", "Urgent request", "Payment via link"]),
            "ttl": time.time() + 180  # Message valid for 3 minutes
        }
    })

    log.info(f"Room {room_code} - Round {round_number} (Chat) started, waiting for {len(players)} players")

    # ── 2. Wait for player decisions (chat_decision events) ──
    # Players will send their chat decisions via WebSocket
    # Decisions will be collected in game.round_actions
    # Wait up to 3 minutes for responses
    decision_timeout = 180  # 3 minutes
    decision_start = time.time()
    
    while time.time() - decision_start < decision_timeout:
        # Check if all players have made decisions
        game = get_game(room_code)
        num_decisions = len(game.round_actions) if game else 0
        num_players = len(players)
        
        if num_decisions >= num_players:
            log.info(f"✅ All {num_players} players in room {room_code} have made decisions for Round {round_number}")
            break
        
        await asyncio.sleep(0.5)  # Poll every 500ms

    # ── 3. Score the round ──
    game = get_game(room_code)
    if not game:
        return

    # Score each player's decision
    from app.services.scoring import evaluate_action
    score_results = {}
    
    for player in players:
        action = game.round_actions.get(player.player_id, "no_response")
        res = evaluate_action(
            action=action,
            correct_action=correct_action,
            submission_time=game.round_action_times.get(player.player_id, time.time()),
            round_start_time=round_start_time,
            round_duration=decision_timeout,
            tip=scenario_data.get("payload", {}).get("tip", "Stay alert!")
        )
        score_results[player.player_id] = res

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
                "action": game.round_actions.get(player_id, "no_response"),
                "points_awarded": res["points_awarded"],
                "grade_letter": res["grade"]["letter"],
                "grade_label": res["grade"]["label"],
                "grade_color": res["grade"]["color"],
                "tip": res["tip"],
                "total_score": player.score,
            })

    # ── 4. Broadcast round_result ──
    await broadcast_fn(room_code, {
        "event": "round_result",
        "round_number": round_number,
        "correct_action": correct_action,
        "red_flags": scenario_data["red_flags"],
        "results": result_entries,
        "ttl": time.time() + 60  # Result valid for 60 seconds
    })

    log.info(f"Room {room_code} — Round {round_number} (Chat) complete")

    # Buffer between rounds
    await asyncio.sleep(ROUND_BUFFER_SECONDS)
