from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ScenarioResponse(BaseModel):
    round_number: int          # 1-based, matches frontend "LEVEL X OF 6"
    scenario_type: str         # ScenarioType value
    scenario: Dict[str, Any]   # full scenario payload the frontend renders

class RoundResultEntry(BaseModel):
    player_id: str
    nickname: str
    action: str
    points_awarded: int
    grade_letter: str
    grade_label: str
    grade_color: str

class RoundResultResponse(BaseModel):
    round_number: int
    correct_action: str
    red_flags: List[str]
    results: List[RoundResultEntry]

class LeaderboardEntry(BaseModel):
    rank: int
    player_id: str
    nickname: str
    total_score: int

class LeaderboardResponse(BaseModel):
    room_code: str
    entries: List[LeaderboardEntry]
