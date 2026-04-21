"use client";

import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

import { translateDocument } from "@/lib/api/translate";
import {
  SeparatedResults,
  SeparatedResultsList,
} from "./separated-results";
import type { AnalyzeResponse } from "@/lib/api/analyze";

function CitationTranslateButton({ documentId }: { documentId: number }) {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  async function handleTranslate() {
    if (translatedText) {
      setShowTranslation((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await translateDocument(documentId);
      setTranslatedText(res.translated_text);
      setShowTranslation(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-1">
      <button
        onClick={() => void handleTranslate()}
        disabled={loading}
        className="text-primary text-xs underline-offset-2 hover:underline disabled:opacity-50"
      >
        {loading ? "翻訳中…" : translatedText && showTranslation ? "原文を表示" : "日本語訳を表示"}
      </button>
      {translatedText && showTranslation && (
        <p className="bg-muted/50 mt-2 rounded-md p-2 leading-relaxed text-muted-foreground whitespace-pre-wrap text-sm">
          {translatedText}
        </p>
      )}
    </div>
  );
}

export type AskAnalyzeResultProps = {
  result: AnalyzeResponse;
};

export function AskAnalyzeResult({ result }: AskAnalyzeResultProps) {
  return (
    <SeparatedResults>
      <section aria-label="分析結果の本文">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 list-inside list-disc space-y-1 last:mb-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 list-inside list-decimal space-y-1 last:mb-0">{children}</ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            h1: ({ children }) => <h1 className="mb-2 text-lg font-semibold">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-2 font-semibold">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-1 font-medium">{children}</h3>,
          }}
        >
          {result.answer}
        </ReactMarkdown>
      </section>

      {result.key_points.length > 0 && (
        <section aria-labelledby="ask-points-heading">
          <h3
            id="ask-points-heading"
            className="font-heading pb-2 text-base font-medium"
          >
            ポイント
          </h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1">
            {result.key_points.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </section>
      )}

      {result.citations.length > 0 && (
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
                <p className="mt-1 leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {c.excerpt}
                </p>
                <CitationTranslateButton documentId={c.document_id} />
              </article>
            )}
          />
        </section>
      )}
    </SeparatedResults>
  );
}
