"""ユーザー追加スクリプト（管理者用）。

使い方:
    # Docker コンテナ内
    docker compose exec backend python -m app.db.add_user EMAIL PASSWORD

    # ローカル（backend/ ディレクトリで）
    python -m app.db.add_user EMAIL PASSWORD
"""

import sys

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import hash_password
from app.db import engine
from app.models.tables import User


def add_user(email: str, password: str) -> None:
    if len(password) < 8:
        print("ERROR: パスワードは8文字以上にしてください。")
        sys.exit(1)

    with Session(engine) as db:
        existing = db.scalar(select(User).where(User.email == email.lower().strip()))
        if existing:
            print(f"ERROR: {email} は既に登録されています。")
            sys.exit(1)

        user = User(
            email=email.lower().strip(),
            hashed_password=hash_password(password),
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"OK: ユーザー {email} を追加しました。")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("使い方: python -m app.db.add_user EMAIL PASSWORD")
        sys.exit(1)
    add_user(sys.argv[1], sys.argv[2])
