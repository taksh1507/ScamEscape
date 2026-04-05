from fastapi import APIRouter
from app.core.config import settings
import os
import time
from app.services.evaluation_service import check_groq_rate_limit

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/health")
def health_check():
    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY")
    api_key_status = "✅ LOADED" if api_key else "❌ MISSING"
    
    return {
        "status": "ok",
        "service": "FraudGuard Arena",
        "api_key_status": api_key_status,
        "api_key_preview": f"{api_key[:15]}..." if api_key else "NOT SET",
        "groq_base_url": settings.GROQ_BASE_URL
    }

@router.get("/time")
def get_server_time():
    """Get current server time to help clients sync clocks for TTL validation"""
    return {
        "server_time": time.time(),
        "timestamp_ms": int(time.time() * 1000)
    }

@router.get("/groq-rate-limit")
async def check_groq_limit():
    """Check Groq API rate limit and availability"""
    rate_info = await check_groq_rate_limit()
    return {
        "status": "ok" if rate_info.get("status") == "ok" else rate_info.get("status"),
        "rate_limit": rate_info
    }
