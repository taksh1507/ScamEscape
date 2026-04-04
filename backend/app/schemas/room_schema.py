from pydantic import BaseModel, Field
from typing import List, Optional

class CreateRoomRequest(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=20)

class JoinRoomRequest(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=20)
    room_code: str = Field(..., min_length=6, max_length=6)

class PlayerInfo(BaseModel):
    player_id: str
    nickname: str
    score: int
    is_leader: bool

class RoomResponse(BaseModel):
    room_code: str
    status: str
    player_count: int
    players: List[PlayerInfo]
    current_round: int
