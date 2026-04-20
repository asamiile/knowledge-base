"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "../../components/status-badge";
import { useAsyncData } from "../../hooks/use-async-data";
import {
  getSavedSearchRunLog,
  listSavedSearchRunLogs,
  patchRunLogHintTranslation,
  type SavedSearchRunLogRead,
} from "@/lib/api/saved-search-run-logs";
import { listSavedSearches } from "@/lib/api/saved-searches";
import { translateText } from "@/lib/api/translate";

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

// ─── キーワードハイライト ─────────────────────────────────────────────────────

/**
 * query のフレーズ → 単語トークン の順で最初にマッチした語をハイライトする。
 * split(/(capture)/gi) は奇数インデックスがキャプチャ群になる。
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const candidates = [
    query.trim(),
    ...query.trim().split(/\s+/).filter((t) => t.length >= 2),
  ];

  for (const term of candidates) {
    let parts: string[];
    try {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      parts = text.split(new RegExp(`(${escaped})`, "gi"));
    } catch {
      continue;
    }
    if (parts.length <= 1) continue;

    return (
      <>
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <mark
              key={i}
              className="rounded-sm bg-yellow-200/80 px-0.5 font-semibold dark:bg-yellow-600/50"
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  }

  return <>{text}</>;
}

// ─── 資料カード ───────────────────────────────────────────────────────────────

function FileReviewCard({
  path,
  hint,
  searchQuery,
  logId,
  cachedTranslation,
}: {
  path: string;
  hint?: MatchHint;
  searchQuery: string;
  logId: string;
  cachedTranslation?: string;
}) {
  const [translatedSnippet, setTranslatedSnippet] = useState<string | null>(
    cachedTranslation ?? null,
  );
  const [translating, setTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const snippet = hint?.snippet ?? "";
  const arxivId = hint?.arxiv_id;
  const matchLabel = hint ? matchedInLabel(hint.matched_in) : null;

  async function handleTranslate() {
    if (translatedSnippet) {
      setShowTranslation((v) => !v);
      return;
    }
    if (!snippet) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const res = await translateText(snippet);
      setTranslatedSnippet(res.translated_text);
      setShowTranslation(true);
      // DBに保存（失敗してもUIには影響させない）
      patchRunLogHintTranslation(logId, path, res.translated_text).catch(
        () => undefined,
      );
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : "翻訳に失敗しました");
    } finally {
      setTranslating(false);
    }
  }

  return (
    <article className="flex flex-col gap-2">
      {/* パス + マッチしたフィールド */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/file?path=${encodeURIComponent(path)}`}
          className="break-all font-mono text-xs text-primary underline-offset-2 hover:underline"
        >
          {path}
        </Link>
        {matchLabel && (
          <Badge variant="secondary" className="shrink-0 text-xs">
            {matchLabel}でマッチ
          </Badge>
        )}
      </div>

      {/* スニペット */}
      {snippet ? (
        <div className="space-y-2">
          {/* 英語原文（ハイライト付き） */}
          <p className="text-sm leading-relaxed text-foreground/90">
            <HighlightedText text={snippet} query={searchQuery} />
          </p>

          {/* 日本語訳（表示時） */}
          {showTranslation && translatedSnippet && (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm leading-relaxed text-foreground/80">
              {translatedSnippet}
            </p>
          )}

          {/* 翻訳トグル */}
          <button
            type="button"
            onClick={() => void handleTranslate()}
            disabled={translating}
            className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
          >
            {translating
              ? "翻訳中…"
              : translatedSnippet && showTranslation
                ? "原文のみ表示"
                : "日本語訳を表示"}
          </button>
          {translateError && (
            <p className="text-xs text-destructive">{translateError}</p>
          )}
        </div>
      ) : null}

      {/* arXiv リンク */}
      {arxivId && (
        <a
          href={`https://arxiv.org/abs/${arxivId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          arXivで開く ↗
        </a>
      )}
    </article>
  );
}

// ─── 取り込んだ内容 ───────────────────────────────────────────────────────────

function ImportedContent({
  detail,
  searchQuery,
}: {
  detail: SavedSearchRunLogRead;
  searchQuery: string;
}) {
  const written = useMemo(
    () =>
      Array.isArray(detail.imported_payload?.written)
        ? (detail.imported_payload!.written as unknown[]).filter(
            (f): f is string => typeof f === "string",
          )
        : null,
    [detail.imported_payload],
  );

  const hintsMap = useMemo(
    () => matchHintsByPath(detail.imported_payload ?? null),
    [detail.imported_payload],
  );

  const translatedHints = detail.translated_hints ?? {};

  return (
    <section className="flex flex-col gap-4" aria-label="取り込んだ内容">
      <p className="text-sm font-medium text-muted-foreground">
        取り込んだ内容
        {written && written.length > 0 && (
          <span className="ml-1.5 font-normal">{written.length} 件</span>
        )}
      </p>
      {written && written.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border">
          {written.map((path) => (
            <li key={path} className="py-4 first:pt-0 last:pb-0">
              <FileReviewCard
                path={path}
                hint={hintsMap.get(path)}
                searchQuery={searchQuery}
                logId={String(detail.id)}
                cachedTranslation={translatedHints[path]}
              />
            </li>
          ))}
        </ul>
      ) : detail.imported_content?.trim() ? (
        <pre className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
          {detail.imported_content}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">取り込んだ内容はありません。</p>
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

          <ImportedContent
            detail={detail}
            searchQuery={savedSearch?.query ?? ""}
          />
        </section>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function SavedSearchRunLogsContent() {
  const searchParams = useSearchParams();
  const selectedLogId = searchParams.get("log");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide">
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        {selectedLogId ? (
          <LogDetail logId={selectedLogId} />
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            左のサイドメニュー「定期実行」から実行履歴を選ぶと、ここに取り込み内容が表示されます。
          </p>
        )}
      </div>
    </div>
  );
}
