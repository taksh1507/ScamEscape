"""
Round 2 (WhatsApp) API Routes
Handles all Round 2 gameplay endpoints
"""

from fastapi import APIRouter, WebSocket, Query, HTTPException, Body
from typing import Optional, Dict, Any, List
import json

from app.services.round2_game_manager import Round2GameManager
from app.constants.whatsapp_types import ScammerType, PowerUp
from app.utils.logger import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/round2", tags=["round2"])

# Store active games by room_code
active_games: Dict[str, Round2GameManager] = {}


@router.post("/initialize")
async def initialize_round2(
    room_code: str = Body(...),
    player_ids: List[str] = Body(...),
    difficulty: str = Query("medium"),
    scammer_type: Optional[str] = None,
) -> Dict[str, Any]:
    """Initialize a new Round 2 game"""
    
    try:
        # Create game manager
        manager = Round2GameManager(room_code, difficulty)
        
        # Parse scammer type
        scammer_types = None
        if scammer_type:
            try:
                scammer_types = [ScammerType(scammer_type)]
            except ValueError:
                pass
        
        # Initialize game
        init_result = await manager.initialize_game(player_ids, scammer_types)
        
        # Store manager
        active_games[room_code] = manager
        
        log.info(f"Round 2 initialized: room={room_code}, players={len(player_ids)}")
        
        return {
            "status": "initialized",
            "room_code": room_code,
            **init_result,
        }
    
    except Exception as e:
        log.error(f"Error initializing Round 2: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/play/{room_code}")
async def websocket_round2_gameplay(websocket: WebSocket, room_code: str):
    """WebSocket endpoint for Round 2 real-time gameplay"""
    
    await websocket.accept()
    
    if room_code not in active_games:
        await websocket.send_json({
            "error": "Game not initialized",
            "room_code": room_code
        })
        await websocket.close()
        return
    
    manager = active_games[room_code]
    player_id = None
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            event = data.get("event")
            
            if event == "identify":
                player_id = data.get("player_id")
                await websocket.send_json({
                    "event": "identified",
                    "player_id": player_id,
                    "status": "ready"
                })
            
            elif event == "start_game":
                await manager.start_round(
                    broadcast_fn=lambda room, msg: broadcast_to_room(room, msg, websocket)
                )
                await websocket.send_json({
                    "event": "game_started",
                    "status": "round_active"
                })
            
            elif event == "player_message":
                if not player_id:
                    continue
                message = data.get("message", "")
                result = await manager.handle_player_message(player_id, message)
                await websocket.send_json({
                    "event": "message_processed",
                    **result
                })
            
            elif event == "player_action":
                if not player_id:
                    continue
                action = data.get("action")
                context = data.get("context", {})
                result = await manager.handle_player_action(player_id, action, context)
                await websocket.send_json({
                    "event": "action_processed",
                    **result
                })
            
            elif event == "use_power_up":
                if not player_id:
                    continue
                power_up = data.get("power_up")
                result = await manager.handle_power_up_use(player_id, power_up)
                await websocket.send_json({
                    "event": "power_up_used",
                    **result
                })
            
            elif event == "end_game":
                break
    
    except Exception as e:
        log.error(f"WebSocket error in Round 2: {str(e)}")
        await websocket.send_json({
            "error": str(e),
            "status": "error"
        })
    
    finally:
        await websocket.close()


@router.post("/finish")
async def finish_round2_game(room_code: str) -> Dict[str, Any]:
    """Finish Round 2 game and get results"""
    
    if room_code not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    try:
        manager = active_games[room_code]
        results = await manager.finish_game()
        
        # Convert results to JSON-serializable format
        results_json = {}
        for player_id, result in results.items():
            results_json[player_id] = {
                "player_id": result.player_id,
                "room_code": result.room_code,
                "scammer_type": result.scammer_type.value,
                "difficulty": result.difficulty,
                "duration_seconds": result.duration_seconds,
                "total_score": result.total_score,
                "mistakes_made": result.mistakes_made,
                "correct_decisions": result.correct_decisions,
                "behavior_profile": result.behavior_profile,
                "avg_response_time": result.avg_response_time,
                "questions_asked": result.questions_asked,
                "panic_level": result.panic_level,
                "total_warnings": result.total_warnings,
                "warnings_ignored": result.warnings_ignored,
                "critical_mistakes": result.critical_mistakes,
                "fell_for_scam": result.fell_for_scam,
                "scam_completion_percentage": result.scam_completion_percentage,
                "key_mistakes": result.key_mistakes,
                "improvement_areas": result.improvement_areas,
                "learning_score": result.learning_score,
            }
        
        # Clean up
        del active_games[room_code]
        
        return {
            "status": "completed",
            "room_code": room_code,
            "results": results_json,
        }
    
    except Exception as e:
        log.error(f"Error finishing Round 2: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/game-status/{room_code}")
async def get_game_status(room_code: str) -> Dict[str, Any]:
    """Get current game status"""
    
    if room_code not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    manager = active_games[room_code]
    
    return {
        "room_code": room_code,
        "active": manager.game_state.round_active,
        "completed": manager.game_state.round_completed,
        "scammer_type": manager.game_state.scammer_type.value,
        "difficulty": manager.difficulty,
        "current_stage": manager.scam_flow.get_current_stage().value if manager.scam_flow else None,
        "message_count": len(manager.game_state.message_sequence),
        "messages_delivered": manager.game_state.current_message_index,
        "player_count": len(manager.game_state.player_states),
        "players": [
            {
                "player_id": pid,
                "fell_for_scam": pstate.fell_for_scam,
                "scam_progress": pstate.scam_completion_percentage,
                "game_completed": pstate.game_completed,
            }
            for pid, pstate in manager.game_state.player_states.items()
        ]
    }


@router.get("/player-analytics/{room_code}/{player_id}")
async def get_player_analytics(room_code: str, player_id: str) -> Dict[str, Any]:
    """Get real-time analytics for a player"""
    
    if room_code not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    manager = active_games[room_code]
    
    if player_id not in manager.game_state.player_states:
        raise HTTPException(status_code=404, detail="Player not in game")
    
    player_state = manager.game_state.player_states[player_id]
    
    behavior_summary = manager.behavior_detector.generate_behavior_summary(player_id)
    warning_summary = manager.warning_system.get_warning_summary(player_id)
    power_up_analytics = manager.power_up_system.get_power_up_analytics(player_id)
    time_pressure_analytics = manager.time_pressure_system.get_pressure_analytics(player_id)
    
    return {
        "player_id": player_id,
        "scam_progress": player_state.scam_completion_percentage,
        "messages_received": len(player_state.messages_received),
        "messages_sent": len(player_state.messages_sent),
        "actions_taken": len(player_state.actions_taken),
        "behavior": behavior_summary,
        "warnings": warning_summary,
        "power_ups": power_up_analytics,
        "time_pressure": time_pressure_analytics,
        "available_power_ups": {
            k.value: v for k, v in manager.power_up_system.get_available_power_ups(player_id).items()
        }
    }


@router.get("/available-power-ups/{room_code}/{player_id}")
async def get_available_power_ups(room_code: str, player_id: str) -> Dict[str, Any]:
    """Get available power-ups for a player"""
    
    if room_code not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    manager = active_games[room_code]
    
    if player_id not in manager.game_state.player_states:
        raise HTTPException(status_code=404, detail="Player not in game")
    
    power_ups = manager.power_up_system.get_available_power_ups(player_id)
    
    return {
        "player_id": player_id,
        "power_ups": [
            {
                "name": pu.value,
                "available": count,
                "description": "Power-up description here"
            }
            for pu, count in power_ups.items()
        ]
    }


async def broadcast_to_room(room_code: str, message: Dict[str, Any], websocket: WebSocket):
    """Broadcast message to all players in a room"""
    try:
        # Only send if connection is still open
        # client_state: 0=CONNECTING, 1=CONNECTED, 2=DISCONNECTING, 3=DISCONNECTED
        if websocket.client_state.value in [0, 1]:  # CONNECTING or CONNECTED
            await websocket.send_json(message)
    except RuntimeError as e:
        # WebSocket already closed or closing, silently ignore
        if "send" in str(e) or "close" in str(e).lower():
            pass  # Expected when connection is closed
        else:
            log.debug(f"WebSocket runtime error: {str(e)}")
    except Exception as e:
        # Connection already closed, silently ignore
        log.debug(f"Broadcast skipped: {type(e).__name__}")
