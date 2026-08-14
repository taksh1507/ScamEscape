"""
Shared pytest fixtures.

Sets a dummy GROQ_API_KEY before anything imports app.core.config, since
app startup now fails fast without an LLM key configured (see
validate_configuration in app/core/config.py). Tests that need to assert
on real AI behavior should mock the client instead of relying on this key.
"""

import os

os.environ.setdefault("GROQ_API_KEY", "test-key-not-a-real-groq-key")
os.environ.setdefault("ENVIRONMENT", "development")

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    """A TestClient that runs the app's startup/shutdown lifespan (so
    validate_configuration and the MongoDB connection attempt both run,
    matching real app behavior)."""
    with TestClient(app) as c:
        yield c
