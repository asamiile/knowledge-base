"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DataFileInfo } from "@/lib/api/data";
import { getDataFiles } from "@/lib/api/data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FileDetailExternalMeta } from "./file-detail-external-meta";
import { SeparatedResults } from "./separated-results";

function isSafeRelativePath(path: string): boolean {
  if (!path || path.includes("..")) return false;
  const norm = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return norm.length > 0;
}

/** `/search` と同様に、メイン領域をスクロール可能にする */
function StudioScrollPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-4xl space-y-4 pb-10">{children}</div>
    </div>
  );
}

type FileDetailPanelProps = {
  pathParam: string | null;
};

/** `/file?path=…` — DATA_DIR 上の 1 ファイルメタ */
export function FileDetailPanel({ pathParam }: FileDetailPanelProps) {
  const decodedPath = useMemo(() => {
    if (!pathParam) return null;
    try {
      return decodeURIComponent(pathParam);
    } catch {
      return null;
    }
  }, [pathParam]);

  const pathInvalid = useMemo(() => {
    if (!pathParam) return false;
    if (!decodedPath || !isSafeRelativePath(decodedPath)) return true;
    return false;
  }, [pathParam, decodedPath]);

  const [row, setRow] = useState<DataFileInfo | null | undefined>(undefined);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fileLabel = useMemo(() => {
    if (!decodedPath) return "";
    const seg = decodedPath.split("/").pop();
    return seg ?? decodedPath;
  }, [decodedPath]);

  useEffect(() => {
    if (!pathParam || !decodedPath || pathInvalid) {
      return;
    }
    let cancelled = false;
    void getDataFiles(5000)
      .then((files) => {
        if (cancelled) return;
        const hit = files.find((f) => f.path === decodedPath);
        setRow(hit ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError("一覧の取得に失敗しました。");
        setRow(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathParam, decodedPath, pathInvalid]);

  if (!pathParam) {
    return (
      <StudioScrollPage>
        <p className="text-muted-foreground text-sm">
          <code className="text-foreground">path</code>{" "}
          クエリがありません。
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          ダッシュボードへ
        </Link>
      </StudioScrollPage>
    );
  }

  if (pathInvalid) {
    return (
      <StudioScrollPage>
        <p className="text-destructive text-sm">パスが不正です。</p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          ダッシュボードへ
        </Link>
      </StudioScrollPage>
    );
  }

  if (fetchError) {
    return (
      <StudioScrollPage>
        <p className="text-destructive text-sm">{fetchError}</p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          ダッシュボードへ
        </Link>
      </StudioScrollPage>
    );
  }

  if (row === undefined) {
    return (
      <StudioScrollPage>
        <p className="text-muted-foreground text-sm">読み込み中…</p>
      </StudioScrollPage>
    );
  }

  if (row === null) {
    return (
      <StudioScrollPage>
        <p className="text-muted-foreground text-sm">
          該当するファイルが見つかりません。
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          ダッシュボードへ
        </Link>
      </StudioScrollPage>
    );
  }

  return (
    <StudioScrollPage>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 gap-1 rounded-xl",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          ダッシュボード
        </Link>
      </div>

      {decodedPath ? (
        <FileDetailExternalMeta
          key={decodedPath}
          dataPath={decodedPath}
          fileLabel={fileLabel}
          storagePath={row.path}
        />
      ) : null}

      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-xs">
          メタデータ — DATA_DIR からの相対パス（一覧 API と同一）
        </p>
        <SeparatedResults>
          <article>
            <p className="text-muted-foreground font-mono text-[11px] tracking-tight">
              サイズ
            </p>
            <p className="text-foreground mt-3 font-mono text-[15px] tabular-nums">
              {row.size_bytes.toLocaleString()} B
            </p>
          </article>
          <article>
            <p className="text-muted-foreground font-mono text-[11px] tracking-tight">
              更新日時
            </p>
            <p className="text-foreground mt-3 font-mono text-[15px] tabular-nums">
              {new Date(row.modified_at).toLocaleString()}
            </p>
          </article>
        </SeparatedResults>
      </div>
    </StudioScrollPage>
  );
}
