"""AUTH_ENABLED 時のログイン・保護ルート。"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import delete

from app.core.auth import hash_password
from app.db.session import SessionLocal
from app.models.tables import User


@pytest.fixture
def auth_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AUTH_ENABLED", "true")
    monkeypatch.setenv(
        "AUTH_JWT_SECRET",
        "test-secret-key-for-jwt-must-be-long-enough-32",
    )
    monkeypatch.setenv("AUTH_ACCESS_TOKEN_MINUTES", "60")


def _make_user(email: str, password: str) -> uuid.UUID:
    db = SessionLocal()
    try:
        db.execute(delete(User).where(User.email == email))
        db.commit()
        u = User(
            email=email,
            hashed_password=hash_password(password),
            is_active=True,
        )
        db.add(u)
        db.commit()
        return u.id
    finally:
        db.close()


def test_login_success(client, auth_env) -> None:
    _make_user("ops@example.com", "correct horse")

    r = client.post(
        "/api/auth/login",
        json={"email": "ops@example.com", "password": "correct horse"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("token_type") == "bearer"
    assert isinstance(body.get("access_token"), str) and len(body["access_token"]) > 10


def test_login_wrong_password(client, auth_env) -> None:
    _make_user("u2@example.com", "secret")
    r = client.post(
        "/api/auth/login",
        json={"email": "u2@example.com", "password": "wrong"},
    )
    assert r.status_code == 401


def test_login_disabled_returns_503(client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AUTH_ENABLED", raising=False)
    r = client.post(
        "/api/auth/login",
        json={"email": "a@b.co", "password": "x"},
    )
    assert r.status_code == 503


def test_knowledge_requires_bearer_when_auth_enabled(client, auth_env) -> None:
    r = client.get("/api/knowledge/stats")
    assert r.status_code == 401

    _make_user("tok@example.com", "pw")
    tok = client.post(
        "/api/auth/login",
        json={"email": "tok@example.com", "password": "pw"},
    ).json()["access_token"]
    r2 = client.get(
        "/api/knowledge/stats",
        headers={"Authorization": f"Bearer {tok}"},
    )
    assert r2.status_code == 200, r2.text
