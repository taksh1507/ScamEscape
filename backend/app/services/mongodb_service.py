"""
MongoDB database service - Handles all MongoDB operations
Provides both async and sync interfaces for MongoDB operations
"""

import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.mongodb import get_database, is_mongodb_connected
from app.models.db_models import LeaderboardEntryDB, RoomDB, PlayerDB, GameSessionDB
from app.utils.logger import get_logger

log = get_logger(__name__)


def _run_async_in_thread(coro):
    """Helper to run async code in a thread pool"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_in_executor(None, lambda: coro)


class MongoDBService:
    """Service for all MongoDB operations"""
    
    @staticmethod
    async def save_room(room_data: Dict[str, Any]) -> bool:
        """
        Save or update room data in MongoDB
        
        Args:
            room_data: Dictionary containing room information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_database()
            if not db:
                log.warning(f"MongoDB not connected, skipping save_room")
                return False
            
            room_code = room_data.get("room_code")
            
            # Use asyncio to run the blocking operation
            await asyncio.to_thread(
                db.rooms.update_one,
                {"room_code": room_code},
                {
                    "$set": {
                        **room_data,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            log.info(f"✅ Room {room_code} saved to MongoDB")
            return True
            
        except Exception as e:
            log.warning(f"⚠️ Failed to save room to MongoDB: {e}")
            return False
    
    @staticmethod
    async def get_room(room_code: str) -> Optional[Dict[str, Any]]:
        """
        Get room data from MongoDB
        
        Args:
            room_code: Room code identifier
            
        Returns:
            Room data or None if not found
        """
        try:
            db = get_database()
            if not db:
                return None
            room = await asyncio.to_thread(db.rooms.find_one, {"room_code": room_code})
            return room
        except Exception as e:
            log.warning(f"⚠️ Failed to get room from MongoDB: {e}")
            return None
    
    @staticmethod
    async def save_player(player_data: Dict[str, Any]) -> bool:
        """
        Save or update player data in MongoDB
        
        Args:
            player_data: Dictionary containing player information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_database()
            if not db:
                log.warning(f"MongoDB not connected, skipping save_player")
                return False
            
            player_id = player_data.get("player_id")
            
            await asyncio.to_thread(
                db.players.update_one,
                {"player_id": player_id},
                {
                    "$set": {
                        **player_data,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            log.info(f"✅ Player {player_id} saved to MongoDB")
            return True
            
        except Exception as e:
            log.warning(f"⚠️ Failed to save player to MongoDB: {e}")
            return False
    
    @staticmethod
    async def get_player(player_id: str) -> Optional[Dict[str, Any]]:
        """
        Get player data from MongoDB
        
        Args:
            player_id: Player ID
            
        Returns:
            Player data or None if not found
        """
        try:
            db = get_database()
            if not db:
                return None
            player = await asyncio.to_thread(db.players.find_one, {"player_id": player_id})
            return player
        except Exception as e:
            log.warning(f"⚠️ Failed to get player from MongoDB: {e}")
            return None
    
    @staticmethod
    async def get_players_in_room(room_code: str) -> List[Dict[str, Any]]:
        """
        Get all players in a room from MongoDB
        
        Args:
            room_code: Room code
            
        Returns:
            List of player documents
        """
        try:
            db = get_database()
            if not db:
                return []
            players = await asyncio.to_thread(
                lambda: list(db.players.find({"room_code": room_code}))
            )
            return players or []
        except Exception as e:
            log.warning(f"⚠️ Failed to get players in room from MongoDB: {e}")
            return []
    
    @staticmethod
    async def save_game_session(
        room_code: str,
        difficulty: str,
        player_results: List[Dict[str, Any]],
        duration_seconds: int
    ) -> bool:
        """
        Save game session results to MongoDB
        
        Args:
            room_code: Room code
            difficulty: Game difficulty level
            player_results: List of player results
            duration_seconds: Total game duration in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_database()
            if not db:
                log.warning(f"MongoDB not connected, skipping save_game_session")
                return False
            
            # Calculate statistics
            scores = [r.get("final_score", 0) for r in player_results]
            average_score = sum(scores) / len(scores) if scores else 0
            highest_score = max(scores) if scores else 0
            lowest_score = min(scores) if scores else 0
            winner = max(player_results, key=lambda x: x.get("final_score", 0)) if player_results else None
            
            game_session = {
                "room_code": room_code,
                "difficulty": difficulty,
                "total_players": len(player_results),
                "player_results": player_results,
                "created_at": datetime.utcnow(),
                "completed_at": datetime.utcnow(),
                "duration_seconds": duration_seconds,
                "average_score": average_score,
                "highest_score": highest_score,
                "lowest_score": lowest_score,
                "winner": winner.get("player_id") if winner else None
            }
            
            await asyncio.to_thread(db.game_sessions.insert_one, game_session)
            log.info(f"✅ Game session {room_code} saved to MongoDB")
            return True
            
        except Exception as e:
            log.warning(f"⚠️ Failed to save game session to MongoDB: {e}")
            return False
    
    @staticmethod
    async def get_global_leaderboard(limit: int = 100) -> List[LeaderboardEntryDB]:
        """
        Get global leaderboard from MongoDB
        
        Args:
            limit: Maximum number of players to return
            
        Returns:
            List of leaderboard entries sorted by score
        """
        try:
            db = get_database()
            if not db:
                return []
            
            def fetch_leaderboard():
                pipeline = [
                    {
                        "$group": {
                            "_id": "$player_id",
                            "nickname": {"$first": "$nickname"},
                            "total_score": {"$sum": {"$cond": ["$final_score", "$final_score", "$score"]}},
                            "games_played": {"$sum": 1},
                            "last_played": {"$max": "$updated_at"}
                        }
                    },
                    {
                        "$addFields": {
                            "average_score": {
                                "$cond": [
                                    {"$gt": ["$games_played", 0]},
                                    {"$divide": ["$total_score", "$games_played"]},
                                    0
                                ]
                            }
                        }
                    },
                    {
                        "$sort": {"total_score": -1}
                    },
                    {
                        "$limit": limit
                    }
                ]
                
                return list(db.players.aggregate(pipeline))
            
            results = await asyncio.to_thread(fetch_leaderboard)
            
            leaderboard = []
            for rank, result in enumerate(results, 1):
                entry = LeaderboardEntryDB(
                    rank=rank,
                    player_id=result.get("_id", ""),
                    nickname=result.get("nickname", "Unknown"),
                    total_score=int(result.get("total_score", 0)),
                    games_played=result.get("games_played", 0),
                    average_score=result.get("average_score", 0.0),
                    last_played=result.get("last_played")
                )
                leaderboard.append(entry)
            
            log.info(f"✅ Global leaderboard retrieved: {len(leaderboard)} entries")
            return leaderboard
            
        except Exception as e:
            log.warning(f"⚠️ Failed to get global leaderboard from MongoDB: {e}")
            return []
    
    @staticmethod
    async def get_room_leaderboard(room_code: str) -> List[LeaderboardEntryDB]:
        """
        Get leaderboard for a specific room
        
        Args:
            room_code: Room code
            
        Returns:
            List of leaderboard entries for the room
        """
        try:
            db = get_database()
            if not db:
                return []
            
            def fetch_players():
                return list(db.players.find({"room_code": room_code}))
            
            players = await asyncio.to_thread(fetch_players)
            
            # Sort by final score or current score
            sorted_players = sorted(
                players, 
                key=lambda p: p.get("final_score", p.get("score", 0)), 
                reverse=True
            )
            
            leaderboard = []
            for rank, player in enumerate(sorted_players, 1):
                entry = LeaderboardEntryDB(
                    rank=rank,
                    player_id=player["player_id"],
                    nickname=player["nickname"],
                    total_score=int(player.get("final_score", player.get("score", 0))),
                    games_played=1,
                    average_score=float(player.get("final_score", player.get("score", 0)))
                )
                leaderboard.append(entry)
            
            log.info(f"✅ Room {room_code} leaderboard retrieved: {len(leaderboard)} players")
            return leaderboard
            
        except Exception as e:
            log.warning(f"⚠️ Failed to get room leaderboard from MongoDB: {e}")
            return []
    
    @staticmethod
    async def get_game_analytics() -> Dict[str, Any]:
        """
        Get overall game analytics from MongoDB
        
        Returns:
            Dictionary with game statistics
        """
        try:
            db = get_database()
            if not db:
                return {}
            
            def fetch_analytics():
                analytics = {}
                
                # Total games
                analytics["total_games"] = db.game_sessions.count_documents({})
                
                # Total players
                analytics["total_players"] = db.players.count_documents({})
                
                # Average duration
                avg_result = list(db.game_sessions.aggregate([
                    {"$group": {"_id": None, "avg_duration": {"$avg": "$duration_seconds"}}}
                ])) or [{"avg_duration": 0}]
                analytics["average_duration"] = int(avg_result[0]["avg_duration"])
                
                # Most played difficulty
                diff_result = list(db.game_sessions.aggregate([
                    {"$group": {"_id": "$difficulty", "count": {"$sum": 1}}},
                    {"$sort": {"count": -1}},
                    {"$limit": 1}
                ])) or [{"_id": "medium"}]
                analytics["most_played_difficulty"] = diff_result[0]["_id"]
                
                # Average winning score
                score_result = list(db.game_sessions.aggregate([
                    {"$group": {"_id": None, "avg_score": {"$avg": "$highest_score"}}}
                ])) or [{"avg_score": 0}]
                analytics["average_winning_score"] = round(score_result[0]["avg_score"], 2)
                
                return analytics
            
            analytics_data = await asyncio.to_thread(fetch_analytics)
            
            analytics = {
                "total_games_played": analytics_data.get("total_games", 0),
                "total_unique_players": analytics_data.get("total_players", 0),
                "average_game_duration_seconds": analytics_data.get("average_duration", 0),
                "most_played_difficulty": analytics_data.get("most_played_difficulty", "medium"),
                "average_winning_score": analytics_data.get("average_winning_score", 0),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            log.info(f"✅ Game analytics retrieved")
            return analytics
            
        except Exception as e:
            log.warning(f"⚠️ Failed to get game analytics from MongoDB: {e}")
            return {}
    
    @staticmethod
    async def get_player_statistics(player_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed statistics for a specific player
        
        Args:
            player_id: Player ID
            
        Returns:
            Player statistics or None if not found
        """
        try:
            db = get_database()
            if not db:
                return None
            
            def fetch_stats():
                player = db.players.find_one({"player_id": player_id})
                if not player:
                    return None
                
                sessions = list(db.game_sessions.find({
                    "player_results.player_id": player_id
                }))
                
                scores = []
                for session in sessions:
                    for result in session.get("player_results", []):
                        if result.get("player_id") == player_id:
                            scores.append(result.get("final_score", 0))
                
                stats = {
                    "player_id": player_id,
                    "nickname": player.get("nickname"),
                    "total_games": len(sessions),
                    "total_score": sum(scores),
                    "average_score": sum(scores) / len(scores) if scores else 0,
                    "highest_score": max(scores) if scores else 0,
                    "lowest_score": min(scores) if scores else 0,
                    "wins": len([s for s in scores if s == max(scores)]) if scores else 0,
                    "last_played": player.get("updated_at")
                }
                return stats
            
            stats = await asyncio.to_thread(fetch_stats)
            if stats:
                log.info(f"✅ Player {player_id} statistics retrieved")
                return stats
            
            return None
            
        except Exception as e:
            log.warning(f"⚠️ Failed to get player statistics from MongoDB: {e}")
            return None
    
    @staticmethod
    async def save_response(response_data: Dict[str, Any]) -> bool:
        """
        Save player response with AI analysis for scoring and learning
        
        Args:
            response_data: Dictionary containing response information including:
                - response_id, room_code, player_id, round_number
                - scenario_type, player_action, correct_action
                - is_correct, points_awarded, response_time, speed_bonus, grade
                - difficulty, scenario_context, player_options_shown
                - ai_analysis, feedback
                
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_database()
            if not db:
                log.warning(f"MongoDB not connected, skipping save_response")
                return False
            
            response_id = response_data.get("response_id")
            player_id = response_data.get("player_id")
            
            await asyncio.to_thread(
                db.player_responses.update_one,
                {"response_id": response_id},
                {
                    "$set": {
                        **response_data,
                        "created_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            log.info(f"✅ Response {response_id} saved for player {player_id}")
            return True
            
        except Exception as e:
            log.warning(f"⚠️ Failed to save response to MongoDB: {e}")
            return False
    
    @staticmethod
    async def get_player_response_stats(player_id: str) -> Optional[Dict[str, Any]]:
        """
        Get aggregated response statistics for a player
        
        Args:
            player_id: Player ID
            
        Returns:
            Player response statistics or None if not found
        """
        try:
            db = get_database()
            if not db:
                return None
            
            def fetch_response_stats():
                responses = list(db.player_responses.find({"player_id": player_id}))
                
                if not responses:
                    return None
                
                total_responses = len(responses)
                correct_responses = len([r for r in responses if r.get("is_correct", False)])
                accuracy_rate = (correct_responses / total_responses * 100) if total_responses > 0 else 0
                total_points = sum(r.get("points_awarded", 0) for r in responses)
                avg_response_time = sum(r.get("response_time", 0) for r in responses) / total_responses if total_responses > 0 else 0
                
                # Grade distribution
                grades = [r.get("grade", "F") for r in responses]
                most_common_grade = max(set(grades), key=grades.count) if grades else "B"
                
                # Scenario type breakdown
                scenario_accuracy = {}
                for scenario_type in ["call", "sms", "email", "bank"]:
                    type_responses = [r for r in responses if r.get("scenario_type") == scenario_type]
                    if type_responses:
                        correct = len([r for r in type_responses if r.get("is_correct", False)])
                        accuracy = (correct / len(type_responses) * 100)
                        scenario_accuracy[scenario_type] = accuracy
                
                # Identify weak and strong areas
                weak_areas = [st for st, acc in scenario_accuracy.items() if acc < 60]
                strong_areas = [st for st, acc in scenario_accuracy.items() if acc >= 80]
                
                return {
                    "player_id": player_id,
                    "total_responses": total_responses,
                    "correct_responses": correct_responses,
                    "accuracy_rate": round(accuracy_rate, 2),
                    "total_points": total_points,
                    "average_response_time": round(avg_response_time, 2),
                    "most_common_grade": most_common_grade,
                    "scenario_accuracy": scenario_accuracy,
                    "weak_areas": weak_areas,
                    "strong_areas": strong_areas,
                    "updated_at": datetime.utcnow().isoformat()
                }
            
            stats = await asyncio.to_thread(fetch_response_stats)
            if stats:
                log.info(f"✅ Response stats retrieved for player {player_id}")
                return stats
            
            return None
            
        except Exception as e:
            log.warning(f"⚠️ Failed to get response stats from MongoDB: {e}")
            return None
    
    @staticmethod
    async def get_game_response_analysis(room_code: str) -> List[Dict[str, Any]]:
        """
        Get all player responses for a game session with analysis
        
        Args:
            room_code: Room code for the game session
            
        Returns:
            List of player responses for that game
        """
        try:
            db = get_database()
            if not db:
                return []
            
            def fetch_responses():
                return list(db.player_responses.find(
                    {"room_code": room_code},
                    sort=[("round_number", 1), ("created_at", 1)]
                ))
            
            responses = await asyncio.to_thread(fetch_responses)
            log.info(f"✅ Retrieved {len(responses)} responses for room {room_code}")
            return responses
            
        except Exception as e:
            log.warning(f"⚠️ Failed to get game responses from MongoDB: {e}")
            return []
    
    """Service for all MongoDB operations"""
    
    @staticmethod
    async def save_room(room_data: Dict[str, Any]) -> bool:
        """
        Save or update room data in MongoDB
        
        Args:
            room_data: Dictionary containing room information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_database()
            room_code = room_data.get("room_code")
            
            # Convert to RoomDB model for validation
            room_db = RoomDB(
                room_code=room_code,
                leader_id=room_data.get("leader_id"),
                status=room_data.get("status", "waiting"),
                player_ids=room_data.get("player_ids", []),
                current_round=room_data.get("current_round", 0),
                difficulty=room_data.get("difficulty"),
            )
            
            # Update or insert
            result = await db.rooms.update_one(
                {"room_code": room_code},
                {
                    "$set": {
                        **room_db.model_dump(exclude_unset=False),
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            log.info(f"✅ Room {room_code} saved to MongoDB")
            return True
            
        except Exception as e:
            log.error(f"❌ Failed to save room: {e}")
            return False
    
    @staticmethod
    async def get_room(room_code: str) -> Optional[Dict[str, Any]]:
        """
        Get room data from MongoDB
        
        Args:
            room_code: Room code identifier
            
        Returns:
            Room data or None if not found
        """
        try:
            db = get_database()
            room = await db.rooms.find_one({"room_code": room_code})
            return room
        except Exception as e:
            log.error(f"❌ Failed to get room {room_code}: {e}")
            return None
    
    @staticmethod
    async def save_player(player_data: Dict[str, Any]) -> bool:
        """
        Save or update player data in MongoDB
        
        Args:
            player_data: Dictionary containing player information
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_database()
            player_id = player_data.get("player_id")
            
            # Convert to PlayerDB model for validation
            player_db = PlayerDB(
                player_id=player_id,
                nickname=player_data.get("nickname"),
                room_code=player_data.get("room_code"),
                is_leader=player_data.get("is_leader", False),
                score=player_data.get("score", 0),
            )
            
            result = await db.players.update_one(
                {"player_id": player_id},
                {
                    "$set": {
                        **player_db.model_dump(exclude_unset=False),
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            log.info(f"✅ Player {player_id} saved to MongoDB")
            return True
            
        except Exception as e:
            log.error(f"❌ Failed to save player: {e}")
            return False
    
    @staticmethod
    async def get_player(player_id: str) -> Optional[Dict[str, Any]]:
        """
        Get player data from MongoDB
        
        Args:
            player_id: Player ID
            
        Returns:
            Player data or None if not found
        """
        try:
            db = get_database()
            player = await db.players.find_one({"player_id": player_id})
            return player
        except Exception as e:
            log.error(f"❌ Failed to get player {player_id}: {e}")
            return None
    
    @staticmethod
    async def get_players_in_room(room_code: str) -> List[Dict[str, Any]]:
        """
        Get all players in a room from MongoDB
        
        Args:
            room_code: Room code
            
        Returns:
            List of player documents
        """
        try:
            db = get_database()
            players = await db.players.find({"room_code": room_code}).to_list(None)
            return players or []
        except Exception as e:
            log.error(f"❌ Failed to get players in room {room_code}: {e}")
            return []
    
    @staticmethod
    async def save_game_session(
        room_code: str,
        difficulty: str,
        player_results: List[Dict[str, Any]],
        duration_seconds: int
    ) -> bool:
        """
        Save game session results to MongoDB
        
        Args:
            room_code: Room code
            difficulty: Game difficulty level
            player_results: List of player results
            duration_seconds: Total game duration in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            db = get_database()
            
            # Calculate statistics
            scores = [r.get("final_score", 0) for r in player_results]
            average_score = sum(scores) / len(scores) if scores else 0
            highest_score = max(scores) if scores else 0
            lowest_score = min(scores) if scores else 0
            winner = max(player_results, key=lambda x: x.get("final_score", 0)) if player_results else None
            
            game_session = GameSessionDB(
                room_code=room_code,
                difficulty=difficulty,
                total_players=len(player_results),
                player_results=player_results,
                completed_at=datetime.utcnow(),
                duration_seconds=duration_seconds,
                average_score=average_score,
                highest_score=highest_score,
                lowest_score=lowest_score,
                winner=winner.get("player_id") if winner else None
            )
            
            result = await db.game_sessions.insert_one(game_session.model_dump())
            log.info(f"✅ Game session {room_code} saved to MongoDB")
            return True
            
        except Exception as e:
            log.error(f"❌ Failed to save game session: {e}")
            return False
    
    @staticmethod
    async def get_global_leaderboard(limit: int = 100) -> List[LeaderboardEntryDB]:
        """
        Get global leaderboard from MongoDB
        
        Args:
            limit: Maximum number of players to return
            
        Returns:
            List of leaderboard entries sorted by score
        """
        try:
            db = get_database()
            
            # Aggregate player data from all sessions
            pipeline = [
                {
                    "$group": {
                        "_id": "$player_id",
                        "nickname": {"$first": "$nickname"},
                        "total_score": {"$sum": "$final_score"},
                        "games_played": {"$sum": 1},
                        "last_played": {"$max": "$completion_time"}
                    }
                },
                {
                    "$addFields": {
                        "average_score": {
                            "$cond": [
                                {"$gt": ["$games_played", 0]},
                                {"$divide": ["$total_score", "$games_played"]},
                                0
                            ]
                        }
                    }
                },
                {
                    "$sort": {"total_score": -1}
                },
                {
                    "$limit": limit
                }
            ]
            
            results = await db.players.aggregate(pipeline).to_list(None)
            
            leaderboard = []
            for rank, result in enumerate(results, 1):
                entry = LeaderboardEntryDB(
                    rank=rank,
                    player_id=result["_id"],
                    nickname=result.get("nickname", "Unknown"),
                    total_score=result.get("total_score", 0),
                    games_played=result.get("games_played", 0),
                    average_score=result.get("average_score", 0.0),
                    last_played=result.get("last_played")
                )
                leaderboard.append(entry)
            
            log.info(f"✅ Global leaderboard retrieved: {len(leaderboard)} entries")
            return leaderboard
            
        except Exception as e:
            log.error(f"❌ Failed to get global leaderboard: {e}")
            return []
    
    @staticmethod
    async def get_room_leaderboard(room_code: str) -> List[LeaderboardEntryDB]:
        """
        Get leaderboard for a specific room
        
        Args:
            room_code: Room code
            
        Returns:
            List of leaderboard entries for the room
        """
        try:
            db = get_database()
            
            players = await db.players.find({"room_code": room_code}).to_list(None)
            
            # Sort by score
            sorted_players = sorted(players, key=lambda p: p.get("final_score", p.get("score", 0)), reverse=True)
            
            leaderboard = []
            for rank, player in enumerate(sorted_players, 1):
                entry = LeaderboardEntryDB(
                    rank=rank,
                    player_id=player["player_id"],
                    nickname=player["nickname"],
                    total_score=player.get("final_score", player.get("score", 0)),
                    games_played=1,
                    average_score=float(player.get("final_score", player.get("score", 0)))
                )
                leaderboard.append(entry)
            
            log.info(f"✅ Room {room_code} leaderboard retrieved: {len(leaderboard)} players")
            return leaderboard
            
        except Exception as e:
            log.error(f"❌ Failed to get room leaderboard: {e}")
            return []
    
    @staticmethod
    async def get_game_analytics() -> Dict[str, Any]:
        """
        Get overall game analytics from MongoDB
        
        Returns:
            Dictionary with game statistics
        """
        try:
            db = get_database()
            
            # Total games played
            total_games = await db.game_sessions.count_documents({})
            
            # Total unique players
            unique_players = await db.players.count_documents({})
            
            # Average game duration
            avg_duration_result = await db.game_sessions.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "average_duration": {"$avg": "$duration_seconds"}
                    }
                }
            ]).to_list(1)
            
            average_duration = avg_duration_result[0]["average_duration"] if avg_duration_result else 0
            
            # Most played difficulty
            difficulty_result = await db.game_sessions.aggregate([
                {
                    "$group": {
                        "_id": "$difficulty",
                        "count": {"$sum": 1}
                    }
                },
                {
                    "$sort": {"count": -1}
                },
                {
                    "$limit": 1
                }
            ]).to_list(1)
            
            most_played_difficulty = difficulty_result[0]["_id"] if difficulty_result else "medium"
            
            # Average winning score
            avg_score_result = await db.game_sessions.aggregate([
                {
                    "$group": {
                        "_id": None,
                        "average_score": {"$avg": "$highest_score"}
                    }
                }
            ]).to_list(1)
            
            average_winning_score = avg_score_result[0]["average_score"] if avg_score_result else 0
            
            analytics = {
                "total_games_played": total_games,
                "total_unique_players": unique_players,
                "average_game_duration_seconds": int(average_duration),
                "most_played_difficulty": most_played_difficulty,
                "average_winning_score": round(average_winning_score, 2),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            log.info(f"✅ Game analytics retrieved")
            return analytics
            
        except Exception as e:
            log.error(f"❌ Failed to get game analytics: {e}")
            return {}
    
    @staticmethod
    async def get_player_statistics(player_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed statistics for a specific player
        
        Args:
            player_id: Player ID
            
        Returns:
            Player statistics or None if not found
        """
        try:
            db = get_database()
            
            player = await db.players.find_one({"player_id": player_id})
            if not player:
                return None
            
            # Get player's game sessions
            sessions = await db.game_sessions.find({
                "player_results.player_id": player_id
            }).to_list(None)
            
            scores = []
            for session in sessions:
                for result in session.get("player_results", []):
                    if result.get("player_id") == player_id:
                        scores.append(result.get("final_score", 0))
            
            stats = {
                "player_id": player_id,
                "nickname": player.get("nickname"),
                "total_games": len(sessions),
                "total_score": sum(scores),
                "average_score": sum(scores) / len(scores) if scores else 0,
                "highest_score": max(scores) if scores else 0,
                "lowest_score": min(scores) if scores else 0,
                "wins": len([s for s in scores if s == max(scores)]) if scores else 0,
                "last_played": player.get("updated_at")
            }
            
            log.info(f"✅ Player {player_id} statistics retrieved")
            return stats
            
        except Exception as e:
            log.error(f"❌ Failed to get player statistics: {e}")
            return None

    @staticmethod
    async def save_leaderboard(leaderboard_data: Dict[str, Any]) -> bool:
        """
        Save room leaderboard snapshot to MongoDB
        Stores moment-in-time leaderboard with player rankings and stats
        """
        try:
            db = get_database()
            leaderboards = db["leaderboards"]
            
            # Add timestamp if not present
            if "timestamp" not in leaderboard_data:
                import time
                leaderboard_data["timestamp"] = time.time()
            
            result = leaderboards.insert_one(leaderboard_data)
            log.info(f"✅ Leaderboard saved for room {leaderboard_data.get('room_code')}: {result.inserted_id}")
            return True
            
        except Exception as e:
            log.error(f"❌ Failed to save leaderboard: {e}")
            return False

    @staticmethod
    async def save_player_stats(stats_data: Dict[str, Any]) -> bool:
        """
        Save player performance statistics to MongoDB
        Tracks: games_won, games_scammed, win_rate, total_score, etc.
        Used to build realistic leaderboard
        """
        try:
            db = get_database()
            player_stats = db["player_stats"]
            
            player_id = stats_data.get("player_id")
            
            # Add timestamp if not present
            if "timestamp" not in stats_data:
                import time
                stats_data["timestamp"] = time.time()
            
            # Update or insert player stats
            result = player_stats.update_one(
                {"player_id": player_id},
                {"$set": stats_data},
                upsert=True
            )
            
            log.info(f"✅ Player {player_id} stats saved - Won: {stats_data.get('games_won')}, Scammed: {stats_data.get('games_scammed')}, Win Rate: {stats_data.get('win_rate', 0):.1f}%")
            return True
            
        except Exception as e:
            log.error(f"❌ Failed to save player stats: {e}")
            return False
