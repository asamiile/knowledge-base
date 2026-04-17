"use client";

import { createPortal } from "react-dom";
import {
  ArrowUp,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

import type { AnalyzeResponse } from "@/lib/api/analyze";
import type { QuestionHistoryItem } from "@/lib/api/question-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { AskAnalyzeResult } from "./ask-analyze-result";
import { StudioAlerts } from "./studio-alerts";

export type AskAnalyzePanelProps = {
  error: string | null;
  info: string | null;
  result: AnalyzeResponse | null;
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
  questionHistory: QuestionHistoryItem[];
  refreshQuestionHistory: () => void | Promise<void>;
};

function QuestionAnswerPair({
  questionText,
  response,
  questionMeta,
}: {
  questionText: string;
  response: AnalyzeResponse;
  questionMeta?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Card size="sm">
        <CardContent className="space-y-2 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {questionText}
          </p>
          {questionMeta ? (
            <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-[11px] tabular-nums">
              {questionMeta}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <AskAnalyzeResult result={response} />
    </div>
  );
}


/** `/ask` — 質問（RAG 分析）のスクロール領域＋下部コンポーザー */
export function AskAnalyzePanel({
  error,
  info,
  result,
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
  questionHistory,
  refreshQuestionHistory,
}: AskAnalyzePanelProps) {
  const pendingLiveResult = useMemo(() => {
    if (!result) return null;
    const top = questionHistory[0];
    if (!top) return result;
    return JSON.stringify(result) === JSON.stringify(top.response)
      ? null
      : result;
  }, [result, questionHistory]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [questionHistory, pendingLiveResult]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollAreaRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto max-w-3xl space-y-8 pb-10">
          <StudioAlerts error={error} info={info} />

          {pendingLiveResult && (
            <QuestionAnswerPair
              questionText={question.trim() || "—"}
              response={pendingLiveResult}
            />
          )}

          {questionHistory.map((h, i) => (
            <QuestionAnswerPair
              key={h.id}
              questionText={h.question}
              response={h.response}
              questionMeta={
                <div className="flex items-center gap-0.5">
                  <time
                    className="text-muted-foreground text-[11px] tabular-nums"
                    dateTime={h.created_at}
                  >
                    {new Date(h.created_at).toLocaleString()}
                  </time>
                  {i === 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground size-7 shrink-0 rounded-md"
                      disabled={busy !== null}
                      aria-label="履歴を再取得"
                      onClick={() => void refreshQuestionHistory()}
                    >
                      <RefreshCw className="size-3.5" aria-hidden />
                    </Button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      </div>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 pt-5 backdrop-blur md:pt-6">
        <div className="mx-auto max-w-3xl">
          <Card size="sm">
            <CardContent className="space-y-3 py-4">
              <Textarea
                placeholder="知識ベースに質問…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onCompositionStart={onAskQuestionCompositionStart}
                onCompositionEnd={onAskQuestionCompositionEnd}
                onKeyDown={onAskQuestionTextareaKeyDown}
                rows={4}
                disabled={busy !== null}
                className="max-h-[min(40vh,320px)] min-h-[6.5rem] w-full resize-none border-0 bg-transparent px-0 py-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
              />
              <div className="flex items-center justify-between gap-2">
                <Button
                  ref={askOptionsTriggerRef}
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  className="text-muted-foreground hover:text-foreground h-9 gap-2 rounded-md px-3 has-[>svg]:px-2.5"
                  aria-expanded={askOptionsOpen}
                  aria-haspopup="dialog"
                  aria-controls="ask-options-panel"
                  onClick={() => setAskOptionsOpen((o) => !o)}
                >
                  <SlidersHorizontal className="size-4 opacity-80" />
                  オプション
                  {topK !== 5 && (
                    <span className="bg-primary/15 text-primary rounded px-1.5 py-px text-[10px] font-medium tabular-nums">
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
                      className="border-border bg-popover text-popover-foreground ring-foreground/10 fixed z-[200] w-80 rounded-lg border p-3 ring-1"
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
                <Button
                  type="button"
                  size="icon-lg"
                  className="size-9 shrink-0 rounded-md"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
