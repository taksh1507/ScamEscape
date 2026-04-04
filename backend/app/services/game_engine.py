"""
game_engine.py

Orchestrates the full game lifecycle:
  lobby → Round 1 (Call) → Round 2 (WhatsApp) → leaderboard
"""

import asyncio
from app.models.room import Room, RoomStatus
from app.models.game_state import GameState
from app.state.rooms_store import get_room, save_room
from app.state.game_store import get_game, save_game
from app.state.player_store import get_players_in_room
from app.services.scenario_manager import generate_scenarios
from app.services.round_manager import run_round
from app.services.round2_game_manager import Round2GameManager
from app.constants.game_constants import TOTAL_ROUNDS
from app.utils.logger import get_logger

log = get_logger(__name__)

# Global store for Round 2 game managers (accessed by WebSocket handlers)
_round2_managers: dict = {}


def get_round2_manager(room_code: str) -> Round2GameManager:
    """Retrieve a Round 2 manager instance"""
    return _round2_managers.get(room_code)


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

    # ── Run Round 1 (Call Simulation) ──────────────────────────────────────────
    room = get_room(room_code)
    if room:
        room.current_round = 1
        save_room(room)
    
    await run_round(room_code, 1, broadcast_fn)
    log.info(f"Round 1 complete in {room_code}. Initializing Round 2...")

    # ── Initialize Round 2 (WhatsApp) ──────────────────────────────────────────
    players = get_players_in_room(room_code)
    player_ids = [p.player_id for p in players]
    
    try:
        manager = Round2GameManager(room_code, difficulty)
        init_result = await manager.initialize_game(player_ids, None)
        _round2_managers[room_code] = manager
        
        # Update room status and current round
        room = get_room(room_code)
        if room:
            room.current_round = 2
            room.status = RoomStatus.PLAYING
            save_room(room)
        
        # Broadcast Round 2 is ready
        await broadcast_fn(room_code, {
            "event": "round2_ready",
            "round_number": 2,
            "difficulty": difficulty,
            "scammer": init_result.get("scammer", {}),
        })
        
        log.info(f"Round 2 initialized for room {room_code}")
    except Exception as e:
        log.error(f"Failed to initialize Round 2: {str(e)}")
        await broadcast_fn(room_code, {
            "event": "error",
            "message": "Failed to start Round 2",
        })
    
    # ── Wait for Round 2 to complete (up to 15 minutes) ──────────────────────────
    await asyncio.sleep(900)  # 15 minute timeout for Round 2
    
    
    # ── Finish ────────────────────────────────────────────────────────────────
    log.info(f"Game finished in {room_code}")
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
