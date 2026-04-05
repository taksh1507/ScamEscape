"""
evaluation_service.py

AI-powered evaluation of player responses in scam scenarios.
Uses Groq/LLaMA for intelligent analysis and scoring.
"""

import json
from typing import Optional, Dict, Any
from openai import AsyncOpenAI
from app.core.config import settings
from app.utils.logger import get_logger

log = get_logger(__name__)

# Initialize Groq client  
client = None
if settings.GROQ_API_KEY:
    try:
        client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL
        )
        log.info(f"✅ Evaluation client initialized with Groq API")
    except Exception as e:
        log.error(f"❌ Failed to initialize evaluation client: {e}")
        client = None
else:
    log.warning("⚠️ GROQ_API_KEY not found. Evaluation features disabled.")


async def evaluate_player_response(
    player_action: str,
    scenario_context: str,
    caller_name: str,
    scammer_type: str,
    difficulty: str,
    suggested_actions: Optional[list] = None
) -> Dict[str, Any]:
    """
    AI-powered evaluation of player response.
    Determines if player SURVIVED (avoided scam) or SCAMMED (fell for it).
    
    Args:
        player_action: The action/choice the player made
        scenario_context: Context of the scam scenario
        caller_name: Name of the scammer
        scammer_type: Type of scam (Bank, Amazon, etc.)
        difficulty: Game difficulty level
        suggested_actions: Available options for context
        
    Returns:
        {
            "status": "SURVIVED" or "SCAMMED",
            "points_earned": 0-100,
            "reason": "Why this action was safe/risky",
            "confidence": 0.0-1.0,
            "safer_action": "What they should have done",
            "is_terminal": True/False
        }
    """
    
    if not client:
        log.error("❌ No AI client available for evaluation - using fallback")
        return _fallback_evaluation(player_action)
    
    try:
        # 🔥 DYNAMIC PROMPT - More personalized, less templated
        prompt = f"""Analyze this scam simulation response:

SCENARIO: {scammer_type} scam - {caller_name} called claiming {scenario_context}
DIFFICULTY: {difficulty}

PLAYER CHOSE: {player_action}

Other options available: {len(suggested_actions) if suggested_actions else 0} options

ANALYZE:
1. Is this choice SURVIVED (safe) or SCAMMED (fell for it)?
2. Give points 0-100 (higher = safer choice)
3. WHY? (1-2 sentences explaining the decision quality)
4. BETTER CHOICE? (specific action they should have taken)
5. CONFIDENCE: 0.0-1.0

RESPOND IN JSON ONLY:
{{"status":"SURVIVED/SCAMMED","points_earned":50,"reason":"...","confidence":0.8,"safer_action":"...","is_terminal":true}}"""
        
        log.info(f"🤖 Evaluating: {player_action[:40]}...")
        
        # Call with retry logic for rate limits
        response = None
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = await client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a cybersecurity expert evaluating scam avoidance. Respond ONLY with valid JSON."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.6,  # More deterministic
                    max_tokens=200,
                    top_p=0.8
                )
                break
            except Exception as e:
                if "rate_limit" in str(e).lower() and attempt < max_retries - 1:
                    log.warning(f"⚠️  Rate limit, retry {attempt + 1}/{max_retries}")
                    import asyncio
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
        
        if not response:
            log.error("❌ No response from AI")
            return _fallback_evaluation(player_action)
            
        content = response.choices[0].message.content.strip()
        if not content:
            log.error("❌ Empty response from AI")
            return _fallback_evaluation(player_action)
        
        # Extract JSON from response (in case AI adds extra text)
        import re
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if not json_match:
            log.error(f"❌ No JSON found in response: {content[:100]}")
            return _fallback_evaluation(player_action)
        
        evaluation = json.loads(json_match.group())
        
        # Validate and fix response
        if "status" not in evaluation:
            evaluation["status"] = "SURVIVED"
        if "points_earned" not in evaluation:
            evaluation["points_earned"] = 50
        if "reason" not in evaluation:
            evaluation["reason"] = f"AI evaluated your choice: {player_action}"
        if "confidence" not in evaluation:
            evaluation["confidence"] = 0.7
        if "safer_action" not in evaluation:
            evaluation["safer_action"] = "Verify through official channels"
        if "is_terminal" not in evaluation:
            evaluation["is_terminal"] = False
        
        # Normalize values
        evaluation["status"] = evaluation["status"].upper() if isinstance(evaluation["status"], str) else "SURVIVED"
        if evaluation["status"] not in ["SURVIVED", "SCAMMED"]:
            evaluation["status"] = "SURVIVED" if evaluation.get("points_earned", 50) >= 50 else "SCAMMED"
        
        evaluation["points_earned"] = max(0, min(100, int(evaluation.get("points_earned", 50))))
        evaluation["confidence"] = max(0.0, min(1.0, float(evaluation.get("confidence", 0.7))))
        
        log.info(f"✅ AI Eval: {evaluation['status']} +{evaluation['points_earned']}pts")
        return evaluation
        
    except json.JSONDecodeError as e:
        log.error(f"❌ JSON parse failed: {e}")
        return _fallback_evaluation(player_action)
    except Exception as e:
        log.error(f"❌ Evaluation error: {e}")
        return _fallback_evaluation(player_action)


def _fallback_evaluation(action: str) -> Dict[str, Any]:
    """
    Fallback: Simple pattern matching when AI is unavailable.
    Still provides meaningful feedback, not templates.
    """
    action_lower = action.lower()
    
    # Simple heuristic based on keywords
    risky_words = ["otp", "password", "share", "transfer", "transaction", "money", "card", "aadhar", "yes", "accept", "confirm"]
    safe_words = ["hang", "block", "disconnect", "refuse", "no", "call", "official", "later"]
    
    risky_score = sum(1 for w in risky_words if w in action_lower)
    safe_score = sum(1 for w in safe_words if w in action_lower)
    
    # Calculate points: high risky = low points, high safe = high points
    if risky_score > safe_score:
        points = max(10, 40 - (risky_score * 15))
        status = "SCAMMED"
        reason = f"Your response '{action}' suggests you may have shared information or engaged with the scammer's request."
    elif safe_score > risky_score:
        points = min(100, 70 + (safe_score * 10))
        status = "SURVIVED"
        reason = f"Your response '{action}' demonstrates caution and refusal to engage with the scam."
    else:
        points = 50
        status = "SURVIVED"
        reason = f"Your response '{action}' shows some caution, but clearer action would be safer."
    
    return {
        "status": status,
        "points_earned": max(0, min(100, points)),
        "reason": reason,
        "confidence": 0.5,  # Low confidence since this is fallback
        "safer_action": "Hang up and call the official organization directly to verify.",
        "is_terminal": risky_score > safe_score
    }


async def check_groq_rate_limit() -> Dict[str, Any]:
    """Check Groq API rate limit status."""
    if not client:
        return {
            "status": "unavailable",
            "message": "Groq client not initialized"
        }
    
    try:
        # Make a lightweight call to check if API is responsive
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "OK"}],
            max_tokens=1
        )
        
        return {
            "status": "ok",
            "message": "Groq API is responsive",
            "model": "llama-3.3-70b-versatile"
        }
    except Exception as e:
        error_str = str(e)
        if "rate limit" in error_str.lower():
            return {
                "status": "rate_limited",
                "message": "Groq API rate limit exceeded",
                "error": error_str
            }
        else:
            return {
                "status": "error",
                "message": "Groq API error",
                "error": error_str
            }
