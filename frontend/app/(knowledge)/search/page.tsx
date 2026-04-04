"use client";

import { MaterialSearchResults } from "../components/material-search-results";
import { useKnowledgeStudio } from "../knowledge-studio-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** `/search` — ローカル資料のベクトル検索（チャンク一覧） */
export default function MaterialSearchPage() {
  const s = useKnowledgeStudio();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-4xl space-y-4">
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

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              id="material-search-query"
              type="search"
              value={s.materialSearchQuery}
              onChange={(e) => s.setMaterialSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (s.busy !== null) return;
                void s.onMaterialSearchClick();
              }}
              placeholder="インデックス内で探したい内容を入力…"
              disabled={s.busy !== null}
              className="h-11 min-w-0 w-full rounded-2xl text-[15px] sm:flex-1 sm:h-12"
              aria-label="検索クエリ"
              enterKeyHint="search"
            />
            <div className="flex shrink-0 items-end gap-2 sm:gap-3">
              <div className="grid w-fit gap-1">
                <Label
                  htmlFor="material-top-k"
                  className="text-muted-foreground text-xs leading-tight"
                  title="ベクトル類似度の上位から最大何件まで表示するか（1〜20）"
                >
                  件数
                </Label>
                <Input
                  id="material-top-k"
                  type="number"
                  min={1}
                  max={20}
                  className="h-11 w-18 rounded-xl sm:h-12"
                  value={s.materialSearchTopK}
                  onChange={(e) =>
                    s.setMaterialSearchTopK(Number(e.target.value) || 5)
                  }
                  disabled={s.busy !== null}
                />
              </div>
              <Button
                disabled={s.busy !== null}
                onClick={() => void s.onMaterialSearchClick()}
                className="h-11 shrink-0 rounded-full px-6 sm:h-12 sm:px-8"
                variant="secondary"
              >
                {s.busy === "materialSearch" ? "検索中…" : "検索"}
              </Button>
            </div>
          </div>
          <MaterialSearchResults
            results={s.materialSearchResults}
            durationMs={s.materialSearchMs}
          />
        </div>
      </div>
    </div>
  );
}
