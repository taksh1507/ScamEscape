from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import asyncio
from app.schemas.room_schema import CreateRoomRequest, JoinRoomRequest, RoomResponse, PlayerInfo
from app.services.room_manager import create_room, join_room, leave_room
from app.services.game_engine import start_game
from app.state.player_store import get_players_in_room, get_player
from app.state.rooms_store import get_room, all_rooms
from app.core.websocket import register, unregister, broadcast_to_room, send_to_player
from app.utils.logger import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("/create", response_model=dict)
def api_create_room(body: CreateRoomRequest):
    try:
        room, player = create_room(body.nickname)
        return {
            "room_code": room.room_code,
            "player_id": player.player_id,
            "is_leader": True,
        }
    except Exception as e:
        log.error(f"Error creating room: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create room: {str(e)}")


@router.post("/join", response_model=dict)
def api_join_room(body: JoinRoomRequest):
    room, player, error = join_room(body.nickname, body.room_code.upper())
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {
        "room_code": room.room_code,
        "player_id": player.player_id,
        "is_leader": False,
    }


@router.delete("/leave/{player_id}")
def api_leave_room(player_id: str):
    room_code = leave_room(player_id)
    return {"left": True, "room_code": room_code}


@router.get("/list", response_model=list)
def api_list_rooms():
    """Return all rooms with their current player counts."""
    rooms = all_rooms()
    result = []
    for room in rooms.values():
        players = get_players_in_room(room.room_code)
        result.append({
            "room_code": room.room_code,
            "status": room.status.value,
            "player_count": len(room.player_ids),
            "max_players": 6,
            "players": [
                {"player_id": p.player_id, "nickname": p.nickname, "is_leader": p.is_leader}
                for p in players
            ],
        })
    return result


@router.get("/{room_code}", response_model=RoomResponse)
def api_get_room(room_code: str):
    room = get_room(room_code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    players = get_players_in_room(room_code.upper())
    return RoomResponse(
        room_code=room.room_code,
        status=room.status.value,
        player_count=len(room.player_ids),
        current_round=room.current_round,
        players=[
            PlayerInfo(
                player_id=p.player_id,
                nickname=p.nickname,
                score=p.score,
                is_leader=p.is_leader,
            )
            for p in players
        ],
    )


# ─── Lobby WebSocket ──────────────────────────────────────────────────────────
# Connects before the game starts. Tracks who is in the lobby and broadcasts
# player_joined / player_left / room_update events to all lobby members.

@router.websocket("/ws/lobby/{room_code}/{player_id}")
async def lobby_websocket(ws: WebSocket, room_code: str, player_id: str):
    room_code = room_code.upper()
    await ws.accept()

    room = get_room(room_code)
    player = get_player(player_id)

    if not room or not player:
        await send_to_player(ws, {"event": "error", "message": "Invalid room or player"})
        await ws.close()
        return

    register(room_code, ws, player_id=player_id, nickname=player.nickname)
    log.info(f"Lobby: {player.nickname} joined room {room_code}")

    # Broadcast join to everyone in the lobby
    players = get_players_in_room(room_code)
    await broadcast_to_room(room_code, {
        "event": "player_joined",
        "player_id": player_id,
        "nickname": player.nickname,
        "players": [
            {"player_id": p.player_id, "nickname": p.nickname, "is_leader": p.is_leader}
            for p in players
        ],
    })

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                await send_to_player(ws, {"event": "pong"})

            elif msg_type == "chat":
                text = str(data.get("text", ""))[:200]
                await broadcast_to_room(room_code, {
                    "event": "chat",
                    "player_id": player_id,
                    "nickname": player.nickname,
                    "text": text,
                })

            elif msg_type == "start_game":
                # Only the room leader is allowed to start the game
                current_room = get_room(room_code)
                if not current_room:
                    await send_to_player(ws, {"event": "error", "message": "Room not found"})
                    continue
                if current_room.leader_id != player_id:
                    await send_to_player(ws, {"event": "error", "message": "Only the room leader can start the game"})
                    continue

                difficulty = data.get("difficulty", "easy")
                if difficulty not in ("easy", "medium", "hard"):
                    difficulty = "easy"

                log.info(f"Leader {player.nickname} starting game in room {room_code} — difficulty: {difficulty}")

                # Step 1: tell all lobby clients to navigate to the simulation page
                await broadcast_to_room(room_code, {
                    "event": "game_starting",
                    "room_code": room_code,
                    "difficulty": difficulty,
                    "started_by": player.nickname,
                })

                # Step 2: wait for ALL clients to open their game WS, then start.
                async def _launch(rc: str = room_code, diff: str = difficulty):
                    await asyncio.sleep(3.0)
                    log.info(f"Launching game engine for room {rc} — difficulty: {diff}")
                    await start_game(rc, broadcast_to_room, difficulty=diff)

                asyncio.create_task(_launch())

    except WebSocketDisconnect:
        unregister(room_code, ws)
        # Do NOT call leave_room here — if the game is launching, the player
        # record must stay alive. The player navigated to the simulation page.
        remaining = get_players_in_room(room_code)
        await broadcast_to_room(room_code, {
            "event": "player_left",
            "player_id": player_id,
            "nickname": player.nickname,
            "players": [
                {"player_id": p.player_id, "nickname": p.nickname, "is_leader": p.is_leader}
                for p in remaining
            ],
        })
        log.info(f"Lobby: {player.nickname} left room {room_code}")
