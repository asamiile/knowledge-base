"use client";

import type { Dispatch, KeyboardEvent as ReactKeyboardEvent, SetStateAction } from "react";

import type { MaterialSearchHit } from "@/lib/api/knowledge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { MaterialSearchResults } from "./material-search-results";
import { StudioAlerts } from "./studio-alerts";

export type MaterialSearchPanelProps = {
  error: string | null;
  info: string | null;
  busy: string | null;
  materialSearchQuery: string;
  setMaterialSearchQuery: Dispatch<SetStateAction<string>>;
  materialSearchTopK: number;
  setMaterialSearchTopK: Dispatch<SetStateAction<number>>;
  materialSearchResults: MaterialSearchHit[] | null;
  materialSearchMs: number | null;
  onMaterialSearchClick: () => void;
};

/** `/search` — ローカル資料のベクトル検索（チャンク一覧） */
export function MaterialSearchPanel({
  error,
  info,
  busy,
  materialSearchQuery,
  setMaterialSearchQuery,
  materialSearchTopK,
  setMaterialSearchTopK,
  materialSearchResults,
  materialSearchMs,
  onMaterialSearchClick,
}: MaterialSearchPanelProps) {
  const onQueryKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (busy !== null) return;
    void onMaterialSearchClick();
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <StudioAlerts error={error} info={info} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              id="material-search-query"
              type="search"
              value={materialSearchQuery}
              onChange={(e) => setMaterialSearchQuery(e.target.value)}
              onKeyDown={onQueryKeyDown}
              placeholder="インデックス内で探したい内容を入力…"
              disabled={busy !== null}
              className="h-11 min-w-0 w-full text-sm sm:flex-1 sm:h-12"
              aria-label="検索クエリ"
              enterKeyHint="search"
            />
            <div className="flex shrink-0 items-end gap-2 sm:gap-3">
              <div className="grid w-fit gap-1">
                <Label
                  htmlFor="material-top-k"
                  className="text-muted-foreground text-xs leading-tight"
                  title="ベクトル類似度の上位から最大何件まで表示するか（1〜50）"
                >
                  件数
                </Label>
                <Input
                  id="material-top-k"
                  type="number"
                  min={1}
                  max={50}
                  className="h-11 w-18 sm:h-12"
                  value={materialSearchTopK}
                  onChange={(e) =>
                    setMaterialSearchTopK(Number(e.target.value) || 5)
                  }
                  disabled={busy !== null}
                />
              </div>
              <Button
                disabled={busy !== null}
                onClick={() => void onMaterialSearchClick()}
                className="h-11 shrink-0 rounded-md px-6 sm:h-12 sm:px-8"
                variant="secondary"
              >
                {busy === "materialSearch" ? "検索中…" : "検索"}
              </Button>
            </div>
          </div>
          <MaterialSearchResults
            results={materialSearchResults}
            durationMs={materialSearchMs}
          />
        </div>
      </div>
    </div>
  );
}
