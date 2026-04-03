from typing import Dict, Optional
from app.models.game_state import GameState

# In-memory store: room_code -> GameState
_games: Dict[str, GameState] = {}

def get_game(room_code: str) -> Optional[GameState]:
    return _games.get(room_code)

def save_game(game: GameState) -> None:
    _games[game.room_code] = game

def delete_game(room_code: str) -> None:
    _games.pop(room_code, None)
