"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import type { FileEnrichmentResponse } from "@/lib/api/data";
import { getFileEnrichment } from "@/lib/api/data";

import { SeparatedResults } from "./separated-results";

type FileDetailExternalMetaProps = {
  /** `path` クエリのデコード済み相対パス */
  dataPath: string;
  fileLabel: string;
  storagePath: string;
};

/**
 * `key={dataPath}` でマウントし直す想定。外部メタ取得はこの中だけ。
 */
export function FileDetailExternalMeta({
  dataPath,
  fileLabel,
  storagePath,
}: FileDetailExternalMetaProps) {
  const [enrich, setEnrich] = useState<FileEnrichmentResponse | null | undefined>(
    undefined,
  );
  const [enrichError, setEnrichError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getFileEnrichment(dataPath)
      .then((data) => {
        if (!cancelled) setEnrich(data);
      })
      .catch(() => {
        if (!cancelled) {
          setEnrichError("外部メタの取得に失敗しました。");
          setEnrich(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [dataPath]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <FileText className="text-muted-foreground mt-0.5 size-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-foreground text-lg font-semibold tracking-tight">
            資料の詳細
          </h1>
          <p className="text-foreground mt-2 text-base font-medium leading-snug">
            {enrich?.display_name ?? fileLabel}
          </p>
          <p className="text-muted-foreground mt-1 break-all font-mono text-[11px] tracking-tight">
            {storagePath}
          </p>
          {enrich?.arxiv_id ? (
            <p className="mt-2">
              <Link
                href={`https://arxiv.org/abs/${enrich.arxiv_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm underline-offset-2 hover:underline"
              >
                arXiv で開く
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-xs">
          論文情報 — タイトル・要約は arXiv、引用数は OpenAlex（新形式 ID のみ）
        </p>

        {enrichError ? (
          <p className="text-destructive text-sm">{enrichError}</p>
        ) : null}
        {enrich === undefined ? (
          <p className="text-muted-foreground text-sm">読み込み中…</p>
        ) : null}

        {enrich &&
        enrich.sources.length === 0 &&
        !enrich.tldr &&
        !enrich.summary &&
        enrich.citation_count === null ? (
          <p className="text-muted-foreground text-sm">
            このパスでは外部の論文メタは取得していません（アップロード資料など）。
          </p>
        ) : null}

        {enrich &&
        (enrich.tldr ||
          enrich.summary ||
          enrich.citation_count !== null ||
          enrich.sources.length > 0) ? (
          <SeparatedResults>
            {enrich.tldr ? (
              <article>
                <p className="text-muted-foreground font-mono text-[11px] tracking-tight">
                  TLDR
                </p>
                <div className="text-foreground mt-3 font-sans text-[15px] leading-relaxed">
                  {enrich.tldr}
                </div>
              </article>
            ) : null}
            {enrich.summary ? (
              <article>
                <p className="text-muted-foreground font-mono text-[11px] tracking-tight">
                  要約
                </p>
                <div className="text-foreground mt-3 font-sans text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word">
                  {enrich.summary}
                </div>
              </article>
            ) : null}
            {enrich.citation_count !== null &&
            enrich.citation_count !== undefined ? (
              <article>
                <p className="text-muted-foreground font-mono text-[11px] tracking-tight">
                  引用数
                </p>
                <p className="text-foreground mt-3 font-mono text-[15px] tabular-nums">
                  {enrich.citation_count.toLocaleString()}
                </p>
              </article>
            ) : null}
            {enrich.sources.length > 0 ? (
              <article>
                <p className="text-muted-foreground font-mono text-[11px] tracking-tight">
                  データソース
                </p>
                <p className="text-muted-foreground mt-3 font-sans text-sm">
                  {enrich.sources.join(", ")}
                </p>
              </article>
            ) : null}
          </SeparatedResults>
        ) : null}
      </div>
    </div>
  );
}
