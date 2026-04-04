from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.utils.logger import get_logger

log = get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("🚀 ScamEscape Arena backend starting up")
    yield
    log.info("🛑 ScamEscape Arena backend shutting down")
