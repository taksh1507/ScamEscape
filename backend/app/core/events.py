from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.utils.logger import get_logger
from app.core.config import log_configuration, validate_configuration, ConfigurationError
from app.core.mongodb import connect_to_mongo, close_mongo_connection
from app.core.redis_client import connect_to_redis, close_redis_connection
from app.core.websocket import start_pubsub_listener, stop_pubsub_listener
import signal
import sys
import threading

log = get_logger(__name__)

def handle_shutdown(signum, frame):
    """Graceful shutdown handler for Ctrl+C"""
    log.info("🛑 Shutting down server gracefully...")
    sys.exit(0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("🚀 ScamEscape Arena backend starting up")
    
    # Log configuration (deferred from import time)
    log_configuration()

    # Fail fast if required config (LLM key) is missing, instead of
    # booting successfully and failing deep inside a live game round.
    try:
        validate_configuration()
    except ConfigurationError as e:
        log.error(f"❌ Startup aborted: {e}")
        raise
    
    # Initialize MongoDB
    try:
        connect_to_mongo()
    except Exception as e:
        log.warning(f"⚠️ MongoDB initialization note: {e}")

    # Initialize Redis (shared room/game state + cross-instance WS broadcast)
    try:
        connect_to_redis()
        await start_pubsub_listener()
    except Exception as e:
        log.warning(f"⚠️ Redis initialization note: {e}")
    
    # Register signal handlers for clean shutdown.
    # signal.signal() only works from the main thread of the main
    # interpreter (e.g. `uvicorn app.main:app`). It raises ValueError when
    # the app is run inside a worker thread — which is exactly what
    # happens under TestClient/anyio in tests, and potentially under some
    # embedding/hosting setups. Guard it so those environments don't crash
    # on startup; graceful Ctrl+C shutdown just isn't needed there.
    if threading.current_thread() is threading.main_thread():
        try:
            signal.signal(signal.SIGINT, handle_shutdown)
            signal.signal(signal.SIGTERM, handle_shutdown)
        except (ValueError, OSError) as e:
            log.warning(f"⚠️ Could not register shutdown signal handlers: {e}")
    
    yield
    
    # Close MongoDB connection
    close_mongo_connection()
    await stop_pubsub_listener()
    close_redis_connection()
    log.info("✅ ScamEscape Arena backend shut down successfully")
