"""
Room state store.

Backed by Redis (key `room:{code}`, TTL-bounded so abandoned rooms clean
themselves up) so multiple backend instances share the same room state —
this is the fix for the single-instance in-memory bottleneck. Falls back to
a local dict automatically if Redis isn't reachable, so local dev without
Redis still works exactly as before.
"""
import json
from dataclasses import asdict
from typing import Dict, Optional
from app.models.room import Room, RoomStatus
from app.core.redis_client import get_client
from app.utils.logger import get_logger

log = get_logger(__name__)

# Rooms are abandoned lobbies/finished games — a few hours is plenty.
ROOM_TTL_SECONDS = 4 * 60 * 60

_KEY_PREFIX = "room:"
_INDEX_KEY = "rooms:index"  # Redis SET of all known room_codes

# In-memory fallback store, used only when Redis is unavailable.
_local_rooms: Dict[str, Room] = {}


def _to_json(room: Room) -> str:
    data = asdict(room)
    data["status"] = room.status.value  # str Enum -> plain string
    return json.dumps(data)


def _from_json(raw: str) -> Room:
    data = json.loads(raw)
    data["status"] = RoomStatus(data["status"])
    return Room(**data)


def get_room(room_code: str) -> Optional[Room]:
    r = get_client()
    if r is not None:
        raw = r.get(_KEY_PREFIX + room_code)
        return _from_json(raw) if raw else None
    return _local_rooms.get(room_code)


def save_room(room: Room) -> None:
    r = get_client()
    if r is not None:
        r.set(_KEY_PREFIX + room.room_code, _to_json(room), ex=ROOM_TTL_SECONDS)
        r.sadd(_INDEX_KEY, room.room_code)
        return
    _local_rooms[room.room_code] = room


def delete_room(room_code: str) -> None:
    r = get_client()
    if r is not None:
        r.delete(_KEY_PREFIX + room_code)
        r.srem(_INDEX_KEY, room_code)
        return
    _local_rooms.pop(room_code, None)


def all_rooms() -> Dict[str, Room]:
    r = get_client()
    if r is not None:
        codes = r.smembers(_INDEX_KEY)
        result: Dict[str, Room] = {}
        stale = []
        for code in codes:
            room = get_room(code)
            if room is not None:
                result[code] = room
            else:
                # TTL expired but the index entry is still around — prune it.
                stale.append(code)
        if stale:
            r.srem(_INDEX_KEY, *stale)
        return result
    return dict(_local_rooms)
