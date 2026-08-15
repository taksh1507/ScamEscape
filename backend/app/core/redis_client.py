"""
Redis connection and initialization.

Provides both a sync client (used by the room/game/player state stores,
which are called from sync FastAPI route handlers) and an async client
(used by the WebSocket pub/sub broadcaster in app.core.websocket).

Mirrors app.core.mongodb's connect/close/get pattern and its "degrade
gracefully" philosophy: if Redis isn't reachable, callers fall back to
local in-memory state (single-instance behavior, same as before this
migration) instead of crashing the app.
"""
import os
import redis
import redis.asyncio as aredis
from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

REDIS_URL = settings.REDIS_URL or os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Sync client — used by state stores (rooms/games/players), which are
# accessed from sync route handlers.
client: "redis.Redis | None" = None

# Async client — used only for pub/sub broadcast, since that's on the
# async WebSocket path.
async_client: "aredis.Redis | None" = None

is_connected = False


def connect_to_redis():
    """Connect to Redis (sync client) and verify with a PING."""
    global client, is_connected
    try:
        log.info(f"🔄 Connecting to Redis: {REDIS_URL}")
        client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=5)
        client.ping()
        is_connected = True
        log.info("✅ Connected to Redis")
        return client
    except Exception as e:
        is_connected = False
        log.warning(f"⚠️ Redis not available at {REDIS_URL}: {e}")
        log.warning("⚠️ Falling back to local in-memory state (single-instance only)")
        return None


def get_async_redis() -> "aredis.Redis | None":
    """Lazily create the async Redis client, used for pub/sub.

    Created lazily (rather than in connect_to_redis) because it must be
    bound to the running asyncio event loop, which doesn't exist yet during
    the sync part of startup.
    """
    global async_client
    if not is_connected:
        return None
    if async_client is None:
        async_client = aredis.from_url(REDIS_URL, decode_responses=True)
    return async_client


def close_redis_connection():
    """Close both Redis clients."""
    global client, async_client, is_connected
    if client:
        try:
            client.close()
        except Exception as e:
            log.warning(f"⚠️ Error closing Redis sync client: {e}")
    client = None
    async_client = None
    is_connected = False
    log.info("✅ Closed Redis connection")


def get_client() -> "redis.Redis | None":
    """Get the sync Redis client, or None if unavailable."""
    if not is_connected:
        return None
    return client


def is_redis_connected() -> bool:
    return is_connected and client is not None
