"use client";

import Link from "next/link";

import { useAsyncData } from "../hooks/use-async-data";

import type { DataFileInfo } from "@/lib/api/data";
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
  const { loading: showMetaLoading, data: enrich, error: enrichError } = useAsyncData(
    () => getFileEnrichment(dataPath),
    dataPath,
  );

  const categories = enrich?.arxiv_categories ?? [];
  const summary = enrich?.summary?.trim();

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

        <p className="text-foreground break-all font-mono text-xs">{fileLabel}</p>

        {enrichError ? (
          <p className="text-destructive">{enrichError}</p>
        ) : null}

        {categories.length > 0 ? (
          <ul className="list-none space-y-1.5">
            {categories.map((code) => {
              const ja = arxivCategoryLabelJa(code);
              const label = ja || "（名称未登録）";
              return (
                <li key={code} className="text-foreground leading-snug">
                  カテゴリ: {label}、区分コード:{" "}
                  <span className="font-mono">{code}</span>
                </li>
              );
            })}
          </ul>
        ) : !showMetaLoading &&
          enrich?.arxiv_id &&
          categories.length === 0 ? (
          <p className="text-muted-foreground">
            カテゴリは取得できませんでした。
          </p>
        ) : null}

        {!showMetaLoading && enrich?.arxiv_id ? (
          <p className="text-foreground tabular-nums">
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
              className="text-primary underline-offset-2 hover:underline"
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
      ) : !showMetaLoading &&
        enrich?.arxiv_id &&
        !summary ? (
        <p className="text-muted-foreground">要約はありません。</p>
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
            <p className="text-muted-foreground mt-2">読み込み中…</p>
          </div>
        ) : null}

        {fileMeta === null && !fileMetaError ? (
          <div>
            <p className="text-muted-foreground text-xs">サイズ / 更新日時</p>
            <p className="text-muted-foreground mt-2">
              ローカル上のファイル情報を取得できませんでした。
            </p>
          </div>
        ) : null}

        {fileMeta ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
            <div>
              <p className="text-muted-foreground text-xs">サイズ</p>
              <p className="text-foreground mt-2 font-mono tabular-nums">
                {fileMeta.size_bytes.toLocaleString()} B
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">更新日時</p>
              <p className="text-foreground mt-2 font-mono tabular-nums">
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
        <p className="text-muted-foreground">
          このパスでは外部の論文メタは取得していません（アップロード資料など）。
        </p>
      ) : null}
    </div>
  );
}
