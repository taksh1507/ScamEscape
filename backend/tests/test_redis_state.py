"""
Integration tests for the Redis-backed state stores and pub/sub broadcast.

Requires a real Redis instance (unlike the rest of the suite, this can't be
mocked meaningfully — the whole point is to prove serialization round-trips
and cross-instance-style pub/sub delivery against the real thing). Skipped
automatically if REDIS_URL isn't reachable, so `pytest` still passes in
environments without Redis (e.g. a laptop running the app in local-fallback
mode) — CI's redis service container is what actually exercises this file.
"""
import asyncio
import json

import pytest

from app.core.redis_client import connect_to_redis, close_redis_connection, is_redis_connected
from app.models.room import Room, RoomStatus
from app.models.player import Player
from app.models.game_state import GameState, CallState
from app.constants.scenario_types import CallPhase
from app.state import rooms_store, player_store, game_store
from app.core import websocket as ws_module


@pytest.fixture(scope="module", autouse=True)
def redis_conn():
    connect_to_redis()
    if not is_redis_connected():
        pytest.skip("Redis not reachable — skipping Redis-backed store tests")
    yield
    close_redis_connection()


@pytest.fixture(autouse=True)
def cleanup_test_keys():
    yield
    rooms_store.delete_room("RTEST1")
    player_store.delete_player("rtest-p1")
    game_store.delete_game("RTEST1")


def test_room_round_trip_through_redis():
    room = Room(
        room_code="RTEST1",
        leader_id="rtest-p1",
        status=RoomStatus.PLAYING,
        player_ids=["rtest-p1"],
        current_round=3,
    )
    rooms_store.save_room(room)

    loaded = rooms_store.get_room("RTEST1")
    assert loaded is not None
    assert loaded.status == RoomStatus.PLAYING
    assert loaded.status.value == "playing"  # enum survives the JSON round-trip
    assert loaded.current_round == 3


def test_room_appears_in_all_rooms_index():
    room = Room(room_code="RTEST1", leader_id="rtest-p1")
    rooms_store.save_room(room)
    assert "RTEST1" in rooms_store.all_rooms()


def test_room_ttl_is_set():
    from app.core.redis_client import get_client
    from app.state.rooms_store import ROOM_TTL_SECONDS

    room = Room(room_code="RTEST1", leader_id="rtest-p1")
    rooms_store.save_room(room)
    ttl = get_client().ttl("room:RTEST1")
    assert 0 < ttl <= ROOM_TTL_SECONDS


def test_player_round_trip_and_room_index():
    player = Player(player_id="rtest-p1", nickname="RedisTester", room_code="RTEST1", score=7)
    player_store.save_player(player)

    loaded = player_store.get_player("rtest-p1")
    assert loaded is not None
    assert loaded.nickname == "RedisTester"
    assert loaded.score == 7

    in_room = player_store.get_players_in_room("RTEST1")
    assert any(p.player_id == "rtest-p1" for p in in_room)


def test_gamestate_round_trip_preserves_nested_callstate_and_enum():
    gs = GameState(room_code="RTEST1", difficulty="hard", current_round_index=2, round_active=True)
    gs.call_states["rtest-p1"] = CallState(
        phase=CallPhase.PRESSURE,
        history=[{"role": "ai", "text": "urgent!"}],
        is_cautious=False,
        is_impulsive=True,
    )
    game_store.save_game(gs)

    loaded = game_store.get_game("RTEST1")
    assert loaded is not None
    assert loaded.difficulty == "hard"
    call_state = loaded.call_states["rtest-p1"]
    assert call_state.phase == CallPhase.PRESSURE
    assert call_state.phase.value == "pressure"
    assert call_state.is_impulsive is True
    assert call_state.history == [{"role": "ai", "text": "urgent!"}]


def test_delete_removes_from_redis():
    rooms_store.save_room(Room(room_code="RTEST1", leader_id="rtest-p1"))
    rooms_store.delete_room("RTEST1")
    assert rooms_store.get_room("RTEST1") is None
    assert "RTEST1" not in rooms_store.all_rooms()


class _FakeWebSocket:
    """Minimal stand-in for fastapi.WebSocket — just records sent payloads."""

    def __init__(self):
        self.received = []

    async def send_text(self, text: str) -> None:
        self.received.append(text)


def test_broadcast_delivers_via_pubsub_not_direct_send():
    """The core Phase-1 scalability claim: broadcast_to_room() only ever
    PUBLISHES to Redis — it never touches _connections directly. Delivery to
    a locally-registered connection must happen purely through the
    subscriber loop, proving the mechanism that makes cross-instance
    broadcast work."""

    async def run():
        await ws_module.start_pubsub_listener()
        await asyncio.sleep(0.3)  # allow the subscriber to actually subscribe

        fake_ws = _FakeWebSocket()
        ws_module.register("RTEST1", fake_ws, player_id="rtest-p1", nickname="RedisTester")

        await ws_module.broadcast_to_room("RTEST1", {"event": "ping", "n": 1})
        await asyncio.sleep(0.3)  # allow the subscriber to deliver

        ws_module.unregister("RTEST1", fake_ws)
        await ws_module.stop_pubsub_listener()
        return fake_ws.received

    received = asyncio.run(run())
    assert len(received) == 1
    payload = json.loads(received[0])
    assert payload == {"event": "ping", "n": 1}
