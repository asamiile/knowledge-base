"use client";

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
import { Textarea } from "@/components/ui/textarea";

const INTERVAL_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "定期なし（手動のみ）" },
  { value: "5", label: "5 分ごと" },
  { value: "15", label: "15 分ごと" },
  { value: "30", label: "30 分ごと" },
  { value: "60", label: "1 時間ごと" },
  { value: "360", label: "6 時間ごと" },
  { value: "1440", label: "24 時間ごと" },
];

/** `/saved` — 検索条件の保存 */
export default function SavedMaterialSearchesPage() {
  const s = useKnowledgeStudio();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4">
        {s.error && (
          <Alert variant="error">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription className="font-mono text-xs break-all">
              {s.error}
            </AlertDescription>
          </Alert>
        )}
        {s.info && !s.error && (
          <Alert variant="success">
            <AlertTitle>完了</AlertTitle>
            <AlertDescription>{s.info}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>検索条件の保存と定期実行</CardTitle>
            <CardDescription>
              表示名・クエリ・間隔を保存します。「定期を有効」は間隔が 0
              より大きいときだけ意味があります。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-2">
              <Label>表示名</Label>
              <Input
                value={s.saveMaterialName}
                onChange={(e) => s.setSaveMaterialName(e.target.value)}
                placeholder="例: 週次サーベイ用キーワード"
                disabled={s.busy !== null}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>検索クエリ（保存内容）</Label>
              <Textarea
                value={s.saveMaterialQuery}
                onChange={(e) => s.setSaveMaterialQuery(e.target.value)}
                rows={2}
                disabled={s.busy !== null}
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">top_k</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-20 rounded-xl"
                  value={s.saveMaterialTopK}
                  onChange={(e) =>
                    s.setSaveMaterialTopK(Number(e.target.value) || 5)
                  }
                  disabled={s.busy !== null}
                />
              </div>
              <div className="grid min-w-[200px] gap-1">
                <Label className="text-xs">実行間隔</Label>
                <Select
                  value={String(s.saveMaterialIntervalMinutes)}
                  onValueChange={(v) =>
                    s.setSaveMaterialIntervalMinutes(Number(v))
                  }
                  disabled={s.busy !== null}
                >
                  <SelectTrigger className="rounded-xl">
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-schedule"
                checked={s.saveMaterialScheduleEnabled}
                onCheckedChange={(v) =>
                  s.setSaveMaterialScheduleEnabled(Boolean(v))
                }
                disabled={
                  s.busy !== null || s.saveMaterialIntervalMinutes <= 0
                }
              />
              <Label htmlFor="save-schedule" className="cursor-pointer text-sm font-normal">
                保存時から定期実行を有効にする
              </Label>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={s.busy !== null}
              onClick={() => void s.addSavedMaterialSearch()}
              className="w-fit rounded-xl"
            >
              {s.busy === "savedSearchWrite" ? "保存中…" : "条件を保存"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-heading text-sm font-medium">
            保存した条件（{s.savedMaterialSearches.length}）
          </h3>
          {s.savedMaterialSearches.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              まだありません。上で保存すると一覧に表示されます。
            </p>
          ) : (
            s.savedMaterialSearches.map((item) => (
              <Card key={item.id} className="rounded-xl">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <p className="line-clamp-2 text-foreground/90">
                        {item.query.trim()}
                      </p>
                      <p className="text-xs">
                        top_k {item.topK}
                        {item.intervalMinutes > 0
                          ? ` · 間隔 ${item.intervalMinutes} 分`
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
                            s.busy !== null || item.intervalMinutes <= 0
                          }
                          onCheckedChange={(v) => {
                            const on = Boolean(v);
                            if (on && item.intervalMinutes <= 0) {
                              void s.patchSavedMaterialSearch(item.id, {
                                intervalMinutes: 15,
                                scheduleEnabled: true,
                              });
                            } else {
                              void s.patchSavedMaterialSearch(item.id, {
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
                          void s.patchSavedMaterialSearch(item.id, {
                            intervalMinutes: mins,
                            scheduleEnabled:
                              mins > 0 ? item.scheduleEnabled : false,
                          });
                        }}
                        disabled={s.busy !== null}
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
                    <Button
                      size="sm"
                      className="rounded-lg"
                      disabled={s.busy !== null}
                      onClick={() => void s.runSavedMaterialSearch(item)}
                    >
                      今すぐ検索
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={s.busy !== null}
                      onClick={() =>
                        void s.deleteSavedMaterialSearch(item.id)
                      }
                    >
                      削除
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
