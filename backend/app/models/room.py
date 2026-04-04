from dataclasses import dataclass, field
from typing import List
from enum import Enum

class RoomStatus(str, Enum):
    WAITING  = "waiting"
    PLAYING  = "playing"
    FINISHED = "finished"

@dataclass
class Room:
    room_code: str
    leader_id: str
    status: RoomStatus = RoomStatus.WAITING
    player_ids: List[str] = field(default_factory=list)
    current_round: int = 0   # 0 = not started, 1-6 = active round
