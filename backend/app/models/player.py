from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Player:
    player_id: str
    nickname: str
    room_code: str
    score: int = 0
    is_leader: bool = False
    # last submitted action for the current round
    last_action: Optional[str] = None
    # timestamp (epoch float) when the action was submitted
    action_time: Optional[float] = None
    
    # 🔥 PERFORMANCE TRACKING - For realistic leaderboard
    total_games: int = 0  # Total games played
    games_won: int = 0    # Times avoided scam (success)
    games_scammed: int = 0  # Times fell for scam
    win_rate: float = 0.0  # Percentage of games won (0-100)
    avg_score_per_game: float = 0.0  # Average score per game
