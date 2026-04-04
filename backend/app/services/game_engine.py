"""
game_engine.py

Orchestrates the full game lifecycle:
  lobby → 6 rounds → leaderboard
"""

import asyncio
from app.models.room import Room, RoomStatus
from app.models.game_state import GameState
from app.state.rooms_store import get_room, save_room
from app.state.game_store import get_game, save_game
from app.state.player_store import get_players_in_room
from app.services.scenario_manager import generate_scenarios
from app.services.round_manager import run_round
from app.constants.game_constants import TOTAL_ROUNDS
from app.utils.logger import get_logger

log = get_logger(__name__)


async def start_game(room_code: str, broadcast_fn, difficulty: str = "easy") -> bool:
    """
    Generates 3 difficulty-tuned scenarios, then runs all rounds sequentially.
    Called after a 3s delay so all clients have time to connect to the game WS.
    """
    room = get_room(room_code)
    if not room:
        log.warning(f"start_game: room {room_code} not found")
        return False

    if room.status == RoomStatus.FINISHED:
        log.warning(f"start_game: room {room_code} already finished")
        return False

    # ── Setup ─────────────────────────────────────────────────────────────────
    room.status = RoomStatus.PLAYING
    room.current_round = 0
    save_room(room)

    game = GameState(
        room_code=room_code,
        difficulty=difficulty,
        scenarios=await generate_scenarios(difficulty),
    )
    save_game(game)

    await broadcast_fn(room_code, {
        "event": "game_start",
        "room_code": room_code,
        "total_rounds": TOTAL_ROUNDS,
        "difficulty": difficulty,
    })

    log.info(f"Game started in room {room_code} — difficulty: {difficulty}")

    # ── Run rounds ────────────────────────────────────────────────────────────
    for round_number in range(1, TOTAL_ROUNDS + 1):
        room = get_room(room_code)
        if not room:
            break
        room.current_round = round_number
        save_room(room)

        await run_round(room_code, round_number, broadcast_fn)

    # ── After Round 1, keep game active for Round 2 ──────────────────────────
    log.info(f"Round 1 complete in {room_code}. Waiting for Round 2 or timeout...")
    
    # Wait up to 30 minutes for Round 2 to complete
    # The game stays PLAYING status during this time
    room = get_room(room_code)
    if room:
        room.status = RoomStatus.PLAYING  # Don't finish yet - Round 2 might run
        save_room(room)
    
    await asyncio.sleep(1800)  # 30 minute timeout
    
    # ── Finish ────────────────────────────────────────────────────────────────
    room = get_room(room_code)
    if room:
        room.status = RoomStatus.FINISHED
        save_room(room)

    leaderboard = _build_leaderboard(room_code)
    await broadcast_fn(room_code, {
        "event": "game_over",
        "room_code": room_code,
        "leaderboard": leaderboard,
    })

    log.info(f"Game finished in room {room_code}")
    return True


def _build_leaderboard(room_code: str):
    players = get_players_in_room(room_code)
    sorted_players = sorted(players, key=lambda p: p.score, reverse=True)
    return [
        {
            "rank": i + 1,
            "player_id": p.player_id,
            "nickname": p.nickname,
            "total_score": p.score,
        }
        for i, p in enumerate(sorted_players)
    ]
