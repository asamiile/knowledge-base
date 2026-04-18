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

// ─── 個別ログ詳細 ────────────────────────────────────────────────────────────

function LogDetail({ logId }: { logId: string }) {
  const [detail, setDetail] = useState<SavedSearchRunLogRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      setLoading(true);
      try {
        const d = await getSavedSearchRunLog(logId);
        if (!cancelled) setDetail(d);
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
    return <p className="text-muted-foreground text-sm">読み込み中…</p>;
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

  const written = Array.isArray(detail.imported_payload?.written)
    ? (detail.imported_payload!.written as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-heading text-base font-medium">
          {detail.title_snapshot || "Untitled"}
        </h1>
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
          <p className="text-muted-foreground text-sm">取り込んだ内容はありません。</p>
        )}
      </section>
    </div>
  );
}

// ─── 検索条件別ログ一覧 ───────────────────────────────────────────────────────

function LogsBySearch({ savedSearchId }: { savedSearchId: string }) {
  const [logs, setLogs] = useState<SavedSearchRunLogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSavedSearchRunLogs()
      .then((all) => {
        if (!cancelled) {
          setLogs(all.filter((l) => l.saved_search_id === savedSearchId));
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
    return <p className="text-muted-foreground text-sm">読み込み中…</p>;
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
      <p className="text-muted-foreground text-sm">実行履歴がありません。</p>
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
            <span className="min-w-0 flex-1 truncate text-sm">
              {log.title_snapshot || "Untitled"}
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
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        {selectedLogId ? (
          <LogDetail logId={selectedLogId} />
        ) : filterSearchId ? (
          <>
            <h1 className="font-heading text-base font-medium">実行履歴</h1>
            <LogsBySearch savedSearchId={filterSearchId} />
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            左のサイドメニュー「定期実行」から項目を選ぶと、ここに取り込み内容が表示されます。
          </p>
        )}
      </div>
    </div>
  );
}
