"""
Auth building blocks: password hashing, JWT issuance/verification, and
FastAPI dependencies for protecting REST routes and WebSocket connections.

Design note — REQUIRE_AUTH feature flag:
This app's existing flow is fully anonymous (nickname + generated player_id,
no accounts). Rather than hard-breaking that flow, `get_current_user_optional`
returns None when no/invalid token is supplied UNLESS `settings.REQUIRE_AUTH`
is True, in which case it behaves like the strict dependency and raises 401.
This lets routes/WS opt into "auth required" as a single config flip once the
frontend grows a real login flow, while keeping today's demo working.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.mongodb import get_database
from app.models.user import User
from app.utils.logger import get_logger

log = get_logger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# tokenUrl is informational only (used by e.g. Swagger UI's "Authorize" button)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ─── Passwords ─────────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ─── JWTs ──────────────────────────────────────────────────────────────────

def create_access_token(subject: str, extra_claims: Optional[dict] = None) -> str:
    """subject is typically the user_id."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        log.debug(f"JWT decode failed: {e}")
        return None


# ─── User lookup ───────────────────────────────────────────────────────────

def _get_user_by_id(user_id: str) -> Optional[User]:
    db = get_database()
    if db is None:
        return None
    doc = db.users.find_one({"user_id": user_id})
    return User.from_mongo_doc(doc)


def _get_user_by_email(email: str) -> Optional[User]:
    db = get_database()
    if db is None:
        return None
    doc = db.users.find_one({"email": email.lower().strip()})
    return User.from_mongo_doc(doc)


def _user_from_token(token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    return _get_user_by_id(payload["sub"])


# ─── REST dependencies ─────────────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Strict: always requires a valid token. Use on routes that must always
    be authenticated regardless of the REQUIRE_AUTH flag (e.g. GET /auth/me).
    """
    user = _user_from_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user


def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[User]:
    """Soft-gated: returns the User if a valid token is present. If no/invalid
    token is present, returns None UNLESS settings.REQUIRE_AUTH is True, in
    which case it raises 401 just like get_current_user.
    """
    user = _user_from_token(token)
    if user and not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    if not user and settings.REQUIRE_AUTH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ─── WebSocket auth ─────────────────────────────────────────────────────────

async def get_ws_user_optional(ws: WebSocket) -> Optional[User]:
    """Authenticate a WebSocket connection via a `?token=` query param, since
    browsers can't set custom headers on the WebSocket handshake. Must be
    called BEFORE ws.accept() so an invalid/required-but-missing token can be
    rejected with a proper close code instead of a silent accept.

    Returns None (anonymous) when no token is given and REQUIRE_AUTH is off.
    Closes the socket and returns None when REQUIRE_AUTH is on and auth fails
    — callers should treat a None return under REQUIRE_AUTH as "already
    closed, stop processing".
    """
    token = ws.query_params.get("token")
    user = _user_from_token(token)

    if user and not user.is_active:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="Inactive user")
        return None

    if not user and settings.REQUIRE_AUTH:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        return None

    return user
