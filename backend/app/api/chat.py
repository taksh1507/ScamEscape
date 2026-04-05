"""
chat.py

WhatsApp-style scam chat simulation endpoints.
Generates and serves realistic scam chat conversations for training.
"""

from fastapi import APIRouter, HTTPException
import asyncio
from app.services.chat_generator import generate_whatsapp_chat, generate_next_chat_message, groq_available, groq_error_message
from app.utils.logger import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/status")
async def api_chat_status():
    """
    Check chat generation status and OpenRouter configuration.
    Useful for debugging API connectivity and availability.
    
    Returns:
        {
            "chat_generation_enabled": bool,
            "using_dynamic_ai": bool,
            "using_predefined_fallback": bool,
            "openrouter_api_available": bool,
            "error_message": str or null
        }
    """
    return {
        "status": "ok",
        "chat_generation_enabled": True,
        "using_dynamic_ai": groq_available,
        "using_predefined_fallback": not groq_available,
        "openrouter_api_available": groq_available,
        "error_message": groq_error_message if groq_error_message else None
    }


@router.get("/generate")
async def api_generate_chat():
    """
    Generate a complete WhatsApp-style scam chat scenario.
    REQUIRES: OpenRouter API key configured
    
    Returns:
        {
            "messages": [...],
            "payment_block": {...},
            "created_at": "ISO timestamp"
        }
    
    Raises:
        HTTPException 503 if OpenRouter API is not configured
    """
    try:
        scenario = await generate_whatsapp_chat()
        log.info(f"✅ Generated WhatsApp chat with {len(scenario.messages)} messages")
        
        return {
            "status": "success",
            "scenario": scenario.to_dict()
        }
    
    except RuntimeError as e:
        log.error(f"❌ Chat generation unavailable: {e}")
        raise HTTPException(status_code=503, detail=f"Chat generation unavailable: {str(e)}")
    except Exception as e:
        log.error(f"❌ Chat generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate chat scenario: {str(e)}")


@router.post("/next-message")
async def api_generate_next_message(body: dict):
    """
    Generate the next message in a chat conversation.
    REQUIRES: OpenRouter API key configured
    
    Request body:
    {
        "messages": [...previous messages...],
        "last_sender": "USER" or "SCAMMER",
        "scam_type": "relative_emergency" or "cybersecurity" (optional, defaults to relative_emergency)
    }
    
    Returns:
        {
            "sender": "SCAMMER" or "USER",
            "timestamp": "15:32",
            "content": "message text"
        }
    """
    try:
        messages = body.get("messages", [])
        last_sender = body.get("last_sender", "USER")
        scam_type = body.get("scam_type", "relative_emergency")
        
        if not messages:
            raise ValueError("messages array is required")
        
        next_msg = await generate_next_chat_message(messages, last_sender, scam_type)
        
        return {
            "status": "success",
            "message": next_msg
        }
    
    except RuntimeError as e:
        log.error(f"❌ Next message generation unavailable: {e}")
        raise HTTPException(status_code=503, detail=f"Chat generation unavailable: {str(e)}")
    except Exception as e:
        log.error(f"❌ Next message generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate next message: {str(e)}")


@router.get("/round2/scenario/{room_code}/{player_id}")
async def api_get_chat_for_round2(room_code: str, player_id: str):
    """
    Get a WhatsApp chat scenario for Round 2 of the game.
    Each player gets their own unique chat scenario.
    
    Returns:
        {
            "status": "success",
            "room_code": "ABC123",
            "player_id": "player_xxx",
            "scenario": {
                "messages": [...],
                "payment_block": {...},
                "created_at": "..."
            }
        }
    """
    try:
        log.info(f"📋 Generating chat scenario for room={room_code}, player={player_id}")
        scenario = await generate_whatsapp_chat()
        log.info(f"✅ Chat scenario generated successfully")
        
        return {
            "status": "success",
            "room_code": room_code.upper(),
            "player_id": player_id,
            "scenario": scenario.to_dict()
        }
    
    except RuntimeError as e:
        log.error(f"❌ Round 2 scenario generation unavailable: {e}")
        raise HTTPException(status_code=503, detail=f"Chat generation unavailable: {str(e)}")
    except Exception as e:
        log.error(f"❌ Round 2 scenario generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate Round 2 scenario: {str(e)}")
