"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-4 md:px-2">
      {error && (
        <Alert variant="error" className="mb-4">
          <AlertTitle>エラー</AlertTitle>
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
                  <AlertTitle>エラー詳細</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap text-xs">
                    {detail.error_message}
                  </AlertDescription>
                </Alert>
              )}
              <div className="bg-card rounded-xl border p-4">
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  取り込んだ内容
                </p>
                {detail.imported_content?.trim() ? (
                  <pre className="text-foreground/90 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                    {detail.imported_content}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    本文はまだありません（サーバー側ジョブが
                    <code className="text-foreground/80 mx-1 rounded bg-muted px-1 text-xs">
                      imported_content
                    </code>
                    を記録すると表示されます）。
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
