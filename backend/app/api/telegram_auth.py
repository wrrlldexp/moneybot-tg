"""Telegram Mini App authentication API.

Flow:
1. Mini App sends initData from Telegram WebApp SDK
2. We validate HMAC-SHA256 signature
3. Find or create user by telegram_id
4. Return JWT tokens (same as existing auth system)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.audit import log_action
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token
from app.core.telegram import TelegramUser, validate_init_data
from app.db import get_db
from app.models import User, UserRole
from app.schemas.auth import TokenPair

router = APIRouter()


class TelegramLoginRequest(BaseModel):
    init_data: str


class TelegramLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: TelegramUserInfo


class TelegramUserInfo(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    telegram_id: int
    telegram_username: str | None = None


class LinkTelegramRequest(BaseModel):
    init_data: str


@router.post("/login", response_model=TelegramLoginResponse)
async def telegram_login(
    payload: TelegramLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TelegramLoginResponse:
    """Authenticate via Telegram Mini App initData."""
    settings = get_settings()
    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram bot not configured",
        )

    # Validate initData
    try:
        tg_user = validate_init_data(payload.init_data, bot_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    # Find user by telegram_id
    result = await db.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Telegram account not linked. Ask admin to link your account.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )

    # Update telegram username if changed
    tg_username = tg_user.username
    if tg_username and user.telegram_username != tg_username:
        user.telegram_username = tg_username

    await log_action(
        db, user.id, "auth.telegram_login",
        request=request,
        details={"telegram_id": tg_user.id},
    )

    return TelegramLoginResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id),
        user=TelegramUserInfo(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            telegram_id=tg_user.id,
            telegram_username=tg_username,
        ),
    )


@router.post("/link")
async def link_telegram(
    payload: LinkTelegramRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Link Telegram account to existing user (requires JWT auth)."""
    settings = get_settings()
    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        raise HTTPException(status_code=503, detail="Telegram bot not configured")

    try:
        tg_user = validate_init_data(payload.init_data, bot_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    # Check if telegram_id already linked to another user
    existing = await db.execute(
        select(User).where(User.telegram_id == tg_user.id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Telegram account already linked")

    current_user.telegram_id = tg_user.id
    current_user.telegram_username = tg_user.username

    await log_action(
        db, current_user.id, "auth.telegram_link",
        request=request,
        details={"telegram_id": tg_user.id},
    )

    return {"success": True, "telegram_id": tg_user.id}
