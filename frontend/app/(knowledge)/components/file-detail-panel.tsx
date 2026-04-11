"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import type { DataFileInfo } from "@/lib/api/data";
import { getDataFiles } from "@/lib/api/data";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function isSafeRelativePath(path: string): boolean {
  if (!path || path.includes("..")) return false;
  const norm = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return norm.length > 0;
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
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
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
      </div>
    );
  }

  if (pathInvalid) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <p className="text-destructive text-sm">パスが不正です。</p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          ダッシュボードへ
        </Link>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <p className="text-destructive text-sm">{fetchError}</p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          ダッシュボードへ
        </Link>
      </div>
    );
  }

  if (row === undefined) {
    return (
      <div className="text-muted-foreground mx-auto max-w-3xl px-4 py-6 text-sm md:px-6">
        読み込み中…
      </div>
    );
  }

  if (row === null) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <p className="text-muted-foreground text-sm">
          該当するファイルが見つかりません。
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
        >
          ダッシュボードへ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-10 md:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-muted-foreground -ml-2 gap-1 rounded-xl"
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          ダッシュボード
        </Link>
      </div>

      <div className="flex items-start gap-3">
        <FileText className="text-muted-foreground mt-0.5 size-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-foreground text-lg font-semibold tracking-tight">
            資料の詳細
          </h1>
          <p className="text-muted-foreground mt-1 break-all font-mono text-sm">
            {row.path}
          </p>
        </div>
      </div>

      <Card className="rounded-xl border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">メタデータ</CardTitle>
          <CardDescription>
            DATA_DIR からの相対パス（一覧 API と同一）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-muted-foreground">サイズ</span>
            <span className="font-mono tabular-nums">
              {row.size_bytes.toLocaleString()} B
            </span>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-muted-foreground">更新日時</span>
            <span className="font-mono text-xs tabular-nums">
              {new Date(row.modified_at).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
