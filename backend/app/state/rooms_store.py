from typing import Dict, Optional
from app.models.room import Room

# In-memory store: room_code -> Room
_rooms: Dict[str, Room] = {}

def get_room(room_code: str) -> Optional[Room]:
    return _rooms.get(room_code)

def save_room(room: Room) -> None:
    _rooms[room.room_code] = room

def delete_room(room_code: str) -> None:
    _rooms.pop(room_code, None)

def all_rooms() -> Dict[str, Room]:
    return _rooms
