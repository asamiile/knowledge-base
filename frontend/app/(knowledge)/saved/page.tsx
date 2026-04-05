"use client";

import { ArxivQueryTabs } from "../components/arxiv-query-tabs";
import { useKnowledgeStudio } from "../knowledge-studio-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type {
  PeriodicSavedSearchTarget,
  SavedSearchTarget,
} from "@/lib/api/saved-searches";

/** 定期保存フォームの外部ソース一覧（項目を足すだけで拡張） */
const SAVED_SEARCH_TARGET_FORM_OPTIONS: {
  value: PeriodicSavedSearchTarget;
  label: string;
}[] = [{ value: "arxiv", label: "arXiv" }];

const INTERVAL_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "定期なし（手動のみ）" },
  { value: "5", label: "5 分ごと" },
  { value: "15", label: "15 分ごと" },
  { value: "30", label: "30 分ごと" },
  { value: "60", label: "1 時間ごと" },
  { value: "360", label: "6 時間ごと" },
  { value: "1440", label: "24 時間ごと" },
];

/** 一覧の既存レコード用（新規保存は arXiv のみ） */
function searchTargetLabel(v: SavedSearchTarget): string {
  if (v === "knowledge") return "ローカル資料インデックス";
  return "arXiv";
}

/** `/saved` — 定期実行（保存条件） */
export default function SavedMaterialSearchesPage() {
  const {
    error,
    info,
    busy,
    savedMaterialSearches,
    saveMaterialName,
    setSaveMaterialName,
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
    saveMaterialSearchTarget,
    setSaveMaterialSearchTarget,
    addSavedMaterialSearch,
    runSavedMaterialSearch,
    patchSavedMaterialSearch,
    deleteSavedMaterialSearch,
  } = useKnowledgeStudio();

  const busyAny = busy !== null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4">
        {error && (
          <Alert variant="error">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription className="font-mono text-xs break-all">
              {error}
            </AlertDescription>
          </Alert>
        )}
        {info && !error && (
          <Alert variant="success">
            <AlertTitle>完了</AlertTitle>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
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
              <p className="text-foreground text-sm font-medium">
                定期実行の設定
              </p>
              <div className="grid min-w-[200px] gap-1">
                <Label className="text-xs" htmlFor="save-interval">
                  実行間隔
                </Label>
                <Select
                  value={String(saveMaterialIntervalMinutes)}
                  onValueChange={(v) =>
                    setSaveMaterialIntervalMinutes(Number(v))
                  }
                  disabled={busyAny}
                >
                  <SelectTrigger id="save-interval" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVAL_OPTIONS.map((o) => (
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
                  onCheckedChange={(v) =>
                    setSaveMaterialScheduleEnabled(Boolean(v))
                  }
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
              onClick={() => void addSavedMaterialSearch()}
              className="w-fit rounded-xl"
            >
              {busy === "savedSearchWrite" ? "保存中…" : "条件を保存"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-heading text-sm font-medium">
            保存した条件（{savedMaterialSearches.length}）
          </h3>
          {savedMaterialSearches.map((item) => (
              <Card key={item.id} className="rounded-xl">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <p className="text-muted-foreground text-xs">
                        対象:{" "}
                        {searchTargetLabel(
                          item.searchTarget ?? "knowledge",
                        )}
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
                    </CardDescription>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`sched-${item.id}`}
                          checked={item.scheduleEnabled}
                          disabled={
                            busyAny || item.intervalMinutes <= 0
                          }
                          onCheckedChange={(v) => {
                            const on = Boolean(v);
                            if (on && item.intervalMinutes <= 0) {
                              void patchSavedMaterialSearch(item.id, {
                                intervalMinutes: 15,
                                scheduleEnabled: true,
                              });
                            } else {
                              void patchSavedMaterialSearch(item.id, {
                                scheduleEnabled: on,
                              });
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
                          void patchSavedMaterialSearch(item.id, {
                            intervalMinutes: mins,
                            scheduleEnabled:
                              mins > 0 ? item.scheduleEnabled : false,
                          });
                        }}
                        disabled={busyAny}
                      >
                        <SelectTrigger className="h-8 w-[160px] rounded-lg text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INTERVAL_OPTIONS.map((o) => (
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
                        onClick={() => void runSavedMaterialSearch(item)}
                      >
                        今すぐ検索
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyAny}
                      onClick={() =>
                        void deleteSavedMaterialSearch(item.id)
                      }
                    >
                      削除
                    </Button>
                  </div>
                </CardHeader>
              </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
