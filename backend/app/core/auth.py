"""環境変数ベースの認証設定・パスワードハッシュ・JWT。"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def auth_enabled() -> bool:
    return os.environ.get("AUTH_ENABLED", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def jwt_secret() -> str:
    return os.environ.get("AUTH_JWT_SECRET", "").strip()


def access_token_expire_minutes() -> int:
    raw = os.environ.get("AUTH_ACCESS_TOKEN_MINUTES", "10080")
    try:
        return max(5, int(raw))
    except ValueError:
        return 10080


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def create_access_token(*, user_id: uuid.UUID, email: str) -> str:
    secret = jwt_secret()
    if not secret:
        raise RuntimeError("AUTH_JWT_SECRET is required when issuing tokens")
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=access_token_expire_minutes())
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": exp,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def decode_token(token: str) -> dict:
    secret = jwt_secret()
    if not secret:
        raise ValueError("AUTH_JWT_SECRET is not set")
    return jwt.decode(token, secret, algorithms=["HS256"])
