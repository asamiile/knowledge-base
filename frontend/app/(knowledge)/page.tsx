"use client";

import { createPortal } from "react-dom";
import { ArrowUp, Loader2, SlidersHorizontal } from "lucide-react";

import { useKnowledgeStudio } from "./knowledge-studio-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const s = useKnowledgeStudio();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-4 pb-10">
          {s.error && (
            <Alert variant="destructive">
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription className="font-mono text-xs break-all">
                {s.error}
              </AlertDescription>
            </Alert>
          )}

          {s.result && (
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
                      s.result,
                    )
                  }
                >
                  JSON をダウンロード
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">メトリクス</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>項目</TableHead>
                        <TableHead>値</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.statsRows.map((row) => (
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
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {s.result.answer}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">ポイント</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                    {s.result.key_points.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">引用</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {s.result.citations.map((c, i) => (
                      <li
                        key={i}
                        className="bg-muted/50 rounded-lg border p-3"
                      >
                        <span className="font-mono text-muted-foreground text-xs">
                          doc #{c.document_id}
                        </span>
                        <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                          {c.excerpt}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 pt-5 backdrop-blur md:pt-6">
        <div className="mx-auto max-w-3xl">
          <div className="border-border/80 bg-muted/40 dark:bg-muted/25 flex flex-col rounded-[1.75rem] border shadow-sm">
            <Textarea
              placeholder="知識ベースに質問…"
              value={s.question}
              onChange={(e) => s.setQuestion(e.target.value)}
              onCompositionStart={() => {
                s.imeComposingRef.current = true;
              }}
              onCompositionEnd={() => {
                s.imeComposingRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" || e.shiftKey) return;
                if (s.imeComposingRef.current || e.nativeEvent.isComposing) {
                  return;
                }
                e.preventDefault();
                s.submitAnalyze();
              }}
              rows={4}
              disabled={s.busy !== null}
              className="max-h-[min(40vh,320px)] min-h-[6.5rem] w-full resize-none border-0 bg-transparent px-4 pt-3.5 pb-2 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm"
            />
            <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-0.5">
              <div className="shrink-0">
                <Button
                  ref={s.askOptionsTriggerRef}
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={s.busy !== null}
                  className="text-muted-foreground hover:text-foreground h-9 gap-2 rounded-full px-3 has-[>svg]:px-2.5"
                  aria-expanded={s.askOptionsOpen}
                  aria-haspopup="dialog"
                  aria-controls="ask-options-panel"
                  onClick={() => s.setAskOptionsOpen((o) => !o)}
                >
                  <SlidersHorizontal className="size-4 opacity-80" />
                  オプション
                  {s.topK !== 5 && (
                    <span className="bg-primary/15 text-primary rounded-full px-1.5 py-px text-[10px] font-medium tabular-nums">
                      k={s.topK}
                    </span>
                  )}
                </Button>
                {s.askOptionsOpen &&
                  s.askOptionsCoords &&
                  typeof document !== "undefined" &&
                  createPortal(
                    <div
                      id="ask-options-panel"
                      ref={s.askOptionsPanelRef}
                      role="dialog"
                      aria-label="検索オプション（top_k）"
                      className="border-border bg-popover text-popover-foreground ring-foreground/10 fixed z-[200] w-80 rounded-lg border p-3 shadow-md ring-1"
                      style={{
                        left: s.askOptionsCoords.left,
                        bottom: s.askOptionsCoords.bottom,
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
                          value={s.topK}
                          onChange={(e) =>
                            s.setTopK(Number(e.target.value) || 5)
                          }
                          disabled={s.busy !== null}
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
                onClick={() => s.submitAnalyze()}
                disabled={s.busy !== null || !s.question.trim()}
                aria-label={s.busy === "analyze" ? "分析中" : "分析する"}
              >
                {s.busy === "analyze" ? (
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
