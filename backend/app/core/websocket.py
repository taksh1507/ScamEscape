"""
websocket.py

Manages active WebSocket connections per room.
Provides broadcast_to_room() used by game_engine, round_manager, and lobby.
"""

import json
from typing import Dict, List, Optional
from fastapi import WebSocket
from app.utils.logger import get_logger

log = get_logger(__name__)

# room_code -> list of active WebSocket connections
_connections: Dict[str, List[WebSocket]] = {}

# ws -> player metadata  (used by lobby to track who owns which socket)
_ws_meta: Dict[int, dict] = {}   # id(ws) -> {"room_code": ..., "player_id": ..., "nickname": ...}


def register(room_code: str, ws: WebSocket, player_id: str = "", nickname: str = "") -> None:
    _connections.setdefault(room_code, []).append(ws)
    _ws_meta[id(ws)] = {"room_code": room_code, "player_id": player_id, "nickname": nickname}
    log.info(f"WS registered — room {room_code} ({len(_connections[room_code])} connections)")


def unregister(room_code: str, ws: WebSocket) -> None:
    conns = _connections.get(room_code, [])
    if ws in conns:
        conns.remove(ws)
    _ws_meta.pop(id(ws), None)
    if not conns:
        _connections.pop(room_code, None)
    log.info(f"WS unregistered — room {room_code}")


def get_connection_count(room_code: str) -> int:
    return len(_connections.get(room_code, []))


def get_room_connections(room_code: str) -> List[WebSocket]:
    return list(_connections.get(room_code, []))


async def broadcast_to_room(room_code: str, message: dict) -> None:
    """Send a JSON message to every connected client in the room."""
    conns = _connections.get(room_code, [])
    dead = []
    for ws in conns:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.append(ws)
    for ws in dead:
        unregister(room_code, ws)


async def send_to_player(ws: WebSocket, message: dict) -> None:
    """Send a JSON message to a single WebSocket connection."""
    try:
        await ws.send_text(json.dumps(message))
    except Exception as e:
        log.warning(f"Failed to send to player: {e}")
