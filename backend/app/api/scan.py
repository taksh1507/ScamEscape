"""
scan.py

Endpoint for the FraudGuard scanner: analyzes a pasted message or a
screenshot for scam indicators. Moved here from the Next.js frontend so
there's a single backend AI layer instead of two.
"""

from fastapi import APIRouter, HTTPException
from app.services.scan_service import analyze_text, analyze_image
from app.utils.logger import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/analyze")
async def api_analyze(body: dict):
    """
    Analyze a message and/or screenshot for scam indicators.

    Request body:
    {
        "message": "text to analyze" (optional if imageBase64 provided),
        "imageBase64": "base64-encoded image" (optional),
        "imageMimeType": "image/jpeg" (optional, defaults to image/jpeg)
    }

    Returns:
        { "reply": { riskLevel, riskScore, redFlags, explanation, recommendedActions, scamType }, "method": "groq" | "vision+groq" }
    """
    message = body.get("message")
    image_base64 = body.get("imageBase64")
    image_mime_type = body.get("imageMimeType")

    if not message and not image_base64:
        raise HTTPException(status_code=400, detail="No input provided")

    try:
        if image_base64:
            result = await analyze_image(image_base64, image_mime_type, message)
            return {"reply": result, "method": "vision+groq"}
        else:
            result = await analyze_text(message)
            return {"reply": result, "method": "groq"}

    except RuntimeError as e:
        log.error(f"❌ Scanner unavailable: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        log.error(f"❌ Scan analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")
