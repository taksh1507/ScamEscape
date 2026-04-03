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
