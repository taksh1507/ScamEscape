from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.utils.logger import get_logger
from app.core.config import log_configuration
from app.core.mongodb import connect_to_mongo, close_mongo_connection
import signal
import sys

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
    
    # Initialize MongoDB
    try:
        connect_to_mongo()
    except Exception as e:
        log.warning(f"⚠️ MongoDB initialization note: {e}")
    
    # Register signal handlers for clean shutdown
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    yield
    
    # Close MongoDB connection
    close_mongo_connection()
    log.info("✅ ScamEscape Arena backend shut down successfully")
