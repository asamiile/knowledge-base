"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Pie, PieChart } from "recharts";

import type { ArxivPrimaryCategoryStats, DataFileInfo } from "@/lib/api/data";
import { getArxivPrimaryCategoryStats, getDataFiles } from "@/lib/api/data";
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
import { countUploadAndArxiv } from "@/lib/data-file-category";
import { arxivCategoryLabelJa } from "@/lib/arxiv-category-labels";

type DashboardPanelProps = {
  onRefreshStats: () => void | Promise<void>;
};

/** `/` — 取り込み資料の概要と分類 */
export function DashboardPanel({ onRefreshStats }: DashboardPanelProps) {
  const [files, setFiles] = useState<DataFileInfo[] | null>(null);
  const [arxivStats, setArxivStats] = useState<ArxivPrimaryCategoryStats | null>(
    null,
  );
  const [filesLoading, setFilesLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    setFilesLoading(true);
    try {
      setFiles(await getDataFiles(2000));
    } catch {
      setFiles(null);
    }
    try {
      setArxivStats(await getArxivPrimaryCategoryStats());
    } catch {
      setArxivStats(null);
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

  const arxivCategoryPieData = useMemo(() => {
    if (!arxivStats || arxivStats.total_arxiv_files === 0) return [];
    const slices: { name: string; count: number; fill: string }[] =
      arxivStats.items.map((item, i) => {
        const ja = arxivCategoryLabelJa(item.category);
        return {
          name: ja || item.category,
          count: item.count,
          fill: `hsl(${(i * 41) % 360} 65% 48%)`,
        };
      });
    if (arxivStats.uncategorized > 0) {
      slices.push({
        name: "（カテゴリ未記録）",
        count: arxivStats.uncategorized,
        fill: "hsl(220 8% 46%)",
      });
    }
    return slices;
  }, [arxivStats]);

  const arxivCategoryChartConfig = useMemo(() => {
    const c: ChartConfig = {};
    arxivCategoryPieData.forEach((slice, i) => {
      c[`ac_${i}`] = { label: slice.name, color: slice.fill };
    });
    return c;
  }, [arxivCategoryPieData]);

  const { upload, arxiv } = useMemo(
    () => (files?.length ? countUploadAndArxiv(files) : { upload: 0, arxiv: 0 }),
    [files],
  );

  const busy = filesLoading;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-6 pb-10">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
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
            <Card className="border-border/80">
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
                  <span className="text-muted-foreground">合計</span>
                  <span className="font-mono tabular-nums">
                    {filesLoading ? "…" : (files?.length ?? "—")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">分類</CardTitle>
              </CardHeader>
              <CardContent>
                {filesLoading ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    読み込み中…
                  </p>
                ) : arxivStats === null ? (
                  <p className="text-destructive py-8 text-center text-sm">
                    カテゴリ集計を取得できませんでした。
                  </p>
                ) : arxivStats.total_arxiv_files === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    arXiv 取り込み（imports/arxiv/）のファイルはまだありません。
                  </p>
                ) : arxivCategoryPieData.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    表示できるカテゴリがありません。
                  </p>
                ) : (
                  <ChartContainer
                    config={arxivCategoryChartConfig}
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
                        data={arxivCategoryPieData}
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
        </div>
      </div>
    </div>
  );
}
