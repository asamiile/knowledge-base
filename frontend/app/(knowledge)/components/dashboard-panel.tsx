"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { Pie, PieChart } from "recharts";

import type { DataFileInfo } from "@/lib/api/data";
import { getDataFiles } from "@/lib/api/data";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  aggregateDataFilesForPie,
  countUploadAndArxiv,
} from "@/lib/data-file-category";

const pieChartConfig = {
  imports_arxiv: { label: "arXiv 取り込み", color: "var(--chart-1)" },
  imports_other: { label: "その他の取り込み", color: "var(--chart-2)" },
  uploads: { label: "アップロード", color: "var(--chart-3)" },
  other: { label: "ルート／その他", color: "var(--chart-4)" },
} satisfies ChartConfig;

type DashboardPanelProps = {
  onRefreshStats: () => void | Promise<void>;
};

/** `/` — 取り込み資料の概要と分類 */
export function DashboardPanel({ onRefreshStats }: DashboardPanelProps) {
  const [files, setFiles] = useState<DataFileInfo[] | null>(null);
  const [filesLoading, setFilesLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      setFiles(await getDataFiles(2000));
    } catch {
      setFiles(null);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const refreshAll = useCallback(() => {
    void onRefreshStats();
    void loadFiles();
  }, [loadFiles, onRefreshStats]);

  const sortedFiles = useMemo(() => {
    if (!files?.length) return [];
    return [...files].sort((a, b) => a.path.localeCompare(b.path));
  }, [files]);

  const pieData = useMemo(
    () => (files?.length ? aggregateDataFilesForPie(files) : []),
    [files],
  );

  const { upload, arxiv } = useMemo(
    () => (files?.length ? countUploadAndArxiv(files) : { upload: 0, arxiv: 0 }),
    [files],
  );

  const busy = filesLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-6 pb-10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="text-muted-foreground size-7 shrink-0" />
              <div>
                <h1 className="text-foreground text-lg font-semibold tracking-tight">
                  ダッシュボード
                </h1>
                <p className="text-muted-foreground text-sm">
                  取り込んだファイル数と保存パス別の内訳
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
              disabled={busy}
              onClick={() => void refreshAll()}
            >
              <RefreshCw
                className={`size-4 ${busy ? "animate-spin" : ""}`}
                aria-hidden
              />
              更新
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-xl border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ファイル数</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    アップロード（uploads/）
                  </span>
                  <span className="font-mono tabular-nums">
                    {filesLoading ? "…" : upload}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    arXiv 取り込み（imports/arxiv/）
                  </span>
                  <span className="font-mono tabular-nums">
                    {filesLoading ? "…" : arxiv}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">DATA_DIR 合計</span>
                  <span className="font-mono tabular-nums">
                    {filesLoading ? "…" : (files?.length ?? "—")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">分類</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {filesLoading
                      ? "読み込み中…"
                      : "ファイルがありません。資料を追加してください。"}
                  </p>
                ) : (
                  <ChartContainer
                    config={pieChartConfig}
                    className="mx-auto aspect-square max-h-[260px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent hideLabel nameKey="name" />
                        }
                      />
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={88}
                        strokeWidth={2}
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ファイル一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {filesLoading ? (
                <p className="text-muted-foreground text-sm">一覧を読み込み中…</p>
              ) : sortedFiles.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  ファイルはまだありません。
                </p>
              ) : (
                <ul className="border-border bg-muted/20 max-h-[min(50vh,360px)] overflow-y-auto rounded-lg border text-sm">
                  {sortedFiles.map((f) => (
                    <li
                      key={f.path}
                      className="border-border/60 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b px-3 py-2 last:border-b-0"
                    >
                      <Link
                        href={`/file?path=${encodeURIComponent(f.path)}`}
                        className="text-primary min-w-0 flex-1 break-all font-mono text-xs underline-offset-2 hover:underline"
                      >
                        {f.path}
                      </Link>
                      <span className="text-muted-foreground shrink-0 tabular-nums text-xs">
                        {f.size_bytes.toLocaleString()} B
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
