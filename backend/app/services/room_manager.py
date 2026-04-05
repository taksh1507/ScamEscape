from app.models.room import Room, RoomStatus
from app.models.player import Player
from app.state.rooms_store import get_room, save_room, delete_room
from app.state.player_store import get_player, save_player, delete_player, get_players_in_room
from app.utils.id_generator import generate_room_code, generate_uuid
from app.constants.game_constants import MAX_PLAYERS_PER_ROOM
from app.services.mongodb_service import MongoDBService
from app.utils.logger import get_logger
from typing import Optional, Tuple

log = get_logger(__name__)


def create_room(nickname: str) -> Tuple[Room, Player]:
    """Creates a new room and registers the creator as leader."""
    room_code = generate_room_code()
    player_id = generate_uuid()

    player = Player(
        player_id=player_id,
        nickname=nickname,
        room_code=room_code,
        is_leader=True,
    )
    room = Room(
        room_code=room_code,
        leader_id=player_id,
        player_ids=[player_id],
    )
    save_player(player)
    save_room(room)
    
    return room, player


def join_room(nickname: str, room_code: str) -> Tuple[Optional[Room], Optional[Player], str]:
    """
    Joins an existing room.
    Returns (room, player, error_message).
    error_message is empty string on success.
    """
    room = get_room(room_code)
    if not room:
        return None, None, "Room not found"
    if room.status != RoomStatus.WAITING:
        return None, None, "Room is not accepting players"
    if len(room.player_ids) >= MAX_PLAYERS_PER_ROOM:
        return None, None, "Room is full"

    player_id = generate_uuid()
    player = Player(
        player_id=player_id,
        nickname=nickname,
        room_code=room_code,
        is_leader=False,
    )
    room.player_ids.append(player_id)
    save_player(player)
    save_room(room)
    
    return room, player, ""


def leave_room(player_id: str) -> Optional[str]:
    """
    Removes a player from their room.
    Returns room_code if room still exists, None if room was dissolved.
    """
    player = get_player(player_id)
    if not player:
        return None

    room = get_room(player.room_code)
    if room:
        room.player_ids = [pid for pid in room.player_ids if pid != player_id]
        if not room.player_ids:
            delete_room(room.room_code)
            delete_player(player_id)
            return None
        # Transfer leadership if leader left
        if room.leader_id == player_id:
            new_leader_id = room.player_ids[0]
            room.leader_id = new_leader_id
            new_leader = get_player(new_leader_id)
            if new_leader:
                new_leader.is_leader = True
                save_player(new_leader)
        
        save_room(room)
        
        # 🔥 Sync to MongoDB
        try:
            import asyncio
            asyncio.create_task(
                MongoDBService.save_room({
                    "room_code": room.room_code,
                    "leader_id": room.leader_id,
                    "status": room.status.value,
                    "player_ids": room.player_ids,
                    "current_round": room.current_round,
                })
            )
        except Exception as e:
            log.warning(f"⚠️ Failed to sync room to MongoDB: {e}")

    delete_player(player_id)
    return player.room_code
