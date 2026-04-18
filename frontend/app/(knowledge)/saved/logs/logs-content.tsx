"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "../../components/status-badge";
import { useAsyncData } from "../../hooks/use-async-data";
import {
  getSavedSearchRunLog,
  listSavedSearchRunLogs,
  type SavedSearchRunLogRead,
} from "@/lib/api/saved-search-run-logs";
import { listSavedSearches } from "@/lib/api/saved-searches";

type MatchHint = {
  path: string;
  arxiv_id: string;
  matched_in: string[];
  snippet: string;
};

function matchHintsByPath(
  payload: Record<string, unknown> | null | undefined,
): Map<string, MatchHint> {
  const m = new Map<string, MatchHint>();
  const raw = payload?.match_hints;
  if (!Array.isArray(raw)) return m;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const path = typeof o.path === "string" ? o.path : "";
    if (!path) continue;
    const matched_in = Array.isArray(o.matched_in)
      ? o.matched_in.filter((x): x is string => typeof x === "string")
      : [];
    m.set(path, {
      path,
      arxiv_id: typeof o.arxiv_id === "string" ? o.arxiv_id : "",
      matched_in,
      snippet: typeof o.snippet === "string" ? o.snippet : "",
    });
  }
  return m;
}

function matchedInLabel(fields: string[]): string | null {
  if (fields.length === 0) return null;
  return fields
    .map((f) => (f === "title" ? "タイトル" : f === "abstract" ? "要約" : f))
    .join("・");
}

// ─── 取り込んだ内容 ───────────────────────────────────────────────────────────

function ImportedContent({ detail }: { detail: SavedSearchRunLogRead }) {
  const written = Array.isArray(detail.imported_payload?.written)
    ? (detail.imported_payload!.written as unknown[]).filter(
        (f): f is string => typeof f === "string",
      )
    : null;

  const hintsMap = matchHintsByPath(detail.imported_payload ?? null);

  return (
    <section className="flex flex-col gap-3" aria-label="取り込んだ内容">
      <p className="text-muted-foreground text-sm font-medium">取り込んだ内容</p>
      {written && written.length > 0 ? (
        <ul className="flex flex-col gap-5">
          {written.map((path) => {
            const hint = hintsMap.get(path);
            const label = hint ? matchedInLabel(hint.matched_in) : null;
            return (
              <li key={path} className="flex flex-col gap-2">
                <Link
                  href={`/file?path=${encodeURIComponent(path)}`}
                  className="font-mono text-base leading-snug text-primary break-all underline-offset-2 hover:underline"
                >
                  {path}
                </Link>
                {hint?.snippet ? (
                  <p className="text-foreground/90 text-base leading-relaxed">
                    {label ? (
                      <span className="text-muted-foreground">{label} · </span>
                    ) : null}
                    {hint.snippet}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : detail.imported_content?.trim() ? (
        <pre className="text-foreground/90 text-base leading-relaxed whitespace-pre-wrap">
          {detail.imported_content}
        </pre>
      ) : (
        <p className="text-muted-foreground text-sm">取り込んだ内容はありません。</p>
      )}
    </section>
  );
}

// ─── 個別ログ詳細 ────────────────────────────────────────────────────────────

function LogDetail({ logId }: { logId: string }) {
  const { loading, data, error } = useAsyncData(
    () =>
      Promise.all([
        getSavedSearchRunLog(logId),
        listSavedSearchRunLogs(),
        listSavedSearches(),
      ]),
    logId,
  );

  const detail = data?.[0] ?? null;
  const siblings = useMemo(() => {
    if (!data) return [];
    const [d, allLogs] = data;
    if (!d.saved_search_id) return [];
    return allLogs
      .filter((l) => l.saved_search_id === d.saved_search_id)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [data]);
  const savedSearch = useMemo(() => {
    if (!data) return null;
    const [d, , allSearches] = data;
    return d.saved_search_id
      ? (allSearches.find((s) => s.id === d.saved_search_id) ?? null)
      : null;
  }, [data]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">読み込み中…</p>;
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription className="font-mono text-sm break-all">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!detail) return null;

  const conditionName =
    savedSearch?.name || detail.title_snapshot || "Untitled";

  return (
    <div className="flex flex-col gap-5">
      {/* 保存条件名 */}
      <h1 className="font-heading text-lg font-medium tracking-tight">
        {conditionName}
      </h1>

      {/* 2カラム: 左=実行履歴、右=実行結果 */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        {/* 左: 実行履歴 */}
        {siblings.length > 0 && (
          <section
            className="md:w-64 md:shrink-0 flex flex-col gap-2.5"
            aria-label="実行履歴"
          >
            <p className="text-muted-foreground text-sm font-medium">実行履歴</p>
            <ul className="flex flex-col divide-y divide-border md:overflow-y-auto md:max-h-[calc(100vh-12rem)] scrollbar-hide">
              {siblings.map((log) => {
                const isSelected = log.id === logId;
                return (
                  <li key={log.id}>
                    <Link
                      href={`/saved/logs?log=${encodeURIComponent(log.id)}`}
                      className={`flex flex-col gap-1.5 py-3 -mx-1 px-1 rounded transition-colors ${
                        isSelected
                          ? "bg-muted/60 font-medium"
                          : "hover:bg-muted/30"
                      }`}
                      aria-current={isSelected ? "page" : undefined}
                    >
                      <StatusBadge
                        status={log.status}
                        className="self-start text-sm"
                      />
                      <span className="text-muted-foreground text-sm tabular-nums">
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
          className="min-w-0 flex-1 flex flex-col gap-4"
          aria-label="選択中の実行結果"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-muted-foreground text-sm font-medium">実行結果</p>
            <StatusBadge status={detail.status} className="text-sm" />
            <span className="text-muted-foreground text-sm tabular-nums">
              {new Date(detail.created_at).toLocaleString("ja-JP")}
            </span>
          </div>

          {detail.error_message && (
            <Alert variant="error">
              <AlertDescription className="whitespace-pre-wrap text-sm">
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

// ─── ?search= 保存検索 ID → 最新の ?log= へ集約（一覧中継は廃止）────────────────

function LogsSearchRedirect({ savedSearchId }: { savedSearchId: string }) {
  const router = useRouter();
  const { loading, data, error } = useAsyncData(
    () => listSavedSearchRunLogs(),
    savedSearchId,
  );

  const logs = useMemo(() => {
    if (!data) return [];
    return data
      .filter((l) => l.saved_search_id === savedSearchId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [data, savedSearchId]);

  useEffect(() => {
    if (loading || error || logs.length === 0) return;
    router.replace(`/saved/logs?log=${encodeURIComponent(logs[0].id)}`);
  }, [loading, error, logs, router]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">読み込み中…</p>;
  }

  if (error) {
    return (
      <Alert variant="error">
        <AlertDescription className="font-mono text-sm break-all">
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
    <p className="text-muted-foreground text-sm">最新の実行結果を表示します…</p>
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
          <LogsSearchRedirect savedSearchId={filterSearchId} />
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            左のサイドメニュー「定期実行」から項目を選ぶと、ここに取り込み内容が表示されます。
          </p>
        )}
      </div>
    </div>
  );
}
