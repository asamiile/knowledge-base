"""メール + パスワードログイン（公開サインアップなし）。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import auth_enabled, create_access_token, verify_password
from app.db import get_db
from app.models.tables import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    if not auth_enabled():
        raise HTTPException(
            status_code=503,
            detail="ログインは無効です。AUTH_ENABLED を有効にしてください。",
        )
    email = req.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="メールアドレスまたはパスワードが正しくありません。",
        )
    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="メールアドレスまたはパスワードが正しくありません。",
        )
    token = create_access_token(user_id=user.id, email=user.email)
    return LoginResponse(access_token=token)
