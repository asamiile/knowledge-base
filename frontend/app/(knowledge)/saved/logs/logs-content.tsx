"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  getSavedSearchRunLog,
  listSavedSearchRunLogs,
  type SavedSearchRunLogListItem,
  type SavedSearchRunLogRead,
} from "@/lib/api/saved-search-run-logs";
import { listSavedSearches, type SavedSearchRow } from "@/lib/api/saved-searches";

// ─── 取り込んだ内容 ───────────────────────────────────────────────────────────

function ImportedContent({ detail }: { detail: SavedSearchRunLogRead }) {
  const written = Array.isArray(detail.imported_payload?.written)
    ? (detail.imported_payload!.written as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : null;

  return (
    <section className="flex flex-col gap-2" aria-label="取り込んだ内容">
      <p className="text-muted-foreground text-xs font-medium">取り込んだ内容</p>
      {written && written.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {written.map((path) => (
            <li key={path}>
              <Link
                href={`/file?path=${encodeURIComponent(path)}`}
                className="font-mono text-xs text-primary underline-offset-2 hover:underline"
              >
                {path}
              </Link>
            </li>
          ))}
        </ul>
      ) : detail.imported_content?.trim() ? (
        <pre className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {detail.imported_content}
        </pre>
      ) : (
        <p className="text-muted-foreground">取り込んだ内容はありません。</p>
      )}
    </section>
  );
}

// ─── 個別ログ詳細 ────────────────────────────────────────────────────────────

function LogDetail({ logId }: { logId: string }) {
  const [detail, setDetail] = useState<SavedSearchRunLogRead | null>(null);
  const [siblings, setSiblings] = useState<SavedSearchRunLogListItem[]>([]);
  const [savedSearch, setSavedSearch] = useState<SavedSearchRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const [d, allLogs, allSearches] = await Promise.all([
          getSavedSearchRunLog(logId),
          listSavedSearchRunLogs(),
          listSavedSearches(),
        ]);
        if (cancelled) return;
        setDetail(d);
        if (d.saved_search_id) {
          setSiblings(
            allLogs
              .filter((l) => l.saved_search_id === d.saved_search_id)
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              ),
          );
          setSavedSearch(
            allSearches.find((s) => s.id === d.saved_search_id) ?? null,
          );
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [logId]);

  if (loading) {
    return <p className="text-muted-foreground">読み込み中…</p>;
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription className="font-mono text-xs break-all">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!detail) return null;

  const conditionName =
    savedSearch?.name || detail.title_snapshot || "Untitled";

  return (
    <div className="flex flex-col gap-4">
      {/* 保存条件名 */}
      <h1 className="font-heading text-base font-medium">{conditionName}</h1>

      {/* 2カラム: 左=実行履歴、右=実行結果 */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-6">
        {/* 左: 実行履歴 */}
        {siblings.length > 0 && (
          <section
            className="md:w-56 md:shrink-0 flex flex-col gap-2"
            aria-label="実行履歴"
          >
            <p className="text-muted-foreground text-xs font-medium">実行履歴</p>
            <ul className="flex flex-col divide-y divide-border md:overflow-y-auto md:max-h-[calc(100vh-12rem)] scrollbar-hide">
              {siblings.map((log) => {
                const isSelected = log.id === logId;
                return (
                  <li key={log.id}>
                    <Link
                      href={`/saved/logs?log=${encodeURIComponent(log.id)}`}
                      className={`flex flex-col gap-1 py-2.5 -mx-1 px-1 rounded transition-colors ${
                        isSelected
                          ? "bg-muted/60 font-medium"
                          : "hover:bg-muted/30"
                      }`}
                      aria-current={isSelected ? "page" : undefined}
                    >
                      <Badge
                        variant={
                          log.status === "success" ? "secondary" : "destructive"
                        }
                        className="self-start font-normal"
                      >
                        {log.status === "success" ? "成功" : "失敗"}
                      </Badge>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {new Date(log.created_at).toLocaleString("ja-JP")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 右: 実行結果 */}
        <section
          className="min-w-0 flex-1 flex flex-col gap-3"
          aria-label="選択中の実行結果"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs font-medium">実行結果</p>
            <Badge
              variant={detail.status === "success" ? "secondary" : "destructive"}
              className="font-normal"
            >
              {detail.status === "success" ? "成功" : "失敗"}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {new Date(detail.created_at).toLocaleString("ja-JP")}
            </span>
          </div>

          {detail.error_message && (
            <Alert variant="error">
              <AlertDescription className="whitespace-pre-wrap text-xs">
                {detail.error_message}
              </AlertDescription>
            </Alert>
          )}

          <ImportedContent detail={detail} />
        </section>
      </div>
    </div>
  );
}

// ─── 検索条件別ログ一覧 ───────────────────────────────────────────────────────

function LogsBySearch({ savedSearchId }: { savedSearchId: string }) {
  const [logs, setLogs] = useState<SavedSearchRunLogListItem[]>([]);
  const [savedSearch, setSavedSearch] = useState<SavedSearchRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listSavedSearchRunLogs(), listSavedSearches()])
      .then(([allLogs, allSearches]) => {
        if (!cancelled) {
          setLogs(
            allLogs
              .filter((l) => l.saved_search_id === savedSearchId)
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              ),
          );
          setSavedSearch(
            allSearches.find((s) => s.id === savedSearchId) ?? null,
          );
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [savedSearchId]);

  if (loading) {
    return <p className="text-muted-foreground">読み込み中…</p>;
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription className="font-mono text-xs break-all">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="text-muted-foreground">実行履歴がありません。</p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {logs.map((log) => (
        <li key={log.id}>
          <Link
            href={`/saved/logs?log=${encodeURIComponent(log.id)}`}
            className="flex items-center gap-3 py-3 hover:bg-muted/30 -mx-1 px-1 rounded transition-colors"
          >
            <Badge
              variant={log.status === "success" ? "secondary" : "destructive"}
              className="shrink-0 font-normal"
            >
              {log.status === "success" ? "成功" : "失敗"}
            </Badge>
            <span className="min-w-0 flex-1 truncate">
              {savedSearch?.name || log.title_snapshot || "Untitled"}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {new Date(log.created_at).toLocaleString("ja-JP")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function SavedSearchRunLogsContent() {
  const searchParams = useSearchParams();
  const selectedLogId = searchParams.get("log");
  const filterSearchId = searchParams.get("search");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        {selectedLogId ? (
          <LogDetail logId={selectedLogId} />
        ) : filterSearchId ? (
          <>
            <h1 className="font-heading text-base font-medium">実行履歴</h1>
            <LogsBySearch savedSearchId={filterSearchId} />
          </>
        ) : (
          <p className="text-muted-foreground">
            左のサイドメニュー「定期実行」から項目を選ぶと、ここに取り込み内容が表示されます。
          </p>
        )}
      </div>
    </div>
  );
}
