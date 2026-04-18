"use client";

import Link from "next/link";

import type { MaterialSearchHit } from "@/lib/api/knowledge";

import { SeparatedResultsList } from "./separated-results";

function chunkBodyText(h: MaterialSearchHit): string {
  const p = h.source_path?.trim();
  if (!p) return h.text;
  const prefix = `[source:${p}]`;
  if (h.text.startsWith(prefix)) {
    return h.text.slice(prefix.length).replace(/^\s*\n?/, "");
  }
  return h.text;
}

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
        <p className="text-muted-foreground text-sm">
          {results.length} 件 / {durationMs} ms
        </p>
      )}
      {results.length > 0 && (
        <SeparatedResultsList
          items={results}
          keyExtractor={(h) => `${h.document_id}-${h.distance}`}
          renderItem={(h) => (
            <article>
              <p className="text-muted-foreground font-mono text-sm tracking-tight">
                id {h.document_id} · distance {h.distance.toFixed(4)}
              </p>
              {h.source_path ? (
                <p className="mt-2">
                  <Link
                    href={`/file?path=${encodeURIComponent(h.source_path)}`}
                    className="text-primary inline-flex max-w-full items-center gap-1 break-all font-mono text-sm underline-offset-2 hover:underline"
                  >
                    {h.source_path}
                  </Link>
                </p>
              ) : null}
              <div className="text-foreground mt-3 leading-relaxed whitespace-pre-wrap wrap-break-word">
                {chunkBodyText(h)}
              </div>
            </article>
          )}
        />
      )}
    </div>
  );
}
