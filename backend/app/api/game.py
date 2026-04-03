from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
import asyncio
import time
from app.schemas.action_schema import SubmitActionRequest
from app.services.game_engine import start_game, _build_leaderboard
from app.state.rooms_store import get_room
from app.state.game_store import get_game
from app.state.player_store import get_player
from app.core.websocket import register, unregister, broadcast_to_room, send_to_player
from app.models.room import RoomStatus
from app.utils.logger import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/game", tags=["game"])


# ─── REST: submit action (fallback for non-WS clients) ───────────────────────

@router.post("/action")
def api_submit_action(body: SubmitActionRequest):
    game = get_game(body.room_code.upper())
    if not game or not game.round_active:
        raise HTTPException(status_code=400, detail="No active round")
    game.round_actions[body.player_id] = body.action
    game.round_action_times[body.player_id] = time.time()
    from app.state.game_store import save_game
    save_game(game)
    return {"received": True}


@router.get("/leaderboard/{room_code}")
def api_leaderboard(room_code: str):
    room = get_room(room_code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"leaderboard": _build_leaderboard(room_code.upper())}


# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/ws/{room_code}/{player_id}")
async def websocket_endpoint(ws: WebSocket, room_code: str, player_id: str):
    room_code = room_code.upper()
    await ws.accept()

    room   = get_room(room_code)
    player = get_player(player_id)

    if not room or not player:
        await send_to_player(ws, {"event": "error", "message": "Invalid room or player"})
        await ws.close()
        return

    register(room_code, ws, player_id=player_id, nickname=player.nickname)
    log.info(f"Game WS: {player.nickname} connected to room {room_code}")

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "submit_action":
                action = data.get("action", "")
                game = get_game(room_code)
                if game and game.round_active:
                    if player_id not in game.round_actions:
                        game.round_actions[player_id] = action
                        game.round_action_times[player_id] = time.time()
                        from app.state.game_store import save_game
                        save_game(game)
                        await send_to_player(ws, {"event": "action_received", "action": action})
                else:
                    await send_to_player(ws, {"event": "error", "message": "No active round"})

            elif msg_type == "ping":
                await send_to_player(ws, {"event": "pong"})

    except WebSocketDisconnect:
        # Only unregister the WS connection — do NOT delete the player record.
        # The game engine still needs the player in the store to score rounds.
        unregister(room_code, ws)
        log.info(f"Game WS: {player.nickname} disconnected from room {room_code}")
