"""保護ルート用: Bearer JWT の検証（AUTH_ENABLED のときのみ）。"""

from __future__ import annotations

from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import auth_enabled, decode_token, jwt_secret
from app.db import get_db
from app.models.tables import User


def _auth_bearer_user_id(authorization: str | None, db: Session) -> UUID:
    """AUTH_ENABLED 時に Bearer を検証し、アクティブユーザーの UUID を返す。"""
    if not jwt_secret():
        raise HTTPException(
            status_code=500,
            detail="AUTH_ENABLED 利用時は AUTH_JWT_SECRET を設定してください。",
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="認証が必要です。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    raw = authorization.removeprefix("Bearer ").strip()
    try:
        payload = decode_token(raw)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="トークンの有効期限が切れています。",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=401,
            detail="トークンが無効です。",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=401,
            detail="トークンが無効です。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        uid = UUID(str(sub))
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="トークンが無効です。",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
    user = db.get(User, uid)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="認証が必要です。",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return uid


def require_auth(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> None:
    if not auth_enabled():
        return
    _auth_bearer_user_id(authorization, db)


def get_effective_user_id(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> UUID | None:
    """認証オフのとき None。認証オンのとき JWT のユーザー UUID（無効なら 401）。"""
    if not auth_enabled():
        return None
    return _auth_bearer_user_id(authorization, db)
