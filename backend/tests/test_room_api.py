"""
Integration tests for the /rooms REST endpoints.

These exercise the real FastAPI app + in-memory room store (no MongoDB
required), covering the create -> join -> not-found happy/error paths.
"""


def test_health_check(client):
    resp = client.get("/health/health")
    assert resp.status_code == 200


def test_create_room_returns_room_code_and_leader_flag(client):
    resp = client.post("/rooms/create", json={"nickname": "Alice"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["is_leader"] is True
    assert body["room_code"]
    assert body["player_id"]


def test_join_room_with_valid_code_succeeds(client):
    create_resp = client.post("/rooms/create", json={"nickname": "Alice"})
    room_code = create_resp.json()["room_code"]

    join_resp = client.post("/rooms/join", json={"nickname": "Bob", "room_code": room_code})
    assert join_resp.status_code == 200
    body = join_resp.json()
    assert body["is_leader"] is False
    assert body["room_code"] == room_code


def test_join_room_with_invalid_code_returns_400(client):
    resp = client.post("/rooms/join", json={"nickname": "Bob", "room_code": "NOPE99"})
    assert resp.status_code == 400


def test_join_room_code_is_case_insensitive(client):
    create_resp = client.post("/rooms/create", json={"nickname": "Alice"})
    room_code = create_resp.json()["room_code"]

    join_resp = client.post(
        "/rooms/join", json={"nickname": "Bob", "room_code": room_code.lower()}
    )
    assert join_resp.status_code == 200
