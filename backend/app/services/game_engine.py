"""
game_engine.py

Orchestrates the full game lifecycle:
  lobby → Round 1 (Call) → Round 2 (Chat Simulation) → leaderboard
"""

import asyncio
import time
from app.models.room import Room, RoomStatus
from app.models.game_state import GameState
from app.state.rooms_store import get_room, save_room
from app.state.game_store import get_game, save_game
from app.state.player_store import get_players_in_room
from app.services.round_manager import run_round
from app.services.mongodb_service import MongoDBService
from app.constants.game_constants import TOTAL_ROUNDS
from app.utils.logger import get_logger

log = get_logger(__name__)


async def start_game(room_code: str, broadcast_fn, difficulty: str = "easy") -> bool:
    """
    Runs all game rounds:
    - Round 1: Call Simulation (backend-managed)
    - Round 2: Chat Simulation (frontend-managed, backend tracks decision)
    """
    room = get_room(room_code)
    if not room:
        log.warning(f"start_game: room {room_code} not found")
        return False

    if room.status == RoomStatus.FINISHED:
        log.warning(f"start_game: room {room_code} already finished")
        return False

    # ── Setup ─────────────────────────────────────────────────────────────────
    room.status = RoomStatus.PLAYING
    room.current_round = 1
    save_room(room)
    
    # 🔥 Update MongoDB with playing status
    try:
        await MongoDBService.save_room({
            "room_code": room.room_code,
            "leader_id": room.leader_id,
            "status": "playing",
            "player_ids": room.player_ids,
            "current_round": room.current_round,
            "difficulty": difficulty,
        })
    except Exception as e:
        log.warning(f"⚠️ Failed to update room status in MongoDB: {e}")

    # 🔥 CRITICAL: Generate dynamic call scenario from AI instead of using hardcoded default
    from app.services.ai_service import generate_call_scenario
    log.info(f"🎯 Generating dynamic scenario for Round 1 with difficulty: {difficulty}")
    
    try:
        call_scenario_data = await generate_call_scenario(difficulty=difficulty)
        if call_scenario_data:
            caller_name = call_scenario_data.get("caller", "Unknown")
            log.info(f"✅ Round 1 scenario generated!")
            log.info(f"📞 Caller: {caller_name}")
            log.info(f"📝 Script preview: {call_scenario_data.get('script', ['N/A'])[0] if call_scenario_data.get('script') else 'N/A'}")
            
            round1_scenario = {
                "type": "call",
                "correct_action": call_scenario_data.get("correct_answer", "block"),
                "red_flags": call_scenario_data.get("red_flags", ["Urgency", "Authority claim", "OTP request"]),
                "payload": {
                    "tip": call_scenario_data.get("tip", "Stay alert!"),
                    "caller": caller_name,
                    "script": call_scenario_data.get("script", []),
                    "options": call_scenario_data.get("options", []),
                }
            }
        else:
            # Fallback if AI generation fails
            log.warning(f"⚠️ AI scenario generation returned None, using fallback")
            round1_scenario = _get_fallback_scenario()
    except Exception as e:
        log.error(f"❌ Error generating Round 1 scenario: {e}", exc_info=True)
        round1_scenario = _get_fallback_scenario()

    # 🔥 Round 2: Chat simulation scenario (generated on frontend, but tracked here)
    round2_scenario = {
        "type": "chat",
        "correct_action": "detect_scam",
        "red_flags": ["Emotional pressure", "Urgent request", "Payment via link/QR"],
        "payload": {
            "tip": "Look for signs of emotional manipulation and suspicious payment methods!",
            "scenario_type": "relative_emergency",
        }
    }

    game = GameState(room_code=room_code, difficulty=difficulty, scenarios=[round1_scenario, round2_scenario])
    save_game(game)

    await broadcast_fn(room_code, {
        "event": "game_start",
        "room_code": room_code,
        "total_rounds": TOTAL_ROUNDS,
        "difficulty": difficulty,
    })

    log.info(f"Game started in room {room_code} — difficulty: {difficulty} — {TOTAL_ROUNDS} rounds")

    # ── Run All Rounds ────────────────────────────────────────────────────────
    total_start_time = time.time()
    
    for round_num in range(1, TOTAL_ROUNDS + 1):
        log.info(f"\n🔥 ─── ROUND {round_num} START ─── 🔥")
        room = get_room(room_code)
        if room:
            room.current_round = round_num
            save_room(room)
        
        start_time = time.time()
        await run_round(room_code, round_num, broadcast_fn)
        duration_seconds = int(time.time() - start_time)
        log.info(f"Round {round_num} complete in {room_code}. Duration: {duration_seconds}s")
    
    total_duration_seconds = int(time.time() - total_start_time)
    log.info(f"\n🏁 All {TOTAL_ROUNDS} rounds complete. Total duration: {total_duration_seconds}s")

    # ── Finish ────────────────────────────────────────────────────────────────
    room = get_room(room_code)
    if room:
        room.status = RoomStatus.FINISHED
        save_room(room)

    leaderboard = _build_leaderboard(room_code)
    
    # 🔥 Save game session to MongoDB with final results
    try:
        players = get_players_in_room(room_code)
        player_results = [
            {
                "player_id": p.player_id,
                "nickname": p.nickname,
                "final_score": p.score,
            }
            for p in players
        ]
        
        # Update players with final scores in MongoDB
        for player in players:
            await MongoDBService.save_player({
                "player_id": player.player_id,
                "nickname": player.nickname,
                "room_code": player.room_code,
                "is_leader": player.is_leader,
                "score": player.score,
                "final_score": player.score,
            })
        
        # Save game session
        await MongoDBService.save_game_session(
            room_code=room_code,
            difficulty=difficulty,
            player_results=player_results,
            duration_seconds=total_duration_seconds
        )
        
        # Update room to finished in MongoDB
        await MongoDBService.save_room({
            "room_code": room.room_code,
            "leader_id": room.leader_id,
            "status": "finished",
            "player_ids": room.player_ids,
            "current_round": room.current_round,
            "difficulty": difficulty,
        })
        
        log.info(f"✅ Game session {room_code} saved to MongoDB with {len(player_results)} players")
    except Exception as e:
        log.warning(f"⚠️ Failed to save game session to MongoDB: {e}")
    
    await broadcast_fn(room_code, {
        "event": "game_over",
        "room_code": room_code,
        "leaderboard": leaderboard,
    })

    log.info(f"Game finished in room {room_code}")
    return True


def _build_leaderboard(room_code: str):
    """
    Build realistic leaderboard by analyzing player performance stats.
    Scans room for:
    - Win rate (games won / total games)
    - Scammed rate (times fell for scam)
    - Average score per game
    - Generates realistic scores based on performance
    
    Returns sorted list of players by total score with detailed stats.
    """
    import random
    
    players = get_players_in_room(room_code)
    leaderboard_data = []
    
    for i, p in enumerate(players):
        # 🔥 Generate realistic score based on performance
        total_games_played = p.total_games if p.total_games > 0 else 1
        win_rate = (p.games_won / total_games_played * 100) if total_games_played > 0 else 0
        
        # Base score: Calculate from games won and lost
        base_score = (p.games_won * 100) + (p.games_scammed * 25)  # Success = 100pts, scammed = 25pts
        
        # Add randomness for variety (±10% variation)
        random_variation = random.uniform(0.9, 1.1)
        final_score = int(base_score * random_variation)
        
        # Update player's calculated stats
        p.avg_score_per_game = final_score / total_games_played
        p.win_rate = win_rate
        
        leaderboard_data.append({
            "rank": 0,  # Will be set after sorting
            "player_id": p.player_id,
            "nickname": p.nickname,
            "total_score": final_score,
            "total_games": total_games_played,
            "games_won": p.games_won,  # Avoided scam
            "games_scammed": p.games_scammed,  # Fell for scam
            "win_rate": round(win_rate, 1),  # Percentage
            "avg_score_per_game": round(p.avg_score_per_game, 1),
            "status": "success" if p.games_won > p.games_scammed else "needs_improvement" if p.games_scammed > 0 else "beginner",
        })
    
    # Sort by total score (highest first)
    leaderboard_data.sort(key=lambda x: x["total_score"], reverse=True)
    
    # Add ranks
    for idx, entry in enumerate(leaderboard_data):
        entry["rank"] = idx + 1
    
    # 🔥 Store leaderboard in MongoDB for analytics
    try:
        import asyncio
        asyncio.create_task(MongoDBService.save_leaderboard({
            "room_code": room_code,
            "timestamp": time.time(),
            "players": leaderboard_data
        }))
    except Exception as e:
        log.warning(f"⚠️ Failed to save leaderboard to MongoDB: {e}")
    
    log.info(f"📊 Leaderboard built for room {room_code}: {len(leaderboard_data)} players")
    for entry in leaderboard_data:
        log.info(f"  Rank {entry['rank']}: {entry['nickname']} - {entry['total_score']}pts (Won: {entry['games_won']}, Scammed: {entry['games_scammed']})")
    
    return leaderboard_data


def record_player_performance(player_id: str, was_scammed: bool, points_earned: int = 0):
    """
    📊 PERFORMANCE TRACKER - Records if player was scammed or avoided scam
    
    Updates player stats:
    - total_games: increment
    - games_won: increment if avoided scam
    - games_scammed: increment if fell for scam
    - score: add points earned
    - win_rate: recalculate
    
    This data is stored in database for realistic leaderboard generation.
    """
    from app.state.player_store import get_player, save_player
    
    player = get_player(player_id)
    if not player:
        log.warning(f"⚠️ Player {player_id} not found for performance tracking")
        return
    
    # Update performance metrics
    player.total_games += 1
    if was_scammed:
        player.games_scammed += 1
        log.info(f"❌ {player.nickname} got SCAMMED (Total games: {player.total_games}, Scammed: {player.games_scammed})")
    else:
        player.games_won += 1
        log.info(f"✅ {player.nickname} AVOIDED SCAM (Total games: {player.total_games}, Won: {player.games_won})")
    
    # Recalculate win rate
    if player.total_games > 0:
        player.win_rate = (player.games_won / player.total_games) * 100
    
    # Add points to total score
    player.score += points_earned
    
    # Save updated player stats
    save_player(player)
    
    # Store in MongoDB for analytics
    try:
        import asyncio
        asyncio.create_task(MongoDBService.save_player_stats({
            "player_id": player_id,
            "nickname": player.nickname,
            "total_games": player.total_games,
            "games_won": player.games_won,
            "games_scammed": player.games_scammed,
            "win_rate": player.win_rate,
            "total_score": player.score,
            "timestamp": time.time(),
            "last_performance": "scammed" if was_scammed else "success"
        }))
    except Exception as e:
        log.warning(f"⚠️ Failed to save player stats to MongoDB: {e}")
    
    log.info(f"📊 Player {player.nickname}: {player.games_won}W/{player.games_scammed}L - Win Rate: {player.win_rate:.1f}%")



def _get_fallback_scenario() -> dict:
    """
    Fallback scenario when AI generation fails.
    Used only when GROQ API is unavailable.
    """
    return {
        "type": "call",
        "correct_action": "block",
        "red_flags": ["Urgency", "Authority claim", "Request for sensitive info"],
        "payload": {
            "tip": "Always verify calls by contacting your bank directly!",
            "caller": "Bank Security Officer",
            "script": [
                "Hello, this is a call from your bank's fraud department. We've detected suspicious activity on your account.",
                "We need to verify some information immediately. Can you provide your account number?",
                "For security, we'll need your one-time password sent to your phone.",
            ],
            "options": [
                "Ask clarifying questions",
                "Request verification details",
                "Hang up and call the bank directly",
                "Provide the requested information"
            ]
        }
    }
