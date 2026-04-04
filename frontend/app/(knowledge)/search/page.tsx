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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** `/search` — 定期・検索（保存クエリ） */
export default function SearchSchedulePage() {
  const s = useKnowledgeStudio();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4">
        <Alert variant="info">
          <AlertTitle>手動実行（MVP）</AlertTitle>
          <AlertDescription>
            保存したクエリは localStorage のみ。定期は cron 等から{" "}
            <code className="text-xs">POST /api/data/imports/arxiv</code>
          </AlertDescription>
        </Alert>

        {s.error && (
          <Alert variant="destructive">
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
            <CardTitle>クエリを保存</CardTitle>
            <CardDescription>
              検索クエリ・max_results を使う取得はここで実行します。保存したクエリは「今すぐ取得」で再実行できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid gap-2">
              <Label>表示名</Label>
              <Input
                value={s.newSavedName}
                onChange={(e) => s.setNewSavedName(e.target.value)}
                placeholder="例: 週次サーベイ"
                disabled={s.busy !== null}
                className="rounded-xl"
              />
            </div>
            <Textarea
              value={s.newSavedIds}
              onChange={(e) => s.setNewSavedIds(e.target.value)}
              rows={2}
              placeholder="2301.00001 または https://arxiv.org/abs/...（任意・複数可）"
              disabled={s.busy !== null}
              className="rounded-xl"
              aria-label="arXiv ID（複数可）"
            />
            <div className="grid gap-2">
              <Label>検索クエリ</Label>
              <Input
                value={s.newSavedSearch}
                onChange={(e) => s.setNewSavedSearch(e.target.value)}
                disabled={s.busy !== null}
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label className="text-xs">max_results</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-20 rounded-xl"
                  value={s.newSavedMax}
                  onChange={(e) =>
                    s.setNewSavedMax(Number(e.target.value) || 5)
                  }
                  disabled={s.busy !== null}
                />
              </div>
              <Button
                disabled={s.busy !== null}
                onClick={() => void s.onArxivImportFromSearchForm()}
                className="rounded-xl"
              >
                {s.busy === "arxiv" ? "取得中…" : "arXiv から取得"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={s.busy !== null}
                onClick={s.addSavedQuery}
                className="rounded-xl"
              >
                保存
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-heading text-sm font-medium">
            保存済み（{s.savedQueries.length}）
          </h3>
          {s.savedQueries.length === 0 ? (
            <p className="text-muted-foreground text-sm">まだありません。</p>
          ) : (
            s.savedQueries.map((item) => (
              <Card key={item.id} className="rounded-xl">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    <CardDescription className="mt-1 space-y-0.5">
                      {item.arxivIds.trim() && (
                        <p className="font-mono text-xs break-all">
                          IDs: {item.arxivIds.trim()}
                        </p>
                      )}
                      {item.searchQuery.trim() && (
                        <p>検索: {item.searchQuery.trim()}</p>
                      )}
                      {item.lastRunAt && (
                        <p className="text-xs">
                          最終実行:{" "}
                          {new Date(item.lastRunAt).toLocaleString("ja-JP")}
                        </p>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg"
                      disabled={s.busy !== null}
                      onClick={() => void s.runSaved(item)}
                    >
                      今すぐ取得
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={s.busy !== null}
                      onClick={() => s.deleteSaved(item.id)}
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
