"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  getSavedSearchRunLog,
  type SavedSearchRunLogRead,
} from "@/lib/api/saved-search-run-logs";

export function SavedSearchRunLogsContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("log");
  const [detail, setDetail] = useState<SavedSearchRunLogRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setError(null);
      setLoadingDetail(true);
      try {
        const d = await getSavedSearchRunLog(selectedId);
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertDescription className="font-mono text-xs break-all">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {!selectedId && (
        <p className="text-muted-foreground text-sm">
          左のサイドメニュー「定期実行」から項目を選ぶと、ここに取り込み内容が表示されます。
        </p>
      )}

      {selectedId && (
        <div className="space-y-3">
          {loadingDetail ? (
            <p className="text-muted-foreground text-sm">読み込み中…</p>
          ) : detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-base font-medium">
                  {detail.title_snapshot || "Untitled"}
                </h1>
                <Badge
                  variant={
                    detail.status === "success" ? "secondary" : "destructive"
                  }
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
              <section
                className="flex flex-col gap-2"
                aria-label="取り込んだ内容"
              >
                <p className="text-muted-foreground text-xs font-medium">
                  取り込んだ内容
                </p>
                {(() => {
                  const written = Array.isArray(detail.imported_payload?.written)
                    ? (detail.imported_payload!.written as unknown[]).filter(
                        (f): f is string => typeof f === "string"
                      )
                    : null;

                  if (written && written.length > 0) {
                    return (
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
                    );
                  }

                  if (detail.imported_content?.trim()) {
                    return (
                      <pre className="text-foreground/90 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                        {detail.imported_content}
                      </pre>
                    );
                  }

                  return (
                    <p className="text-muted-foreground text-sm">
                      取り込んだ内容はありません。
                    </p>
                  );
                })()}
              </section>
            </>
          ) : null}
        </div>
      )}
      </div>
    </div>
  );
}
