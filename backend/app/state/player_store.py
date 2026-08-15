"""
Player state store. See rooms_store.py for the Redis-vs-local-fallback
rationale — same pattern here.
"""
import json
from dataclasses import asdict
from typing import Dict, List, Optional
from app.models.player import Player
from app.core.redis_client import get_client
from app.utils.logger import get_logger

log = get_logger(__name__)

PLAYER_TTL_SECONDS = 4 * 60 * 60

_KEY_PREFIX = "player:"
_ROOM_INDEX_PREFIX = "room_players:"  # Redis SET per room_code of player_ids

# In-memory fallback store, used only when Redis is unavailable.
_local_players: Dict[str, Player] = {}


def _to_json(player: Player) -> str:
    return json.dumps(asdict(player))


def _from_json(raw: str) -> Player:
    return Player(**json.loads(raw))


def get_player(player_id: str) -> Optional[Player]:
    r = get_client()
    if r is not None:
        raw = r.get(_KEY_PREFIX + player_id)
        return _from_json(raw) if raw else None
    return _local_players.get(player_id)


def save_player(player: Player) -> None:
    r = get_client()
    if r is not None:
        r.set(_KEY_PREFIX + player.player_id, _to_json(player), ex=PLAYER_TTL_SECONDS)
        r.sadd(_ROOM_INDEX_PREFIX + player.room_code, player.player_id)
        r.expire(_ROOM_INDEX_PREFIX + player.room_code, PLAYER_TTL_SECONDS)
        return
    _local_players[player.player_id] = player


def delete_player(player_id: str) -> None:
    r = get_client()
    if r is not None:
        player = get_player(player_id)
        r.delete(_KEY_PREFIX + player_id)
        if player is not None:
            r.srem(_ROOM_INDEX_PREFIX + player.room_code, player_id)
        return
    _local_players.pop(player_id, None)


def get_players_in_room(room_code: str) -> List[Player]:
    r = get_client()
    if r is not None:
        player_ids = r.smembers(_ROOM_INDEX_PREFIX + room_code)
        players = []
        stale = []
        for pid in player_ids:
            p = get_player(pid)
            if p is not None:
                players.append(p)
            else:
                stale.append(pid)
        if stale:
            r.srem(_ROOM_INDEX_PREFIX + room_code, *stale)
        return players
    return [p for p in _local_players.values() if p.room_code == room_code]
