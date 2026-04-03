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


async def run_round(room_code: str, round_number: int, broadcast_fn) -> None:
    """
    Runs a single round end-to-end.
    broadcast_fn(room_code, message_dict) sends a WS message to all room players.
    """
    game = get_game(room_code)
    if not game:
        return

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
