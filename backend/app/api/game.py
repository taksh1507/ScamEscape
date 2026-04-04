from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
import asyncio
import time
from app.schemas.action_schema import SubmitActionRequest
from app.services.game_engine import start_game, _build_leaderboard
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
                    if player_id not in game.round_actions:
                        game.round_actions[player_id] = action
                        game.round_action_times[player_id] = time.time()
                        
                        # 🔥 CRITICAL: End the call immediately if player hangs up
                        if action.lower() in ["hang_up", "decline", "block"]:
                            from app.constants.scenario_types import CallPhase
                            if player_id in game.call_states:
                                game.call_states[player_id].phase = CallPhase.FAILURE
                        
                        from app.state.game_store import save_game
                        save_game(game)
                        await send_to_player(ws, {"event": "action_received", "action": action})
                else:
                    await send_to_player(ws, {"event": "error", "message": "No active round"})

            elif msg_type == "user_action":
                action_data = data.get("action", {})
                # Support both string and object input for backward compatibility
                action_text = action_data.get("option", "") if isinstance(action_data, dict) else action_data
                
                game = get_game(room_code)
                if game and game.round_active:
                    from app.services.adaptive_call_manager import AdaptiveCallManager
                    from app.services.ai_service import generate_phase_response
                    from app.constants.scenario_types import CallPhase
                    
                    call_state = game.call_states.get(player_id)
                    if not call_state:
                        await send_to_player(ws, {"event": "error", "message": "Call state not found"})
                        continue
                    
                    # 1. Determine action type
                    action_type = AdaptiveCallManager.get_action_type(action_text)
                    
                    # 2. Transition phase
                    next_phase = AdaptiveCallManager.get_next_phase(
                        call_state.phase, 
                        game.difficulty, 
                        action_type
                    )
                    
                    # 3. Update profile
                    AdaptiveCallManager.update_user_profile(call_state, action_type)
                    
                    # 4. Handle Decision Evaluation (NEW)
                    if isinstance(action_data, dict) and "risk_level" in action_data:
                        risk_level = action_data.get("risk_level", "low")
                        # Grading logic: Low -> A, Medium -> B, High -> C
                        grade_map = {"low": "A", "medium": "B", "high": "C"}
                        await send_to_player(ws, {
                            "event": "decision_result",
                            "data": {
                                "selected_option": action_text,
                                "risk_level": risk_level,
                                "grade": grade_map.get(risk_level, "B"),
                                "explanation": action_data.get("explanation", "Evaluating your decision..."),
                                "better_action": action_data.get("better_action", "Verify independently.")
                            }
                        })
                    
                    # 5. Generate AI response for next phase (skip if terminal)
                    scenario_data = game.scenarios[game.current_round_index]
                    
                    if next_phase in [CallPhase.SUCCESS, CallPhase.FAILURE]:
                        # Terminal phase, send a quick static message
                        msg = "Call disconnected." if next_phase == CallPhase.FAILURE else "Transaction processed. Thank you."
                        ai_resp = {
                            "message": msg,
                            "suggested_actions": []
                        }
                    else:
                        history = [h["message"] for h in call_state.history]
                        ai_resp = await generate_phase_response(
                            phase=next_phase,
                            difficulty=game.difficulty,
                            profile=scenario_data["payload"]["caller"],
                            last_action=action_text,
                            history=history,
                            scammer_type=scenario_data["payload"].get("caller", "Unknown"),  # NEW: Scenario type for context
                            scenario_details=scenario_data["payload"]  # NEW: Full scenario context
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
                    
                    # 7. Send update to player
                    await send_to_player(ws, {
                        "event": "call_update",
                        "player_id": player_id,
                        "data": {
                            "phase": next_phase.value,
                            "message": ai_resp["message"],
                            "suggested_actions": ai_resp["suggested_actions"]
                        }
                    })
                else:
                    await send_to_player(ws, {"event": "error", "message": "No active round"})

            elif msg_type == "ping":
                await send_to_player(ws, {"event": "pong"})

    except WebSocketDisconnect:
        # Only unregister the WS connection — do NOT delete the player record.
        # The game engine still needs the player in the store to score rounds.
        unregister(room_code, ws)
        log.info(f"Game WS: {player.nickname} disconnected from room {room_code}")
