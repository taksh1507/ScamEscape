from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
import asyncio
import time
from app.schemas.action_schema import SubmitActionRequest, ScoreConversationRequest
from app.services.game_engine import start_game, _build_leaderboard
from app.services.mongodb_service import MongoDBService
from app.services.chat_generator import generate_whatsapp_chat, generate_next_chat_message
from app.state.rooms_store import get_room, save_room, delete_room
from app.state.game_store import get_game, delete_game
from app.state.player_store import get_player
from app.core.websocket import register, unregister, broadcast_to_room, send_to_player
from app.models.room import RoomStatus
from app.utils.logger import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/game", tags=["game"])


# ─── REST: submit action (fallback for non-WS clients) ───────────────────────

@router.post("/action")
def api_submit_action(body: SubmitActionRequest):
    game = get_game(body.room_code.upper())
    if not game or not game.round_active:
        raise HTTPException(status_code=400, detail="No active round")
    game.round_actions[body.player_id] = body.action
    game.round_action_times[body.player_id] = time.time()
    from app.state.game_store import save_game
    save_game(game)
    return {"received": True}


@router.get("/leaderboard/{room_code}")
def api_leaderboard(room_code: str):
    room = get_room(room_code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"leaderboard": _build_leaderboard(room_code.upper())}


# 🔥 ─── MongoDB-based Leaderboard Endpoints ───────────────────────────────────

@router.get("/leaderboard/global/top")
async def api_global_leaderboard(limit: int = 100):
    """Get top players from global leaderboard (MongoDB)"""
    try:
        leaderboard = await MongoDBService.get_global_leaderboard(limit=limit)
        return {
            "status": "success",
            "leaderboard": [entry.model_dump() for entry in leaderboard],
            "total_entries": len(leaderboard)
        }
    except Exception as e:
        log.error(f"Failed to get global leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve leaderboard")


@router.get("/leaderboard/room/{room_code}/mongodb")
async def api_room_leaderboard_mongodb(room_code: str):
    """Get leaderboard for a specific room from MongoDB"""
    try:
        room_code = room_code.upper()
        leaderboard = await MongoDBService.get_room_leaderboard(room_code)
        return {
            "status": "success",
            "room_code": room_code,
            "leaderboard": [entry.model_dump() for entry in leaderboard],
            "total_players": len(leaderboard)
        }
    except Exception as e:
        log.error(f"Failed to get room leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve leaderboard")


@router.get("/analytics/global")
async def api_global_analytics():
    """Get global game analytics from MongoDB"""
    try:
        analytics = await MongoDBService.get_game_analytics()
        return {
            "status": "success",
            "analytics": analytics
        }
    except Exception as e:
        log.error(f"Failed to get analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics")


@router.get("/analytics/player/{player_id}")
async def api_player_statistics(player_id: str):
    """Get detailed statistics for a specific player from MongoDB"""
    try:
        stats = await MongoDBService.get_player_statistics(player_id)
        if not stats:
            raise HTTPException(status_code=404, detail="Player not found")
        return {
            "status": "success",
            "statistics": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Failed to get player statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


@router.get("/responses/player/{player_id}")
async def api_player_response_analysis(player_id: str):
    """Get response analysis and learning statistics for a player"""
    try:
        stats = await MongoDBService.get_player_response_stats(player_id)
        if not stats:
            raise HTTPException(status_code=404, detail="No response data found for player")
        return {
            "status": "success",
            "player_id": player_id,
            "response_stats": stats
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Failed to get player response analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve response analysis")


@router.get("/responses/game/{room_code}")
async def api_game_response_analysis(room_code: str):
    """Get all player responses for a specific game session"""
    try:
        room_code = room_code.upper()
        responses = await MongoDBService.get_game_response_analysis(room_code)
        return {
            "status": "success",
            "room_code": room_code,
            "total_responses": len(responses),
            "responses": responses
        }
    except Exception as e:
        log.error(f"Failed to get game response analysis: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve response analysis")


@router.get("/analysis/player/{player_id}/detailed")
async def api_player_detailed_analysis(player_id: str):
    """
    🔥 Get detailed scoring analysis for a player including:
    - Complete response history
    - Vulnerability trend (improvement over time)
    - Performance by scenario type
    - AI-powered recommendations for improvement
    """
    try:
        db = None
        from app.core.mongodb import get_database
        db = get_database()
        if not db:
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        def fetch_detailed_analysis():
            # Get all responses for this player
            responses = list(db.player_responses.find(
                {"player_id": player_id},
                sort=[("created_at", 1)]
            ))
            
            if not responses:
                return None
            
            # Calculate metrics
            total_responses = len(responses)
            correct_responses = len([r for r in responses if r.get("is_correct")])
            accuracy_rate = (correct_responses / total_responses * 100) if total_responses > 0 else 0
            
            total_points = sum(r.get("points_awarded", 0) for r in responses)
            avg_points_per_response = total_points / total_responses if total_responses > 0 else 0
            
            # Vulnerability trend (should decrease over time as player learns)
            vulnerabilities = [r.get("ai_analysis", {}).get("vulnerability_percentage", 50) for r in responses]
            avg_vulnerability = sum(vulnerabilities) / len(vulnerabilities) if vulnerabilities else 50
            first_vulnerability = vulnerabilities[0] if vulnerabilities else 50
            last_vulnerability = vulnerabilities[-1] if vulnerabilities else 50
            improvement = first_vulnerability - last_vulnerability
            
            # Response time trend
            response_times = [r.get("response_time", 0) for r in responses]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            
            # Grade distribution
            grades = [r.get("grade", "F") for r in responses]
            grade_counts = {}
            for grade in grades:
                grade_counts[grade] = grade_counts.get(grade, 0) + 1
            most_common_grade = max(grade_counts, key=grade_counts.get) if grade_counts else "F"
            
            # Performance by scenario type
            scenario_performance = {}
            for scenario_type in ["call", "sms", "email", "bank"]:
                scenario_responses = [r for r in responses if r.get("scenario_type") == scenario_type]
                if scenario_responses:
                    scenario_correct = len([r for r in scenario_responses if r.get("is_correct")])
                    scenario_accuracy = (scenario_correct / len(scenario_responses) * 100)
                    scenario_vulnerabilities = [r.get("ai_analysis", {}).get("vulnerability_percentage", 50) for r in scenario_responses]
                    scenario_avg_vuln = sum(scenario_vulnerabilities) / len(scenario_vulnerabilities) if scenario_vulnerabilities else 50
                    
                    scenario_performance[scenario_type] = {
                        "total_responses": len(scenario_responses),
                        "correct_responses": scenario_correct,
                        "accuracy_rate": round(scenario_accuracy, 2),
                        "avg_vulnerability": round(scenario_avg_vuln, 2),
                        "avg_points": round(sum(r.get("points_awarded", 0) for r in scenario_responses) / len(scenario_responses), 2)
                    }
            
            # Common vulnerabilities mentioned in feedback
            all_vulnerabilities = []
            for r in responses:
                vuln_list = r.get("ai_analysis", {}).get("specific_vulnerabilities", [])
                all_vulnerabilities.extend(vuln_list)
            
            vulnerability_counts = {}
            for vuln in all_vulnerabilities:
                vulnerability_counts[vuln] = vulnerability_counts.get(vuln, 0) + 1
            
            top_vulnerabilities = sorted(vulnerability_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Recommendations based on weak areas
            weak_scenarios = [st for st, perf in scenario_performance.items() if perf.get("accuracy_rate", 0) < 60]
            strong_scenarios = [st for st, perf in scenario_performance.items() if perf.get("accuracy_rate", 0) >= 80]
            
            # Calculate learning trajectory (linear regression of vulnerability over time)
            if len(vulnerabilities) > 1:
                import statistics
                learning_slope = (vulnerabilities[-1] - vulnerabilities[0]) / len(vulnerabilities)
                improvement_status = "improving" if learning_slope < -5 else "stable" if -5 <= learning_slope <= 5 else "declining"
            else:
                learning_slope = 0
                improvement_status = "neutral"
            
            return {
                "player_id": player_id,
                "total_responses": total_responses,
                "total_points": total_points,
                "accuracy_rate": round(accuracy_rate, 2),
                "avg_points_per_response": round(avg_points_per_response, 2),
                "most_common_grade": most_common_grade,
                "grade_distribution": grade_counts,
                "vulnerability_analysis": {
                    "avg_vulnerability": round(avg_vulnerability, 2),
                    "first_response_vulnerability": round(first_vulnerability, 2),
                    "latest_response_vulnerability": round(last_vulnerability, 2),
                    "improvement_points": round(improvement, 2),
                    "improvement_status": improvement_status,
                    "vulnerability_trend": vulnerabilities[-10:] if len(vulnerabilities) > 10 else vulnerabilities  # Last 10
                },
                "response_time_analysis": {
                    "avg_response_time": round(avg_response_time, 2),
                    "fastest_response": round(min(response_times), 2) if response_times else 0,
                    "slowest_response": round(max(response_times), 2) if response_times else 0
                },
                "scenario_performance": scenario_performance,
                "weak_areas": weak_scenarios,
                "strong_areas": strong_scenarios,
                "top_vulnerabilities": [{"vulnerability": v[0], "occurrences": v[1]} for v in top_vulnerabilities],
                "recommendation": _generate_recommendation(weak_scenarios, strong_scenarios, improvement_status),
                "last_updated": responses[-1].get("created_at") if responses else None
            }
        
        analysis = await asyncio.to_thread(fetch_detailed_analysis)
        if not analysis:
            raise HTTPException(status_code=404, detail="No analysis data found for player")
        
        return {
            "status": "success",
            "player_id": player_id,
            "analysis": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Failed to get detailed player analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve detailed analysis")


@router.get("/analysis/player/{player_id}/learning-progress")
async def api_player_learning_progress(player_id: str):
    """
    🔥 Get player's learning progress with recommendations
    Shows how the player is improving in safety awareness
    """
    try:
        db = None
        from app.core.mongodb import get_database
        db = get_database()
        if not db:
            raise HTTPException(status_code=503, detail="Database connection failed")
        
        def fetch_progress():
            responses = list(db.player_responses.find(
                {"player_id": player_id},
                sort=[("created_at", 1)]
            ))
            
            if not responses:
                return None
            
            # Calculate improvement metrics
            if len(responses) >= 2:
                # First 3 responses vs last 3 responses
                early_responses = responses[:min(3, len(responses))]
                late_responses = responses[max(-3, -len(responses)):]
                
                early_vulnerability = sum(r.get("ai_analysis", {}).get("vulnerability_percentage", 50) for r in early_responses) / len(early_responses)
                late_vulnerability = sum(r.get("ai_analysis", {}).get("vulnerability_percentage", 50) for r in late_responses) / len(late_responses)
                
                early_safety = sum(r.get("ai_analysis", {}).get("safety_score", 0) for r in early_responses) / len(early_responses)
                late_safety = sum(r.get("ai_analysis", {}).get("safety_score", 0) for r in late_responses) / len(late_responses)
                
                improvement_percent = ((early_vulnerability - late_vulnerability) / early_vulnerability * 100) if early_vulnerability > 0 else 0
                safety_improvement = late_safety - early_safety
            else:
                early_vulnerability = late_vulnerability = early_safety = late_safety = 0
                improvement_percent = safety_improvement = 0
            
            return {
                "player_id": player_id,
                "total_training_sessions": len(responses),
                "learning_phase": "beginner" if len(responses) < 5 else "intermediate" if len(responses) < 15 else "advanced",
                "improvement_summary": {
                    "vulnerability_reduction": round(improvement_percent, 2),
                    "vulnerability_baseline": round(early_vulnerability, 2),
                    "vulnerability_current": round(late_vulnerability, 2),
                    "safety_score_improvement": round(safety_improvement, 2),
                    "status": "🔥 Excellent progress!" if improvement_percent > 20 else "✅ Good progress" if improvement_percent > 10 else "📈 Keep practicing"
                },
                "milestones": _calculate_milestones(responses),
                "next_focus_areas": _identify_focus_areas(responses),
                "motivational_message": _generate_motivational_message(len(responses), improvement_percent),
                "statistics": {
                    "total_correct_responses": len([r for r in responses if r.get("is_correct")]),
                    "total_points_earned": sum(r.get("points_awarded", 0) for r in responses),
                    "most_improved_area": _get_most_improved_area(responses)
                }
            }
        
        progress = await asyncio.to_thread(fetch_progress)
        if not progress:
            raise HTTPException(status_code=404, detail="No progress data found for player")
        
        return {
            "status": "success",
            "player_id": player_id,
            "progress": progress
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Failed to get learning progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve learning progress")


# ─── Helper Functions ──────────────────────────────────────────────────────────

def _generate_recommendation(weak_areas, strong_areas, improvement_status):
    """Generate personalized recommendation based on performance"""
    if not weak_areas:
        return "🌟 Excellent! You're performing well across all scenario types. Keep practicing to maintain your skills!"
    
    weak_str = ", ".join(weak_areas)
    return f"📚 Focus on improving your {weak_str} detection skills. Review scenarios in these categories to strengthen your defenses. Your {improvement_status} trend shows you're on the right path!"


def _calculate_milestones(responses):
    """Calculate milestones achieved"""
    milestones = []
    
    if len(responses) >= 1:
        milestones.append({"achieved": True, "name": "First Challenge", "description": "Completed your first scam simulation" })
    if len(responses) >= 5:
        milestones.append({"achieved": True, "name": "Practice Mode", "description": "Completed 5 simulations" })
    if len(responses) >= 10:
        milestones.append({"achieved": True, "name": "Scam Detector", "description": "Completed 10 simulations" })
    if len(responses) >= 20:
        milestones.append({"achieved": True, "name": "Security Expert", "description": "Completed 20 simulations" })
    
    # Accuracy milestone
    correct = len([r for r in responses if r.get("is_correct")])
    if correct >= int(len(responses) * 0.9):
        milestones.append({"achieved": True, "name": "Accuracy Master", "description": "90%+ accuracy rate" })
    
    return milestones


def _identify_focus_areas(responses):
    """Identify areas that need focus"""
    scenario_accuracy = {}
    for scenario_type in ["call", "sms", "email", "bank"]:
        scenario_responses = [r for r in responses if r.get("scenario_type") == scenario_type]
        if scenario_responses:
            correct = len([r for r in scenario_responses if r.get("is_correct")])
            accuracy = (correct / len(scenario_responses) * 100)
            scenario_accuracy[scenario_type] = accuracy
    
    focus_areas = [st for st, acc in scenario_accuracy.items() if acc < 70]
    return focus_areas if focus_areas else []


def _get_most_improved_area(responses):
    """Get the area where player improved the most"""
    scenario_first_response = {}
    scenario_last_response = {}
    
    for r in responses:
        scenario = r.get("scenario_type", "call")
        vuln = r.get("ai_analysis", {}).get("vulnerability_percentage", 50)
        
        if scenario not in scenario_first_response:
            scenario_first_response[scenario] = vuln
        scenario_last_response[scenario] = vuln
    
    improvements = {}
    for scenario in scenario_first_response:
        improvement = scenario_first_response[scenario] - scenario_last_response.get(scenario, 0)
        if improvement > 0:
            improvements[scenario] = improvement
    
    if improvements:
        return max(improvements, key=improvements.get)
    return "call"


def _generate_motivational_message(num_responses, improvement_percent):
    """Generate motivational message based on progress"""
    if num_responses < 5:
        return "🎯 You've started your scam-detection journey! Keep going, each challenge makes you sharper."
    elif improvement_percent > 25:
        return "🚀 Amazing improvement! You're becoming a fraud-detection expert!"
    elif improvement_percent > 15:
        return "✨ Great progress! Your safety awareness is significantly improving."
    elif improvement_percent > 5:
        return "📈 Steady progress! Keep practicing to strengthen your defenses."
    else:
        return "💪 Every practice session builds your skills. Stay committed!"



@router.post("/close/{room_code}")
def close_room(room_code: str):
    """🔥 Close a game room and clean up resources"""
    room_code = room_code.upper()
    room = get_room(room_code)
    
    if not room:
        log.warning(f"Attempt to close non-existent room: {room_code}")
        return {"status": "ok", "message": f"Room {room_code} not found"}
    
    # Update room status to finished
    room.status = RoomStatus.FINISHED
    save_room(room)
    
    # Clean up game data
    try:
        delete_game(room_code)
        log.info(f"🔥 [ROOM CLOSED] Room {room_code} closed and cleaned up")
    except Exception as e:
        log.warning(f"Failed to delete game data for room {room_code}: {e}")
    
    return {
        "status": "ok",
        "message": f"Room {room_code} closed successfully",
        "room_code": room_code
    }


@router.post("/score/{room_code}/{player_id}")
def submit_frontend_score(room_code: str, player_id: str, body: dict):
    """🔥 Receive frontend-computed score from end-of-call AI analysis"""
    room_code = room_code.upper()
    game = get_game(room_code)
    
    if not game:
        log.error(f"❌ Game not found for room {room_code} when receiving frontend score")
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Store the frontend score for later use in round_result
    game.frontend_scores[player_id] = body
    from app.state.game_store import save_game
    save_game(game)
    
    log.info(f"✅ Frontend score received for {player_id} in room {room_code}: {body}")
    return {"status": "ok", "message": "Score received"}


@router.post("/score-conversation")
async def score_conversation_groq(body: ScoreConversationRequest):
    """Score a full call conversation using GROQ AI - holistic evaluation"""
    try:
        from app.services.ai_service import get_groq_client
        
        transcript = body.conversation
        scenario_type = body.scenario_type
        caller_name = body.caller_name
        
        if not transcript:
            log.error("❌ Empty conversation provided for scoring")
            raise HTTPException(status_code=400, detail="Conversation required")
        
        log.info(f"🤖 Starting GROQ scoring for caller: {caller_name}, transcript length: {len(transcript)}")
        
        try:
            client = get_groq_client()
            log.info(f"✅ GROQ client obtained")
            
            response = await asyncio.to_thread(
                lambda: client.messages.create(
                    model="mixtral-8x7b-32768",
                    max_tokens=1000,
                    system="""You are a scam-awareness trainer scoring a user's responses to a simulated scam call.

Score the OVERALL conversation, not individual messages.
Consider: Did they eventually hang up? Did they share sensitive info? Did they ask good questions?

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "points": <0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "grade_label": <"Excellent"|"Good"|"Average"|"Poor"|"Failed">,
  "analysis": "<2 sentence summary of how they did>",
  "tip": "<1 actionable tip for next time>",
  "was_scammed": <true|false>
}""",
                    messages=[
                        {
                            "role": "user",
                            "content": f"""Scenario: Scam call from "{caller_name}" ({scenario_type} scam)

Full conversation:
{transcript}

Score the user's overall performance.""",
                        }
                    ],
                )
            )
            
            log.info(f"✅ GROQ response received")
            
            # Extract the response text
            response_text = response.content[0].text if response.content else "{}"
            log.info(f"📝 Response text: {response_text[:200]}")
            
            # Parse JSON from response
            import json
            
            # Clean up markdown if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            score_data = json.loads(response_text.strip())
            
            log.info(f"✅ GROQ score generated: {score_data}")
            return score_data
            
        except Exception as groq_err:
            log.error(f"❌ GROQ API error: {groq_err}", exc_info=True)
            # Return fallback score instead of crashing
            fallback = {
                "points": 50,
                "grade": "B",
                "grade_label": "Good",
                "analysis": "Analysis could not be completed.",
                "tip": "Always verify caller identity before sharing sensitive information.",
                "was_scammed": False,
            }
            log.info(f"📋 Returning fallback score: {fallback}")
            return fallback
            
    except Exception as e:
        log.error(f"❌ Score conversation endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")



# ─── WebSocket ────────────────────────────────────────────────────────────────

@router.websocket("/ws/{room_code}/{player_id}")
async def websocket_endpoint(ws: WebSocket, room_code: str, player_id: str):
    room_code = room_code.upper()
    await ws.accept()

    room   = get_room(room_code)
    player = get_player(player_id)

    if not room or not player:
        await send_to_player(ws, {"event": "error", "message": "Invalid room or player"})
        await ws.close()
        return

    register(room_code, ws, player_id=player_id, nickname=player.nickname)
    log.info(f"Game WS: {player.nickname} connected to room {room_code}")

    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "submit_action":
                action = data.get("action", "")
                game = get_game(room_code)
                if game and game.round_active:
                    # 🔥 CRITICAL: Check submit_actions (not round_actions) to avoid blocking user_action
                    if player_id in game.submit_actions:
                        log.warning(f"Duplicate submit_action from {player_id} in room {room_code} - ignoring")
                        await send_to_player(ws, {"event": "action_received", "action": "already_submitted"})
                        continue
                    
                    game.submit_actions[player_id] = action           # 🔥 Use separate dict
                    game.round_action_times[player_id] = time.time()
                    
                    # 🔥 CRITICAL: End the call immediately if player hangs up
                    if action.lower() in ["hang_up", "decline", "block"]:
                        from app.constants.scenario_types import CallPhase
                        if player_id in game.call_states:
                            game.call_states[player_id].phase = CallPhase.FAILURE
                            log.info(f"🛑 Player {player_id} ended call via submit_action - set phase to FAILURE")
                    
                    from app.state.game_store import save_game
                    save_game(game)
                    log.info(f"✅ Action recorded for {player_id} in room {room_code}: {action}")
                    await send_to_player(ws, {"event": "action_received", "action": action})
                else:
                    await send_to_player(ws, {"event": "error", "message": "No active round"})

            elif msg_type == "user_action":
                try:
                    action_data = data.get("action", {})
                    # Support both string and object input for backward compatibility
                    action_text = action_data.get("option", "") if isinstance(action_data, dict) else action_data
                    risk_level = action_data.get("risk_level", "medium") if isinstance(action_data, dict) else "medium"
                    
                    log.info(f"📨 user_action received from {player_id}: action_text='{action_text}' risk_level='{risk_level}'")
                    
                    game = get_game(room_code)
                    if game and game.round_active:
                        # 🔥 CRITICAL: Check user_actions (not round_actions) - only block duplicate user_action
                        if player_id in game.user_actions:
                            log.warning(f"Duplicate user_action from {player_id} in room {room_code} - ignoring")
                            await send_to_player(ws, {"event": "action_received", "action": "already_submitted"})
                            continue
                        
                        from app.services.adaptive_call_manager import AdaptiveCallManager
                        from app.services.ai_service import generate_phase_response
                        from app.constants.scenario_types import CallPhase
                        
                        call_state = game.call_states.get(player_id)
                        if not call_state:
                            log.error(f"❌ Call state not found for {player_id}")
                            await send_to_player(ws, {"event": "error", "message": "Call state not found"})
                            continue
                        
                        # 1. Determine action type
                        action_type = AdaptiveCallManager.get_action_type(action_text)
                        log.info(f"Action type determined: {action_type}")
                        
                        # 2. Transition phase
                        next_phase = AdaptiveCallManager.get_next_phase(
                            call_state.phase, 
                            game.difficulty, 
                            action_type
                        )
                        log.info(f"Phase transition: {call_state.phase.value} -> {next_phase.value}")
                        
                        # 🔥 FIX: If user chooses low-risk option, they WIN immediately (FAILURE for scammer)
                        if risk_level == "low" and next_phase not in [CallPhase.SUCCESS, CallPhase.FAILURE]:
                            log.info(f"✅ User chose safe option (low risk) - ending call as WIN (FAILURE)")
                            next_phase = CallPhase.FAILURE
                        
                        # 3. Update profile
                        AdaptiveCallManager.update_user_profile(call_state, action_type)
                        
                        # 🔥 Record this action to prevent duplicate user_actions
                        game.user_actions[player_id] = action_text      # Track user_action separately
                        game.round_actions[player_id] = action_text     # Keep for round_manager scoring
                        game.round_action_times[player_id] = time.time()
                        
                        # Scores will be computed by frontend after full conversation is recorded
                        # No per-action decision_result sent anymore
                        
                        # 5. Generate AI response for next phase (skip if terminal)
                        scenario_data = game.scenarios[game.current_round_index]
                        
                        if next_phase in [CallPhase.SUCCESS, CallPhase.FAILURE]:
                            # Terminal phase, send a quick static message
                            msg = "Call disconnected." if next_phase == CallPhase.FAILURE else "Transaction processed. Thank you."
                            ai_resp = {
                                "message": msg,
                                "suggested_actions": []
                            }
                            log.info(f"🎯 Terminal phase reached: {next_phase.value}")
                        else:
                            history = [h["message"] for h in call_state.history]
                            ai_resp = await generate_phase_response(
                                phase=next_phase,
                                difficulty=game.difficulty,
                                profile=scenario_data["payload"]["caller"],
                                last_action=action_text,
                                history=history,
                                scammer_type=scenario_data["payload"].get("caller", "Unknown"),
                                scenario_details=scenario_data["payload"]
                            )
                            
                            # Ensure 'Hang up' is always available if not terminal
                            if not any("hang up" in str(a.get("option", "")).lower() if isinstance(a, dict) else a.lower() for a in ai_resp.get("suggested_actions", [])):
                                hang_up_action = {"option": "Hang up", "risk_level": "low", "tag": "safe", "explanation": "Hanging up is the safest response to a suspected scam.", "better_action": "None."}
                                ai_resp.setdefault("suggested_actions", []).append(hang_up_action)
                        
                        # 6. Update state
                        call_state.phase = next_phase
                        call_state.history.append({"role": "user", "message": action_text})
                        call_state.history.append({"role": "scammer", "message": ai_resp["message"]})
                        from app.state.game_store import save_game
                        save_game(game)
                        
                        # 🔥 Clear action lock for non-terminal phases (allow next exchange)
                        # One action per message exchange, not one action per entire round
                        if next_phase not in [CallPhase.SUCCESS, CallPhase.FAILURE]:
                            game.round_actions.pop(player_id, None)
                            if hasattr(game, 'user_actions'):
                                game.user_actions.pop(player_id, None)
                            save_game(game)
                            log.info(f"🔓 Action lock cleared for {player_id} - ready for next exchange")
                        
                        # 🔥 Log phase transitions for debugging
                        log.info(f"✅ Player {player_id} action='{action_text}' -> action_type={action_type} -> phase={next_phase.value} - SAVED")
                        
                        # Send update to player
                        await send_to_player(ws, {
                            "event": "call_update",
                            "player_id": player_id,
                            "data": {
                                "phase": next_phase.value,
                                "message": ai_resp["message"],
                                "suggested_actions": ai_resp["suggested_actions"],
                                "ttl": time.time() + 30  # Message valid for 30 seconds
                            }
                        })
                    else:
                        log.error(f"No active round for {player_id} in room {room_code}")
                        await send_to_player(ws, {"event": "error", "message": "No active round"})
                except Exception as e:
                    log.error(f"❌ Exception in user_action handler: {e}", exc_info=True)
                    await send_to_player(ws, {"event": "error", "message": f"Server error: {str(e)}"})
                    continue

            elif msg_type == "ping":
                await send_to_player(ws, {"event": "pong"})

    except WebSocketDisconnect:
        # Only unregister the WS connection — do NOT delete the player record.
        # The game engine still needs the player in the store to score rounds.
        unregister(room_code, ws)
        log.info(f"Game WS: {player.nickname} disconnected from room {room_code}")
