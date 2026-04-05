"use client";

import { createPortal } from "react-dom";
import { ArrowUp, Loader2, SlidersHorizontal } from "lucide-react";

import { useKnowledgeStudio } from "./knowledge-studio-context";
import {
  SeparatedResults,
  SeparatedResultsList,
} from "./components/separated-results";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { downloadJson } from "@/lib/download-json";

/** `/` — 質問（RAG 分析） */
export default function AskPage() {
  const {
    error,
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
  } = useKnowledgeStudio();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-4 pb-10">
          {error && (
            <Alert variant="error">
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription className="font-mono text-xs break-all">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-heading text-muted-foreground text-sm font-medium">
                  回答
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    downloadJson(
                      `analyze-${new Date().toISOString().slice(0, 19)}.json`,
                      result,
                    )
                  }
                >
                  JSON をダウンロード
                </Button>
              </div>

              <SeparatedResults>
                <section aria-labelledby="ask-metrics-heading">
                  <h3
                    id="ask-metrics-heading"
                    className="font-heading pb-2 text-base font-medium"
                  >
                    メトリクス
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>項目</TableHead>
                        <TableHead>値</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statsRows.map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="text-muted-foreground">
                            {row.label}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.value}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>

                <section aria-label="回答本文">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {result.answer}
                  </p>
                </section>

                <section aria-labelledby="ask-points-heading">
                  <h3
                    id="ask-points-heading"
                    className="font-heading pb-2 text-base font-medium"
                  >
                    ポイント
                  </h3>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                    {result.key_points.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="ask-citations-heading">
                  <h3
                    id="ask-citations-heading"
                    className="font-heading pb-2 text-base font-medium"
                  >
                    引用
                  </h3>
                  <SeparatedResultsList
                    items={result.citations}
                    keyExtractor={(_, i) => i}
                    renderItem={(c) => (
                      <article>
                        <span className="font-mono text-muted-foreground text-xs">
                          doc #{c.document_id}
                        </span>
                        <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                          {c.excerpt}
                        </p>
                      </article>
                    )}
                  />
                </section>
              </SeparatedResults>
            </>
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
