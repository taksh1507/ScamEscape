from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class User:
    """A registered account, stored in the `users` MongoDB collection.

    Kept separate from `Player` (the anonymous in-game identity used for
    rooms/leaderboards) so the existing anonymous play flow is untouched —
    a logged-in User can optionally be linked to Player records later via
    `user_id` if/when the frontend adopts real accounts.
    """
    user_id: str
    email: str
    hashed_password: str
    nickname: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

    def to_public_dict(self) -> dict:
        """Fields safe to return to clients (never the hash)."""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "nickname": self.nickname,
            "created_at": self.created_at.isoformat(),
            "is_active": self.is_active,
        }

    def to_mongo_doc(self) -> dict:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "hashed_password": self.hashed_password,
            "nickname": self.nickname,
            "created_at": self.created_at,
            "is_active": self.is_active,
        }

    @staticmethod
    def from_mongo_doc(doc: dict) -> Optional["User"]:
        if not doc:
            return None
        return User(
            user_id=doc["user_id"],
            email=doc["email"],
            hashed_password=doc["hashed_password"],
            nickname=doc.get("nickname", doc["email"].split("@")[0]),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            is_active=doc.get("is_active", True),
        )
