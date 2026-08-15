"""
websocket.py

Manages active WebSocket connections *local to this process* and provides
broadcast_to_room(), used by game_engine, round_manager, and the lobby.

── Why this needed a Redis pub/sub layer ───────────────────────────────────
Previously, `_connections` only tracked sockets connected to THIS backend
process. That's fine with one instance, but breaks the moment you run two:
a message published by instance A would never reach a client that happened
to be connected to instance B, even though both are in the same room.

Fix: every message goes out over a Redis pub/sub channel (`room:{code}`).
Every instance subscribes to `room:*` on startup and delivers incoming
messages to whichever of ITS OWN local connections match that room. So the
publish step and the "who do I have locally" step are fully decoupled —
broadcast_to_room() never sends directly; it always publishes, and delivery
happens via the subscriber, uniformly, whether it's a 1-instance or
10-instance deployment.

If Redis is unavailable, we fall back to the old direct-local-send behavior
(single-instance only) so local dev without Redis still works exactly as
before.
"""

import asyncio
import json
from typing import Dict, List, Optional
from fastapi import WebSocket
from app.core.redis_client import get_async_redis, is_redis_connected
from app.utils.logger import get_logger

log = get_logger(__name__)

PUBSUB_PATTERN = "room:*"

# room_code -> list of active WebSocket connections *on this process*
_connections: Dict[str, List[WebSocket]] = {}

# ws -> player metadata  (used by lobby to track who owns which socket)
_ws_meta: Dict[int, dict] = {}   # id(ws) -> {"room_code": ..., "player_id": ..., "nickname": ...}

# Background task running the pub/sub subscriber loop, if Redis is up.
_listener_task: Optional[asyncio.Task] = None


def register(room_code: str, ws: WebSocket, player_id: str = "", nickname: str = "") -> None:
    _connections.setdefault(room_code, []).append(ws)
    _ws_meta[id(ws)] = {"room_code": room_code, "player_id": player_id, "nickname": nickname}
    log.info(f"WS registered — room {room_code} ({len(_connections[room_code])} local connections)")


def unregister(room_code: str, ws: WebSocket) -> None:
    conns = _connections.get(room_code, [])
    if ws in conns:
        conns.remove(ws)
    _ws_meta.pop(id(ws), None)
    if not conns:
        _connections.pop(room_code, None)
    log.info(f"WS unregistered — room {room_code}")


def get_connection_count(room_code: str) -> int:
    """Local-only count. Under multiple instances this is NOT the room's
    total connection count — just how many of them landed on this process."""
    return len(_connections.get(room_code, []))


def get_room_connections(room_code: str) -> List[WebSocket]:
    return list(_connections.get(room_code, []))


async def _deliver_locally(room_code: str, message: dict) -> None:
    """Send to whichever connections for this room are on THIS process."""
    conns = _connections.get(room_code, [])
    if not conns:
        return
    dead = []
    payload = json.dumps(message)
    for ws in conns:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        unregister(room_code, ws)


async def broadcast_to_room(room_code: str, message: dict) -> None:
    """Publish a JSON message for a room. Delivery to connected clients
    happens via the pub/sub subscriber (see start_pubsub_listener), so this
    works correctly whether this room's players are all on this instance or
    spread across several.
    """
    aclient = get_async_redis()
    if aclient is not None:
        try:
            await aclient.publish(f"room:{room_code}", json.dumps(message))
            return
        except Exception as e:
            log.warning(f"Redis publish failed, falling back to local delivery: {e}")
    # No Redis (or publish failed) — degrade to direct local delivery,
    # same behavior as before this migration.
    await _deliver_locally(room_code, message)


async def send_to_player(ws: WebSocket, message: dict) -> None:
    """Send a JSON message to a single WebSocket connection.

    Point-to-point, so it never needs to go through pub/sub — the caller
    always holds the actual connection object already.
    """
    try:
        await ws.send_text(json.dumps(message))
    except Exception as e:
        log.warning(f"Failed to send to player: {e}")


# ─── Pub/sub subscriber lifecycle ──────────────────────────────────────────

async def _pubsub_loop() -> None:
    aclient = get_async_redis()
    if aclient is None:
        return
    pubsub = aclient.pubsub()
    await pubsub.psubscribe(PUBSUB_PATTERN)
    log.info(f"📡 Subscribed to Redis pattern '{PUBSUB_PATTERN}' for WS broadcast")
    try:
        async for msg in pubsub.listen():
            if msg is None or msg.get("type") != "pmessage":
                continue
            channel = msg.get("channel", "")
            room_code = channel.split(":", 1)[1] if ":" in channel else None
            if not room_code:
                continue
            try:
                data = json.loads(msg["data"])
            except (TypeError, ValueError):
                continue
            await _deliver_locally(room_code, data)
    except asyncio.CancelledError:
        pass
    finally:
        try:
            await pubsub.punsubscribe(PUBSUB_PATTERN)
            await pubsub.aclose()
        except Exception:
            pass


async def start_pubsub_listener() -> None:
    """Start the background subscriber task. No-op if Redis isn't connected
    (broadcast_to_room falls back to local-only delivery in that case)."""
    global _listener_task
    if not is_redis_connected():
        log.info("Redis not connected — WS broadcast will be local-instance-only")
        return
    if _listener_task is not None and not _listener_task.done():
        return
    _listener_task = asyncio.create_task(_pubsub_loop())


async def stop_pubsub_listener() -> None:
    global _listener_task
    if _listener_task is not None:
        _listener_task.cancel()
        try:
            await _listener_task
        except (asyncio.CancelledError, Exception):
            pass
        _listener_task = None
