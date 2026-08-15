"""
Integration tests for the /auth REST endpoints (signup, login, me) and for
the REQUIRE_AUTH-gated behavior on /game/close/{room_code}.

Uses mongomock in place of a real MongoDB connection so these run in CI
without a database service, consistent with the rest of this test suite.
"""
import pytest
import mongomock

import app.core.mongodb as mongodb_module
import app.core.events as events_module
from app.core.config import settings


@pytest.fixture(autouse=True)
def mock_mongo(monkeypatch):
    """Point the app's global Mongo handle at an in-memory mongomock instance.

    The `client` fixture in conftest.py runs the app's real lifespan, which
    calls connect_to_mongo() on startup and would otherwise overwrite
    whatever we set here with a (failed) real connection attempt. So we
    monkeypatch connect_to_mongo itself rather than just the module globals.
    """
    mock_client = mongomock.MongoClient()
    mock_db = mock_client["scamescape_test"]

    def _fake_connect():
        mongodb_module.client = mock_client
        mongodb_module.db = mock_db
        mongodb_module.is_connected = True
        mongodb_module.create_indexes()
        return mock_db

    monkeypatch.setattr(mongodb_module, "connect_to_mongo", _fake_connect)
    monkeypatch.setattr(mongodb_module, "close_mongo_connection", lambda: None)
    # events.py did `from app.core.mongodb import connect_to_mongo`, which
    # bound its own local reference — patching the mongodb module alone
    # doesn't affect that already-bound name, so patch it here too.
    monkeypatch.setattr(events_module, "connect_to_mongo", _fake_connect)
    monkeypatch.setattr(events_module, "close_mongo_connection", lambda: None)

    yield


@pytest.fixture(autouse=True)
def reset_require_auth():
    """Auth-gating tests flip this flag; always restore the default after."""
    original = settings.REQUIRE_AUTH
    yield
    settings.REQUIRE_AUTH = original


def _signup(client, email="alice@example.com", password="supersecret123", nickname="alice"):
    return client.post(
        "/auth/signup",
        json={"email": email, "password": password, "nickname": nickname},
    )


def test_signup_creates_account_and_returns_token(client):
    resp = _signup(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_signup_duplicate_email_returns_409(client):
    _signup(client)
    resp = _signup(client)
    assert resp.status_code == 409


def test_signup_short_password_returns_422(client):
    resp = _signup(client, password="short")
    assert resp.status_code == 422


def test_login_with_correct_credentials_succeeds(client):
    _signup(client)
    resp = client.post(
        "/auth/login", json={"email": "alice@example.com", "password": "supersecret123"}
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_with_wrong_password_returns_401(client):
    _signup(client)
    resp = client.post(
        "/auth/login", json={"email": "alice@example.com", "password": "wrongpassword"}
    )
    assert resp.status_code == 401


def test_login_unknown_email_returns_401(client):
    resp = client.post(
        "/auth/login", json={"email": "nobody@example.com", "password": "whatever123"}
    )
    assert resp.status_code == 401


def test_me_with_valid_token_returns_user(client):
    token = _signup(client).json()["access_token"]
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "alice@example.com"
    assert body["nickname"] == "alice"
    assert "hashed_password" not in body


def test_me_without_token_returns_401(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_with_garbage_token_returns_401(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


def test_close_room_is_anonymous_by_default(client):
    """REQUIRE_AUTH defaults to False, so the existing anonymous demo flow
    for this destructive action must keep working without a token."""
    assert settings.REQUIRE_AUTH is False
    resp = client.post("/game/close/NOTAROOM")
    assert resp.status_code == 200


def test_close_room_requires_token_when_require_auth_enabled(client):
    settings.REQUIRE_AUTH = True
    resp = client.post("/game/close/NOTAROOM")
    assert resp.status_code == 401


def test_close_room_succeeds_with_valid_token_when_require_auth_enabled(client):
    token = _signup(client).json()["access_token"]
    settings.REQUIRE_AUTH = True
    resp = client.post(
        "/game/close/NOTAROOM", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
