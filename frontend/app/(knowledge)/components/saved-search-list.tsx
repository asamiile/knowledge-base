"use client";

import Link from "next/link";
import { History, Pencil, Play, Trash2 } from "lucide-react";

import {
  SAVED_SEARCH_INTERVAL_OPTIONS,
  savedSearchTargetLabel,
} from "./saved-search-constants";
import { SeparatedResultsList } from "./separated-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SavedMaterialSearch } from "@/lib/api/saved-material-searches";

export type SavedSearchListProps = {
  items: SavedMaterialSearch[];
  busyAny: boolean;
  onPatch: (id: string, patch: Partial<SavedMaterialSearch>) => void;
  onDelete: (id: string) => void;
  onRunNow: (item: SavedMaterialSearch) => void;
  onEdit: (item: SavedMaterialSearch) => void;
};

function formatLastRun(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "たった今";
  if (m < 60) return `${m} 分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 時間前`;
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SavedSearchList({
  items,
  busyAny,
  onPatch,
  onDelete,
  onRunNow,
  onEdit,
}: SavedSearchListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-muted-foreground">保存した条件がありません。</p>
        <p className="text-muted-foreground text-xs">
          右上の「追加」から検索条件を登録できます。
        </p>
      </div>
    );
  }

  return (
    <SeparatedResultsList
      items={items}
      keyExtractor={(item) => item.id}
      renderItem={(item) => {
        const target = item.searchTarget ?? "knowledge";
        const canRun =
          target === "arxiv"
            ? item.query.trim().length > 0 || item.arxivIds.length > 0
            : item.query.trim().length > 0;

        return (
          <article className="space-y-2.5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold leading-tight">
                    {item.name}
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {savedSearchTargetLabel(target)}
                  </Badge>
                  {item.scheduleEnabled && item.intervalMinutes > 0 && (
                    <Badge variant="outline" className="text-xs">
                      定期実行中
                    </Badge>
                  )}
                </div>

                {/* Query summary */}
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  {target === "arxiv" ? (
                    <>
                      {item.arxivIds.length > 0 && (
                        <p className="truncate font-mono">
                          ID: {item.arxivIds.join(", ")}
                        </p>
                      )}
                      {item.query.trim() && (
                        <p className="truncate">
                          キーワード: {item.query.trim()}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="line-clamp-2">{item.query.trim()}</p>
                  )}
                  <p>取得件数: {item.topK}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  disabled={busyAny}
                  onClick={() => onEdit(item)}
                  title="編集"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  <span className="sr-only">編集</span>
                </Button>
                <Link
                  href={`/saved/logs?search=${encodeURIComponent(item.id)}`}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="実行履歴を見る"
                >
                  <History className="size-3.5" aria-hidden />
                  履歴
                </Link>
                {canRun && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1.5 px-2.5 text-xs"
                    disabled={busyAny}
                    onClick={() => onRunNow(item)}
                    title="今すぐ実行"
                  >
                    <Play className="size-3.5" aria-hidden />
                    実行
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  disabled={busyAny}
                  onClick={() => onDelete(item.id)}
                  title="削除"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  <span className="sr-only">削除</span>
                </Button>
              </div>
            </div>

            {/* Schedule controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`sched-${item.id}`}
                  checked={item.scheduleEnabled}
                  disabled={busyAny || item.intervalMinutes <= 0}
                  onCheckedChange={(v) => {
                    const on = Boolean(v);
                    if (on && item.intervalMinutes <= 0) {
                      onPatch(item.id, { intervalMinutes: 15, scheduleEnabled: true });
                    } else {
                      onPatch(item.id, { scheduleEnabled: on });
                    }
                  }}
                />
                <Label
                  htmlFor={`sched-${item.id}`}
                  className="cursor-pointer text-xs font-normal"
                >
                  定期実行
                </Label>
              </div>
              <Select
                value={String(item.intervalMinutes)}
                onValueChange={(v) => {
                  const mins = Number(v);
                  onPatch(item.id, {
                    intervalMinutes: mins,
                    scheduleEnabled: mins > 0 ? item.scheduleEnabled : false,
                  });
                }}
                disabled={busyAny}
              >
                <SelectTrigger className="h-7 w-[150px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_SEARCH_INTERVAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {item.lastRunAt && (
                <p className="ml-auto text-xs text-muted-foreground">
                  最終実行: {formatLastRun(item.lastRunAt)}
                </p>
              )}
            </div>
          </article>
        );
      }}
    />
  );
}
