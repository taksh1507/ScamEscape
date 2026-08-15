"""
Game state store. See rooms_store.py for the Redis-vs-local-fallback
rationale — same pattern here.

GameState is the most complex of the three state dataclasses (nested
CallState dataclasses keyed by player_id, plus a CallPhase str-Enum field),
so unlike rooms/players it needs an explicit reconstruction step rather
than a flat `Model(**data)` — `asdict()` flattens CallState into plain
dicts on the way out, and those need to become CallState objects again
(with `phase` turned back into a CallPhase member) on the way in.
"""
import json
from dataclasses import asdict
from typing import Dict, Optional
from app.models.game_state import GameState, CallState
from app.constants.scenario_types import CallPhase
from app.core.redis_client import get_client
from app.utils.logger import get_logger

log = get_logger(__name__)

GAME_TTL_SECONDS = 4 * 60 * 60

_KEY_PREFIX = "game:"

# In-memory fallback store, used only when Redis is unavailable.
_local_games: Dict[str, GameState] = {}


def _to_json(game: GameState) -> str:
    data = asdict(game)  # recursively flattens call_states' CallState objects too
    return json.dumps(data)


def _from_json(raw: str) -> GameState:
    data = json.loads(raw)
    data["call_states"] = {
        player_id: CallState(
            phase=CallPhase(cs["phase"]),
            history=cs.get("history", []),
            is_cautious=cs.get("is_cautious", False),
            is_impulsive=cs.get("is_impulsive", False),
        )
        for player_id, cs in data.get("call_states", {}).items()
    }
    return GameState(**data)


def get_game(room_code: str) -> Optional[GameState]:
    r = get_client()
    if r is not None:
        raw = r.get(_KEY_PREFIX + room_code)
        return _from_json(raw) if raw else None
    return _local_games.get(room_code)


def save_game(game: GameState) -> None:
    r = get_client()
    if r is not None:
        r.set(_KEY_PREFIX + game.room_code, _to_json(game), ex=GAME_TTL_SECONDS)
        return
    _local_games[game.room_code] = game


def delete_game(room_code: str) -> None:
    r = get_client()
    if r is not None:
        r.delete(_KEY_PREFIX + room_code)
        return
    _local_games.pop(room_code, None)
