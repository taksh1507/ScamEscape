from fastapi import APIRouter, HTTPException, status, Depends

from app.core.mongodb import get_database
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    _get_user_by_email,
)
from app.core.config import settings
from app.models.user import User
from app.schemas.auth_schema import (
    SignupRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
)
from app.utils.id_generator import generate_uuid
from app.utils.logger import get_logger

log = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Accounts require MongoDB, which is currently unavailable",
        )

    email = body.email.lower().strip()
    if _get_user_by_email(email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        user_id=generate_uuid(),
        email=email,
        hashed_password=hash_password(body.password),
        nickname=body.nickname.strip(),
    )

    try:
        db.users.insert_one(user.to_mongo_doc())
    except Exception as e:
        # Most likely a unique-index race on email; treat as a conflict.
        log.warning(f"Signup insert failed for {email}: {e}")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    token = create_access_token(subject=user.user_id)
    log.info(f"✅ New account created: {email}")
    return TokenResponse(access_token=token, expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = _get_user_by_email(body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")

    token = create_access_token(subject=user.user_id)
    return TokenResponse(access_token=token, expires_in_minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.to_public_dict())
