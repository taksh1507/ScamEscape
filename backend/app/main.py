from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.events import lifespan
from app.api.health import router as health_router
from app.api.room import router as room_router
from app.api.game import router as game_router
from app.api.round2 import router as round2_router

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to settings.FRONTEND_ORIGIN in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(room_router)
app.include_router(game_router)
app.include_router(round2_router)

@app.get("/")
def read_root():
    return {"message": f"{settings.APP_NAME} backend running"}
