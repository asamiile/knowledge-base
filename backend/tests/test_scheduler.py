"""スケジューラのユニットテスト。

DB は使わず unittest.mock でモックする。
- is_due: 実行タイミング判定ロジック
- execute_one: knowledge / arxiv ジョブの実行と RunLog 記録
- _tick: 期限切れ SavedSearch を execute_one に渡すか
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, call, patch

import pytest

from app.services.scheduler import _tick, execute_one, is_due


# ---------------------------------------------------------------------------
# ヘルパー: SavedSearch の簡易スタブ
# ---------------------------------------------------------------------------

def _make_row(
    *,
    search_target: str = "knowledge",
    query: str = "テスト質問",
    top_k: int = 5,
    interval_minutes: int = 30,
    schedule_enabled: bool = True,
    last_run_at: datetime | None = None,
    arxiv_ids: list[str] | None = None,
    name: str = "テスト検索",
) -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid.uuid4(),
        name=name,
        query=query,
        search_target=search_target,
        top_k=top_k,
        interval_minutes=interval_minutes,
        schedule_enabled=schedule_enabled,
        last_run_at=last_run_at,
        arxiv_ids=arxiv_ids or [],
    )


NOW = datetime(2026, 4, 16, 12, 0, 0, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# is_due
# ---------------------------------------------------------------------------

class TestIsDue:
    def test_last_run_at_none_is_due(self):
        row = _make_row(last_run_at=None)
        assert is_due(row, NOW) is True

    def test_interval_not_elapsed_not_due(self):
        row = _make_row(
            interval_minutes=60,
            last_run_at=NOW - timedelta(minutes=30),
        )
        assert is_due(row, NOW) is False

    def test_interval_exactly_elapsed_is_due(self):
        row = _make_row(
            interval_minutes=30,
            last_run_at=NOW - timedelta(minutes=30),
        )
        assert is_due(row, NOW) is True

    def test_interval_exceeded_is_due(self):
        row = _make_row(
            interval_minutes=10,
            last_run_at=NOW - timedelta(minutes=20),
        )
        assert is_due(row, NOW) is True

    def test_schedule_disabled_not_due(self):
        row = _make_row(schedule_enabled=False, last_run_at=None)
        assert is_due(row, NOW) is False

    def test_interval_zero_not_due(self):
        row = _make_row(interval_minutes=0, last_run_at=None)
        assert is_due(row, NOW) is False

    def test_naive_last_run_at_treated_as_utc(self):
        """tzinfo なしの datetime も UTC として扱われること。"""
        naive = NOW.replace(tzinfo=None) - timedelta(minutes=60)
        row = _make_row(interval_minutes=30, last_run_at=naive)
        assert is_due(row, NOW) is True


# ---------------------------------------------------------------------------
# execute_one — knowledge
# ---------------------------------------------------------------------------

class TestExecuteOneKnowledge:
    def test_success_writes_run_log(self):
        row = _make_row(search_target="knowledge")
        mock_db = MagicMock()
        mock_db.get.return_value = row

        mock_result = SimpleNamespace(
            answer="テスト回答",
            model_dump=lambda mode: {"answer": "テスト回答"},
        )

        with (
            patch("app.services.scheduler.SessionLocal", return_value=mock_db),
            patch(
                "app.services.scheduler._run_knowledge_job",
                return_value=("テスト回答", {"answer": "テスト回答"}),
            ) as mock_job,
        ):
            execute_one(row.id)

        mock_job.assert_called_once_with(mock_db, row)
        # SavedSearchRunLog が add されたか
        added = mock_db.add.call_args[0][0]
        assert added.status == "success"
        assert added.imported_content == "テスト回答"
        assert added.title_snapshot == row.name
        assert mock_db.commit.call_count >= 2  # last_run_at 更新 + log 保存

    def test_failure_writes_failure_log(self):
        row = _make_row(search_target="knowledge")
        mock_db = MagicMock()
        mock_db.get.return_value = row

        with (
            patch("app.services.scheduler.SessionLocal", return_value=mock_db),
            patch(
                "app.services.scheduler._run_knowledge_job",
                side_effect=RuntimeError("GOOGLE_API_KEY is not configured"),
            ),
        ):
            execute_one(row.id)

        added = mock_db.add.call_args[0][0]
        assert added.status == "failure"
        assert "GOOGLE_API_KEY" in (added.error_message or "")

    def test_row_not_found_does_nothing(self):
        mock_db = MagicMock()
        mock_db.get.return_value = None

        with patch("app.services.scheduler.SessionLocal", return_value=mock_db):
            execute_one(uuid.uuid4())

        mock_db.add.assert_not_called()

    def test_schedule_disabled_does_nothing(self):
        row = _make_row(schedule_enabled=False)
        mock_db = MagicMock()
        mock_db.get.return_value = row

        with patch("app.services.scheduler.SessionLocal", return_value=mock_db):
            execute_one(row.id)

        mock_db.add.assert_not_called()


# ---------------------------------------------------------------------------
# execute_one — arxiv
# ---------------------------------------------------------------------------

class TestExecuteOneArxiv:
    def test_arxiv_success_writes_run_log(self):
        row = _make_row(
            search_target="arxiv",
            arxiv_ids=["2301.00001"],
            query="",
        )
        mock_db = MagicMock()
        mock_db.get.return_value = row

        with (
            patch("app.services.scheduler.SessionLocal", return_value=mock_db),
            patch(
                "app.services.scheduler._run_arxiv_job",
                return_value=(
                    "imports/arxiv/2301.00001.md",
                    {"written": ["imports/arxiv/2301.00001.md"]},
                ),
            ) as mock_job,
        ):
            execute_one(row.id)

        mock_job.assert_called_once_with(row)
        added = mock_db.add.call_args[0][0]
        assert added.status == "success"
        assert "2301.00001" in (added.imported_content or "")


# ---------------------------------------------------------------------------
# _tick
# ---------------------------------------------------------------------------

class TestTick:
    def test_tick_calls_execute_one_for_due_rows(self):
        due_row = _make_row(last_run_at=None)
        not_due_row = _make_row(last_run_at=NOW)  # 30 分のインターバルで NOW に実行済み

        mock_db = MagicMock()
        mock_db.__enter__ = MagicMock(return_value=mock_db)
        mock_db.__exit__ = MagicMock(return_value=False)
        mock_db.scalars.return_value.all.return_value = [due_row, not_due_row]

        with (
            patch("app.services.scheduler.SessionLocal", return_value=mock_db),
            patch("app.services.scheduler.datetime") as mock_dt,
            patch("app.services.scheduler.execute_one") as mock_exec,
        ):
            mock_dt.now.return_value = NOW
            _tick()

        # due_row のみ実行されること
        mock_exec.assert_called_once_with(due_row.id)

    def test_tick_calls_execute_one_for_multiple_due_rows(self):
        old = NOW - timedelta(hours=2)
        rows = [_make_row(last_run_at=old) for _ in range(3)]

        mock_db = MagicMock()
        mock_db.scalars.return_value.all.return_value = rows

        with (
            patch("app.services.scheduler.SessionLocal", return_value=mock_db),
            patch("app.services.scheduler.datetime") as mock_dt,
            patch("app.services.scheduler.execute_one") as mock_exec,
        ):
            mock_dt.now.return_value = NOW
            _tick()

        assert mock_exec.call_count == 3

    def test_tick_no_enabled_rows_does_nothing(self):
        mock_db = MagicMock()
        mock_db.scalars.return_value.all.return_value = []

        with (
            patch("app.services.scheduler.SessionLocal", return_value=mock_db),
            patch("app.services.scheduler.execute_one") as mock_exec,
        ):
            _tick()

        mock_exec.assert_not_called()