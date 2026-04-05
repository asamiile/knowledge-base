"use client";

import { createPortal } from "react-dom";
import { ArrowUp, Loader2, SlidersHorizontal } from "lucide-react";
import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
  SetStateAction,
} from "react";

import type { AnalyzeResponse } from "@/lib/api/analyze";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { AskAnalyzeResult } from "./ask-analyze-result";
import { StudioAlerts } from "./studio-alerts";

export type AskAnalyzePanelProps = {
  error: string | null;
  info: string | null;
  result: AnalyzeResponse | null;
  statsRows: { label: string; value: string }[];
  question: string;
  setQuestion: Dispatch<SetStateAction<string>>;
  onAskQuestionCompositionStart: () => void;
  onAskQuestionCompositionEnd: () => void;
  onAskQuestionTextareaKeyDown: (
    e: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  busy: string | null;
  askOptionsTriggerRef: RefObject<HTMLButtonElement | null>;
  askOptionsPanelRef: RefObject<HTMLDivElement | null>;
  askOptionsOpen: boolean;
  setAskOptionsOpen: Dispatch<SetStateAction<boolean>>;
  askOptionsCoords: { left: number; bottom: number } | null;
  topK: number;
  setTopK: Dispatch<SetStateAction<number>>;
  submitAnalyze: () => void;
};

/** `/` — 質問（RAG 分析）のスクロール領域＋下部コンポーザー */
export function AskAnalyzePanel({
  error,
  info,
  result,
  statsRows,
  question,
  setQuestion,
  onAskQuestionCompositionStart,
  onAskQuestionCompositionEnd,
  onAskQuestionTextareaKeyDown,
  busy,
  askOptionsTriggerRef,
  askOptionsPanelRef,
  askOptionsOpen,
  setAskOptionsOpen,
  askOptionsCoords,
  topK,
  setTopK,
  submitAnalyze,
}: AskAnalyzePanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-4 pb-10">
          <StudioAlerts error={error} info={info} />

          {result && (
            <AskAnalyzeResult result={result} statsRows={statsRows} />
          )}
        </div>
      </div>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 pt-5 backdrop-blur md:pt-6">
        <div className="mx-auto max-w-3xl">
          <div className="border-border/80 bg-muted/40 dark:bg-muted/25 flex flex-col rounded-[1.75rem] border shadow-sm">
            <Textarea
              placeholder="知識ベースに質問…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onCompositionStart={onAskQuestionCompositionStart}
              onCompositionEnd={onAskQuestionCompositionEnd}
              onKeyDown={onAskQuestionTextareaKeyDown}
              rows={4}
              disabled={busy !== null}
              className="max-h-[min(40vh,320px)] min-h-[6.5rem] w-full resize-none border-0 bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-0.5">
              <div className="shrink-0">
                <Button
                  ref={askOptionsTriggerRef}
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  className="text-muted-foreground hover:text-foreground h-9 gap-2 rounded-full px-3 has-[>svg]:px-2.5"
                  aria-expanded={askOptionsOpen}
                  aria-haspopup="dialog"
                  aria-controls="ask-options-panel"
                  onClick={() => setAskOptionsOpen((o) => !o)}
                >
                  <SlidersHorizontal className="size-4 opacity-80" />
                  オプション
                  {topK !== 5 && (
                    <span className="bg-primary/15 text-primary rounded-full px-1.5 py-px text-[10px] font-medium tabular-nums">
                      k={topK}
                    </span>
                  )}
                </Button>
                {askOptionsOpen &&
                  askOptionsCoords &&
                  typeof document !== "undefined" &&
                  createPortal(
                    <div
                      id="ask-options-panel"
                      ref={askOptionsPanelRef}
                      role="dialog"
                      aria-label="検索オプション（top_k）"
                      className="border-border bg-popover text-popover-foreground ring-foreground/10 fixed z-[200] w-80 rounded-lg border p-3 shadow-md ring-1"
                      style={{
                        left: askOptionsCoords.left,
                        bottom: askOptionsCoords.bottom,
                      }}
                    >
                      <div className="flex flex-col gap-1.5">
                        <Label
                          htmlFor="ask-topk"
                          className="text-muted-foreground text-xs"
                        >
                          top_k（ベクトル検索件数）
                        </Label>
                        <Input
                          id="ask-topk"
                          type="number"
                          min={1}
                          max={20}
                          className="h-9 w-full rounded-lg"
                          value={topK}
                          onChange={(e) =>
                            setTopK(Number(e.target.value) || 5)
                          }
                          disabled={busy !== null}
                        />
                      </div>
                    </div>,
                    document.body,
                  )}
              </div>
              <Button
                type="button"
                size="icon-lg"
                className="size-10 shrink-0 rounded-full"
                onClick={() => submitAnalyze()}
                disabled={busy !== null || !question.trim()}
                aria-label={busy === "analyze" ? "分析中" : "分析する"}
              >
                {busy === "analyze" ? (
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                ) : (
                  <ArrowUp className="size-5" strokeWidth={2.25} aria-hidden />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
