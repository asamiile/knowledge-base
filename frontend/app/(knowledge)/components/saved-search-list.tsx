"use client";

import {
  SAVED_SEARCH_INTERVAL_OPTIONS,
  savedSearchTargetLabel,
} from "./saved-search-constants";
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
import type { SavedMaterialSearch } from "@/lib/saved-material-searches";

export type SavedSearchListProps = {
  items: SavedMaterialSearch[];
  busyAny: boolean;
  onPatch: (id: string, patch: Partial<SavedMaterialSearch>) => void;
  onDelete: (id: string) => void;
  onRunNow: (item: SavedMaterialSearch) => void;
};

export function SavedSearchList({
  items,
  busyAny,
  onPatch,
  onDelete,
  onRunNow,
}: SavedSearchListProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-heading text-sm font-medium">
        保存した条件（{items.length}）
      </h3>
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-row items-start justify-between gap-2 border-b border-border pb-4 last:border-b-0 last:pb-0"
        >
          <div className="min-w-0 flex-1">
            <h4 className="font-heading text-base font-medium">{item.name}</h4>
            <div className="text-muted-foreground mt-2 space-y-1 text-sm">
              <p className="text-xs">
                対象: {savedSearchTargetLabel(item.searchTarget ?? "knowledge")}
              </p>
              {(item.searchTarget ?? "knowledge") === "arxiv" ? (
                <>
                  {item.arxivIds.length > 0 && (
                    <p className="line-clamp-2 font-mono text-xs text-foreground/90">
                      論文ID: {item.arxivIds.join(", ")}
                    </p>
                  )}
                  {item.query.trim() && (
                    <p className="line-clamp-2 text-foreground/90">
                      キーワード: {item.query.trim()}
                    </p>
                  )}
                </>
              ) : (
                <p className="line-clamp-2 text-foreground/90">
                  {item.query.trim()}
                </p>
              )}
              <p className="text-xs">
                一度に取得する件数: {item.topK}
                {item.intervalMinutes > 0
                  ? ` · 実行間隔 ${item.intervalMinutes} 分`
                  : ""}
                {item.scheduleEnabled ? " · 定期オン" : ""}
              </p>
              {item.lastRunAt && (
                <p className="text-xs">
                  最終実行:{" "}
                  {new Date(item.lastRunAt).toLocaleString("ja-JP")}
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`sched-${item.id}`}
                  checked={item.scheduleEnabled}
                  disabled={busyAny || item.intervalMinutes <= 0}
                  onCheckedChange={(v) => {
                    const on = Boolean(v);
                    if (on && item.intervalMinutes <= 0) {
                      onPatch(item.id, {
                        intervalMinutes: 15,
                        scheduleEnabled: true,
                      });
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
                <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVED_SEARCH_INTERVAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {(item.searchTarget ?? "knowledge") !== "arxiv" && (
              <Button
                size="sm"
                className="rounded-lg"
                disabled={busyAny}
                onClick={() => onRunNow(item)}
              >
                今すぐ検索
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={busyAny}
              onClick={() => onDelete(item.id)}
            >
              削除
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
