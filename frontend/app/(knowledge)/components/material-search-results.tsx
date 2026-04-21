"use client";

import Link from "next/link";
import { useState } from "react";

import type { MaterialSearchHit } from "@/lib/api/knowledge";

import { SeparatedResultsList } from "./separated-results";

function chunkBodyText(h: MaterialSearchHit): string {
  const p = h.source_path?.trim();
  const raw = h.text;
  if (!p) return raw;
  const prefix = `[source:${p}]`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length).replace(/^\s*\n?/, "") : raw;
}

function SearchHitBody({ h }: { h: MaterialSearchHit }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const hasTranslation = !!h.translated_text;
  const displayText = hasTranslation && !showOriginal ? h.translated_text! : chunkBodyText(h);

  return (
    <>
      <div className="text-foreground mt-3 leading-relaxed whitespace-pre-wrap wrap-break-word">
        {displayText}
      </div>
      {hasTranslation && (
        <button
          onClick={() => setShowOriginal((v) => !v)}
          className="text-muted-foreground mt-2 text-xs underline-offset-2 hover:underline"
        >
          {showOriginal ? "日本語訳を表示" : "原文を表示"}
        </button>
      )}
    </>
  );
}

type MaterialSearchResultsProps = {
  results: MaterialSearchHit[] | null;
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
        <SeparatedResultsList
          items={results}
          keyExtractor={(h) => `${h.document_id}-${h.distance}`}
          renderItem={(h) => (
            <article>
              <p className="text-muted-foreground font-mono text-xs tracking-tight">
                id {h.document_id} · distance {h.distance.toFixed(4)}
              </p>
              {h.source_path ? (
                <p className="mt-2">
                  <Link
                    href={`/file?path=${encodeURIComponent(h.source_path)}`}
                    className="text-primary inline-flex max-w-full items-center gap-1 break-all font-mono text-xs underline-offset-2 hover:underline"
                  >
                    {h.source_path}
                  </Link>
                </p>
              ) : null}
              <SearchHitBody h={h} />
            </article>
          )}
        />
      )}
    </div>
  );
}
