"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { DataFileInfo, FileEnrichmentResponse } from "@/lib/api/data";
import { getFileEnrichment } from "@/lib/api/data";
import { Separator } from "@/components/ui/separator";
import { arxivCategoryLabelJa } from "@/lib/arxiv-category-labels";

type FileDetailExternalMetaProps = {
  dataPath: string;
  fileLabel: string;
  fileMeta: DataFileInfo | null | undefined;
  fileMetaError: string | null;
};

export function FileDetailExternalMeta({
  dataPath,
  fileLabel,
  fileMeta,
  fileMetaError,
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

  const categories = enrich?.arxiv_categories ?? [];
  const summary = enrich?.summary?.trim();
  const showMetaLoading = enrich === undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-foreground text-lg font-semibold leading-snug tracking-tight">
            {enrich?.display_name ?? fileLabel}
          </p>
          {showMetaLoading ? (
            <p className="text-muted-foreground mt-1 text-xs">メタデータを読み込み中…</p>
          ) : null}
        </div>

        <p className="text-foreground break-all font-mono text-sm">{fileLabel}</p>

        {enrichError ? (
          <p className="text-destructive text-sm">{enrichError}</p>
        ) : null}

        {categories.length > 0 ? (
          <ul className="list-none space-y-1.5">
            {categories.map((code) => {
              const ja = arxivCategoryLabelJa(code);
              const label = ja || "（名称未登録）";
              return (
                <li key={code} className="text-foreground text-sm leading-snug">
                  カテゴリ: {label}、区分コード:{" "}
                  <span className="font-mono">{code}</span>
                </li>
              );
            })}
          </ul>
        ) : enrich !== undefined &&
          enrich?.arxiv_id &&
          categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            カテゴリは取得できませんでした。
          </p>
        ) : null}

        {enrich !== undefined && enrich?.arxiv_id ? (
          <p className="text-foreground text-sm tabular-nums">
            引用数:{" "}
            {(enrich.citation_count ?? 0).toLocaleString()}
          </p>
        ) : null}

        {enrich?.arxiv_id ? (
          <p>
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

      <Separator />

      {summary ? (
        <div>
          <p className="text-muted-foreground text-xs">要約</p>
          <div className="text-foreground mt-2 whitespace-pre-wrap wrap-break-word">
            {summary}
          </div>
        </div>
      ) : enrich !== undefined &&
        enrich?.arxiv_id &&
        !summary ? (
        <p className="text-muted-foreground text-sm">要約はありません。</p>
      ) : null}

      {summary ? <Separator /> : null}

      <div className="space-y-5">
        {enrich && enrich.sources.length > 0 ? (
          <div>
            <p className="text-muted-foreground text-xs">データソース</p>
            <p className="text-muted-foreground mt-2">
              {enrich.sources.join(", ")}
            </p>
          </div>
        ) : null}

        {fileMetaError ? (
          <p className="text-destructive text-sm">{fileMetaError}</p>
        ) : null}

        {fileMeta === undefined && !fileMetaError ? (
          <div>
            <p className="text-muted-foreground text-xs">サイズ</p>
            <p className="text-muted-foreground mt-2 text-sm">読み込み中…</p>
          </div>
        ) : null}

        {fileMeta === null && !fileMetaError ? (
          <div>
            <p className="text-muted-foreground text-xs">サイズ / 更新日時</p>
            <p className="text-muted-foreground mt-2 text-sm">
              ローカル上のファイル情報を取得できませんでした。
            </p>
          </div>
        ) : null}

        {fileMeta ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
            <div>
              <p className="text-muted-foreground text-xs">サイズ</p>
              <p className="text-foreground mt-2 font-mono text-sm tabular-nums">
                {fileMeta.size_bytes.toLocaleString()} B
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">更新日時</p>
              <p className="text-foreground mt-2 font-mono text-sm tabular-nums">
                {new Date(fileMeta.modified_at).toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {enrich &&
        enrich.sources.length === 0 &&
        !enrich.summary &&
        enrich.citation_count === null &&
        !enrich.arxiv_id ? (
        <p className="text-muted-foreground text-sm">
          このパスでは外部の論文メタは取得していません（アップロード資料など）。
        </p>
      ) : null}
    </div>
  );
}
