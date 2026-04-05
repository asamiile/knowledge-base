"use client";

import { ArxivQueryTabs } from "./arxiv-query-tabs";
import {
  SAVED_SEARCH_INTERVAL_OPTIONS,
  SAVED_SEARCH_TARGET_FORM_OPTIONS,
} from "./saved-search-constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeriodicSavedSearchTarget } from "@/lib/api/saved-searches";

export type SavedSearchFormProps = {
  busyAny: boolean;
  busySavedSearchWrite: boolean;
  saveMaterialName: string;
  setSaveMaterialName: (v: string) => void;
  saveMaterialSearchTarget: PeriodicSavedSearchTarget;
  setSaveMaterialSearchTarget: (v: PeriodicSavedSearchTarget) => void;
  saveMaterialArxivIds: string;
  setSaveMaterialArxivIds: (v: string) => void;
  saveMaterialArxivKeyword: string;
  setSaveMaterialArxivKeyword: (v: string) => void;
  saveMaterialTopK: number;
  setSaveMaterialTopK: (v: number) => void;
  saveMaterialIntervalMinutes: number;
  setSaveMaterialIntervalMinutes: (v: number) => void;
  saveMaterialScheduleEnabled: boolean;
  setSaveMaterialScheduleEnabled: (v: boolean) => void;
  onSave: () => void;
};

export function SavedSearchForm({
  busyAny,
  busySavedSearchWrite,
  saveMaterialName,
  setSaveMaterialName,
  saveMaterialSearchTarget,
  setSaveMaterialSearchTarget,
  saveMaterialArxivIds,
  setSaveMaterialArxivIds,
  saveMaterialArxivKeyword,
  setSaveMaterialArxivKeyword,
  saveMaterialTopK,
  setSaveMaterialTopK,
  saveMaterialIntervalMinutes,
  setSaveMaterialIntervalMinutes,
  saveMaterialScheduleEnabled,
  setSaveMaterialScheduleEnabled,
  onSave,
}: SavedSearchFormProps) {
  return (
    <section
      className="flex flex-col gap-3"
      aria-label="保存条件の新規作成"
    >
      <div className="grid gap-2">
        <Label>表示名</Label>
        <Input
          value={saveMaterialName}
          onChange={(e) => setSaveMaterialName(e.target.value)}
          placeholder="一覧に表示する名前"
          disabled={busyAny}
          className="rounded-xl"
        />
      </div>
      <div className="grid gap-2">
        <Label>検索対象</Label>
        <Select
          value={saveMaterialSearchTarget}
          onValueChange={(v) =>
            setSaveMaterialSearchTarget(v as PeriodicSavedSearchTarget)
          }
          disabled={busyAny}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAVED_SEARCH_TARGET_FORM_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {saveMaterialSearchTarget === "arxiv" && (
        <ArxivQueryTabs
          intro={
            <p>
              <a
                href="https://arxiv.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:text-primary"
              >
                arXiv
              </a>
              の論文IDまたはキーワードを入力します。どちらか片方だけでも可。両方ある場合は「資料を追加」と同じく結果を合わせます。
            </p>
          }
          arxivIds={saveMaterialArxivIds}
          onArxivIdsChange={setSaveMaterialArxivIds}
          keyword={saveMaterialArxivKeyword}
          onKeywordChange={setSaveMaterialArxivKeyword}
          disabled={busyAny}
          idsInputId="saved-arxiv-ids"
          keywordInputId="saved-arxiv-keyword"
          maxResults={saveMaterialTopK}
          onMaxResultsChange={setSaveMaterialTopK}
          maxResultsInputId="saved-arxiv-max-results"
          showRequiredBadges={false}
        />
      )}
      <div className="grid gap-3">
        <p className="text-foreground text-sm font-medium">定期実行の設定</p>
        <div className="grid min-w-[200px] gap-1">
          <Label className="text-xs" htmlFor="save-interval">
            実行間隔
          </Label>
          <Select
            value={String(saveMaterialIntervalMinutes)}
            onValueChange={(v) => setSaveMaterialIntervalMinutes(Number(v))}
            disabled={busyAny}
          >
            <SelectTrigger id="save-interval" className="rounded-xl">
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="save-schedule"
            checked={saveMaterialScheduleEnabled}
            onCheckedChange={(v) => setSaveMaterialScheduleEnabled(Boolean(v))}
            disabled={busyAny || saveMaterialIntervalMinutes <= 0}
          />
          <Label
            htmlFor="save-schedule"
            className="cursor-pointer text-sm font-normal"
          >
            定期実行を有効にする
          </Label>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={busyAny}
        onClick={onSave}
        className="w-fit rounded-xl"
      >
        {busySavedSearchWrite ? "保存中…" : "条件を保存"}
      </Button>
    </section>
  );
}
