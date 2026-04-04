"use client";

import type { MaterialSearchHit } from "@/lib/api/knowledge";

type MaterialSearchResultsProps = {
  /** null のときは何も表示しない */
  results: MaterialSearchHit[] | null;
  /** 検索に要したミリ秒。results とセットでメタ行に使う */
  durationMs: number | null;
};

export function MaterialSearchResults({
  results,
  durationMs,
}: MaterialSearchResultsProps) {
  if (!results) return null;

  return (
    <div className="flex flex-col gap-4">
      {durationMs != null && (
        <p className="text-muted-foreground text-xs">
          {results.length} 件 / {durationMs} ms
        </p>
      )}
      {results.length > 0 && (
        <ul className="flex flex-col gap-4">
          {results.map((h) => (
            <li
              key={`${h.document_id}-${h.distance}`}
              className="border-border bg-muted/35 rounded-xl border p-4 shadow-sm"
            >
              <p className="text-muted-foreground font-mono text-[11px] tracking-tight">
                id {h.document_id} · distance {h.distance.toFixed(4)}
              </p>
              <div className="font-sans mt-3 text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground">
                {h.text}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
