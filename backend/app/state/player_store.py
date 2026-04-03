from typing import Dict, Optional
from app.models.player import Player

# In-memory store: player_id -> Player
_players: Dict[str, Player] = {}

def get_player(player_id: str) -> Optional[Player]:
    return _players.get(player_id)

def save_player(player: Player) -> None:
    _players[player.player_id] = player

def delete_player(player_id: str) -> None:
    _players.pop(player_id, None)

def get_players_in_room(room_code: str) -> list[Player]:
    return [p for p in _players.values() if p.room_code == room_code]
