from dotenv import load_dotenv
import os

load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.events import lifespan
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.room import router as room_router
from app.api.game import router as game_router
from app.api.chat import router as chat_router
from app.api.live_scams import router as live_scams_router
from app.api.scan import router as scan_router

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

# Build an explicit allowlist. Wildcard "*" origins are incompatible with
# allow_credentials=True (browsers reject the combination), so we always
# resolve a concrete list of origins instead.
_allowed_origins = [
    origin.strip()
    for origin in settings.FRONTEND_ORIGIN.split(",")
    if origin.strip()
]
if settings.ENVIRONMENT != "production":
    # Convenience for local dev across the common Next.js ports.
    for dev_origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        if dev_origin not in _allowed_origins:
            _allowed_origins.append(dev_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(room_router)
app.include_router(game_router)
app.include_router(chat_router)
app.include_router(live_scams_router)
app.include_router(scan_router)

@app.get("/")
def read_root():
    return {"message": f"{settings.APP_NAME} backend running"}
