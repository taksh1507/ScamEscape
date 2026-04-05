"""
MongoDB database models (Pydantic models for MongoDB documents)
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class RoomStatusDB(str, Enum):
    """Room status for MongoDB"""
    WAITING = "waiting"
    PLAYING = "playing"
    FINISHED = "finished"


class RoomDB(BaseModel):
    """MongoDB Room document model"""
    room_code: str = Field(..., description="Unique room code")
    leader_id: str = Field(..., description="ID of the room leader")
    status: RoomStatusDB = Field(default=RoomStatusDB.WAITING, description="Current room status")
    player_ids: List[str] = Field(default_factory=list, description="List of player IDs in room")
    current_round: int = Field(default=0, description="Current round (0=not started)")
    difficulty: Optional[str] = Field(default=None, description="Game difficulty level")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Room creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    started_at: Optional[datetime] = Field(default=None, description="Game start timestamp")
    ended_at: Optional[datetime] = Field(default=None, description="Game end timestamp")
    max_players: int = Field(default=4, description="Maximum players allowed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "room_code": "ABC123",
                "leader_id": "user_001",
                "status": "waiting",
                "player_ids": ["user_001", "user_002"],
                "created_at": "2026-04-05T10:00:00Z"
            }
        }


class PlayerDB(BaseModel):
    """MongoDB Player document model"""
    player_id: str = Field(..., description="Unique player ID")
    nickname: str = Field(..., description="Player nickname")
    room_code: str = Field(..., description="Room code player is in")
    is_leader: bool = Field(default=False, description="Whether player is room leader")
    score: int = Field(default=0, description="Current score")
    final_score: Optional[int] = Field(default=None, description="Final score after game completion")
    last_action: Optional[str] = Field(default=None, description="Last action submitted")
    action_time: Optional[datetime] = Field(default=None, description="Time of last action")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Player join timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    game_completed: bool = Field(default=False, description="Whether player finished the game")
    completion_time: Optional[datetime] = Field(default=None, description="Game completion timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "player_id": "user_001",
                "nickname": "John Doe",
                "room_code": "ABC123",
                "score": 150,
                "created_at": "2026-04-05T10:00:00Z"
            }
        }


class GameSessionDB(BaseModel):
    """MongoDB Game Session document model for analytics"""
    room_code: str = Field(..., description="Room code for this game session")
    difficulty: str = Field(..., description="Game difficulty level")
    total_players: int = Field(..., description="Total players in game")
    player_results: List[Dict[str, Any]] = Field(default_factory=list, description="Results for each player")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Game session start")
    completed_at: Optional[datetime] = Field(default=None, description="Game session completion")
    duration_seconds: Optional[int] = Field(default=None, description="Total game duration in seconds")
    average_score: Optional[float] = Field(default=None, description="Average score across players")
    highest_score: Optional[int] = Field(default=None, description="Highest score in session")
    lowest_score: Optional[int] = Field(default=None, description="Lowest score in session")
    winner: Optional[str] = Field(default=None, description="Player ID of winner")
    
    class Config:
        json_schema_extra = {
            "example": {
                "room_code": "ABC123",
                "difficulty": "medium",
                "total_players": 2,
                "player_results": [
                    {"player_id": "user_001", "nickname": "John", "final_score": 200},
                    {"player_id": "user_002", "nickname": "Jane", "final_score": 190}
                ],
                "created_at": "2026-04-05T10:00:00Z",
                "completed_at": "2026-04-05T10:15:00Z"
            }
        }


class LeaderboardEntryDB(BaseModel):
    """Leaderboard entry model"""
    rank: int
    player_id: str
    nickname: str
    total_score: int
    games_played: int = 0
    average_score: float = 0.0
    last_played: Optional[datetime] = None
    
    
class GlobalStatsDB(BaseModel):
    """Global statistics for analytics"""
    total_games_played: int = Field(default=0, description="Total games played across all rooms")
    total_players: int = Field(default=0, description="Unique players")
    average_game_duration: float = Field(default=0.0, description="Average game duration in seconds")
    most_played_difficulty: str = Field(default="medium", description="Most common difficulty")
    average_winning_score: float = Field(default=0.0, description="Average score of winners")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update")


class ResponseAnalysisDB(BaseModel):
    """Store player responses with AI analysis for scoring and learning"""
    response_id: str = Field(..., description="Unique response ID")
    room_code: str = Field(..., description="Room code")
    player_id: str = Field(..., description="Player ID who made the response")
    round_number: int = Field(..., description="Round number in game")
    scenario_type: str = Field(..., description="Type of scenario (call, sms, email, bank)")
    player_action: str = Field(..., description="Action taken by player (hang_up, ask_questions, share, etc)")
    correct_action: str = Field(..., description="Correct/recommended action")
    is_correct: bool = Field(..., description="Whether action matches correct answer")
    points_awarded: int = Field(..., description="Points given for this response")
    response_time: float = Field(..., description="Time taken to respond in seconds")
    speed_bonus: int = Field(default=0, description="Speed bonus points")
    grade: str = Field(..., description="Grade letter (A+, A, B, F)")
    difficulty: str = Field(..., description="Game difficulty level")
    scenario_context: Dict[str, Any] = Field(default_factory=dict, description="Scenario details (caller, script, red_flags)")
    player_options_shown: List[Dict[str, Any]] = Field(default_factory=list, description="Options presented to player")
    ai_analysis: Optional[Dict[str, Any]] = Field(default=None, description="AI analysis of the response for learning")
    feedback: Optional[str] = Field(default=None, description="Feedback for player improvement")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "response_id": "resp_001",
                "room_code": "ABC123",
                "player_id": "user_001",
                "round_number": 1,
                "scenario_type": "call",
                "player_action": "hang_up",
                "correct_action": "hang_up",
                "is_correct": True,
                "points_awarded": 10,
                "response_time": 5.2,
                "speed_bonus": 2,
                "grade": "A+",
                "difficulty": "medium",
                "scenario_context": {
                    "caller": "IRS Scammer",
                    "red_flags": ["Urgency", "Threats", "Payment demand"]
                },
                "created_at": "2026-04-05T10:05:00Z"
            }
        }


class PlayerResponseStatsDB(BaseModel):
    """Aggregated statistics for player responses"""
    player_id: str = Field(..., description="Player ID")
    total_responses: int = Field(default=0, description="Total responses recorded")
    correct_responses: int = Field(default=0, description="Number of correct responses")
    accuracy_rate: float = Field(default=0.0, description="Percentage of correct responses")
    total_points: int = Field(default=0, description="Total points from responses")
    average_response_time: float = Field(default=0.0, description="Average response time")
    most_common_grade: str = Field(default="B", description="Most frequently received grade")
    weak_areas: List[str] = Field(default_factory=list, description="Scenario types with low accuracy")
    strong_areas: List[str] = Field(default_factory=list, description="Scenario types with high accuracy")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update")
