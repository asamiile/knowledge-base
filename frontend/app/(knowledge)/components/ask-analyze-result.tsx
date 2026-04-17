"use client";

import Link from "next/link";

import {
  SeparatedResults,
  SeparatedResultsList,
} from "./separated-results";
import type { AnalyzeResponse } from "@/lib/api/analyze";

export type AskAnalyzeResultProps = {
  result: AnalyzeResponse;
};

export function AskAnalyzeResult({ result }: AskAnalyzeResultProps) {
  return (
    <SeparatedResults>
      <section aria-label="分析結果の本文">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {result.answer}
        </p>
      </section>

      <section aria-labelledby="ask-points-heading">
        <h3
          id="ask-points-heading"
          className="font-heading pb-2 text-base font-medium"
        >
          ポイント
        </h3>
        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
          {result.key_points.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ask-citations-heading">
        <h3
          id="ask-citations-heading"
          className="font-heading pb-2 text-base font-medium"
        >
          引用
        </h3>
        <SeparatedResultsList
          items={result.citations}
          keyExtractor={(_, i) => i}
          renderItem={(c) => (
            <article>
              {c.source_path ? (
                <Link
                  href={`/file?path=${encodeURIComponent(c.source_path)}`}
                  className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                >
                  {c.source_path}
                </Link>
              ) : (
                <span className="font-mono text-muted-foreground text-xs">
                  doc #{c.document_id}
                </span>
              )}
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                {c.excerpt}
              </p>
            </article>
          )}
        />
      </section>
    </SeparatedResults>
  );
}
