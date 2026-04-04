"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Upload } from "lucide-react";

import { KnowledgeAppSidebar } from "@/components/knowledge-studio/knowledge-app-sidebar";
import type { KnowledgeSection } from "@/components/knowledge-studio/types";
import { SiteHeader } from "@/components/site-header";
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
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AnalyzeResponse } from "@/lib/api/analyze";
import { postAnalyze } from "@/lib/api/analyze";
import { postArxivImport, postUpload } from "@/lib/api/data";
import type { KnowledgeStats } from "@/lib/api/knowledge";
import { getKnowledgeStats } from "@/lib/api/knowledge";
import {
  loadSavedArxivQueries,
  storeSavedArxivQueries,
  type SavedArxivQuery,
} from "@/lib/saved-arxiv-queries";

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function KnowledgeStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] =
    useState<KnowledgeSection>("ask");

  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [reindex, setReindex] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [arxivIds, setArxivIds] = useState("");
  const [arxivSearch, setArxivSearch] = useState("");
  const [arxivMax, setArxivMax] = useState(5);

  const [savedQueries, setSavedQueries] = useState<SavedArxivQuery[]>([]);
  const [newSavedName, setNewSavedName] = useState("");
  const [newSavedIds, setNewSavedIds] = useState("");
  const [newSavedSearch, setNewSavedSearch] = useState("");
  const [newSavedMax, setNewSavedMax] = useState(5);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await getKnowledgeStats();
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    setSavedQueries(loadSavedArxivQueries());
  }, []);

  const statsRows = useMemo(() => {
    if (!result) return [];
    return [
      { label: "top_k（リクエスト）", value: String(topK) },
      { label: "citations 数", value: String(result.citations.length) },
      { label: "key_points 数", value: String(result.key_points.length) },
      ...(latencyMs != null
        ? [{ label: "レイテンシ（ms）", value: String(latencyMs) }]
        : []),
    ];
  }, [result, topK, latencyMs]);

  const runArxivImport = useCallback(
    async (args: {
      arxivIdsText: string;
      searchText: string;
      maxResults: number;
    }) => {
      setError(null);
      setInfo(null);
      const ids = args.arxivIdsText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const q = args.searchText.trim();
      if (ids.length === 0 && !q) {
        setError("arXiv ID または検索クエリを指定してください。");
        return false;
      }
      setBusy("arxiv");
      try {
        const res = await postArxivImport({
          arxiv_ids: ids.length ? ids : undefined,
          search_query: q || undefined,
          max_results: args.maxResults,
        });
        setInfo(
          `取得: ${res.entry_count} 件 → ${res.written.join(", ") || "(ファイルなし)"}`,
        );
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const onAnalyze = useCallback(async () => {
    setError(null);
    setInfo(null);
    setBusy("analyze");
    setResult(null);
    setLatencyMs(null);
    const t0 = performance.now();
    try {
      const data = await postAnalyze({
        question: question.trim(),
        reindex_sources: reindex,
        top_k: topK,
      });
      setResult(data);
      setLatencyMs(Math.round(performance.now() - t0));
      if (reindex) void refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [question, reindex, topK, refreshStats]);

  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      setError(null);
      setInfo(null);
      setBusy("upload");
      try {
        const res = await postUpload(f);
        setInfo(`保存: ${res.path}（${res.size_bytes} bytes）`);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const onArxivImportClick = useCallback(async () => {
    await runArxivImport({
      arxivIdsText: arxivIds,
      searchText: arxivSearch,
      maxResults: arxivMax,
    });
  }, [arxivIds, arxivSearch, arxivMax, runArxivImport]);

  const addSavedQuery = useCallback(() => {
    const name = newSavedName.trim();
    if (!name) {
      setError("定期用クエリの名前を入力してください。");
      return;
    }
    const idsSnip = newSavedIds.trim();
    const q = newSavedSearch.trim();
    if (!idsSnip && !q) {
      setError("ID または検索クエリのどちらかを入力してください。");
      return;
    }
    setError(null);
    const item: SavedArxivQuery = {
      id: crypto.randomUUID(),
      name,
      arxivIds: newSavedIds,
      searchQuery: newSavedSearch,
      maxResults: newSavedMax,
    };
    setSavedQueries((prev) => {
      const next = [...prev, item];
      storeSavedArxivQueries(next);
      return next;
    });
    setNewSavedName("");
    setNewSavedIds("");
    setNewSavedSearch("");
    setNewSavedMax(5);
    setInfo(`「${name}」を保存しました。`);
  }, [newSavedName, newSavedIds, newSavedSearch, newSavedMax]);

  const runSaved = useCallback(
    async (item: SavedArxivQuery) => {
      const ok = await runArxivImport({
        arxivIdsText: item.arxivIds,
        searchText: item.searchQuery,
        maxResults: item.maxResults,
      });
      if (!ok) return;
      const ts = new Date().toISOString();
      setSavedQueries((prev) => {
        const next = prev.map((s) =>
          s.id === item.id ? { ...s, lastRunAt: ts } : s,
        );
        storeSavedArxivQueries(next);
        return next;
      });
    },
    [runArxivImport],
  );

  const deleteSaved = useCallback((id: string) => {
    setSavedQueries((prev) => {
      const next = prev.filter((s) => s.id !== id);
      storeSavedArxivQueries(next);
      return next;
    });
  }, []);

  return (
    <SidebarProvider className="bg-background h-full min-h-0 w-full flex-1 overflow-hidden [--header-height:theme(spacing.14)]">
      <KnowledgeAppSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        stats={stats}
        statsLoading={statsLoading}
        busy={busy}
        onRefreshStats={() => void refreshStats()}
      />
      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6 @container/main">
          {activeSection === "ask" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto max-w-3xl space-y-4">
                  {stats && stats.document_chunks === 0 && (
                    <Alert>
                      <AlertTitle>インデックスが空です</AlertTitle>
                      <AlertDescription>
                        左の「資料を追加」でファイルや arXiv を入れ、下のフォームで
                        <strong> データを再インデックス </strong>
                        にチェックしてから分析してください。
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertTitle>エラー</AlertTitle>
                      <AlertDescription className="font-mono text-xs break-all">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  {info && !error && (
                    <Alert>
                      <AlertTitle>完了</AlertTitle>
                      <AlertDescription>{info}</AlertDescription>
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
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {result.answer}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">ポイント</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                            {result.key_points.map((k, i) => (
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
                            {result.citations.map((c, i) => (
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

              <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 shrink-0 backdrop-blur">
                <div className="mx-auto max-w-3xl space-y-3">
                  <Textarea
                    placeholder="質問を入力"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    rows={3}
                    disabled={busy !== null}
                    className="min-h-[88px] resize-y rounded-2xl"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="reindex"
                          checked={reindex}
                          onCheckedChange={(v) => setReindex(Boolean(v))}
                          disabled={busy !== null}
                        />
                        <Label htmlFor="reindex" className="font-normal text-sm">
                          再インデックス
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="topk" className="text-sm">
                          top_k
                        </Label>
                        <Input
                          id="topk"
                          type="number"
                          min={1}
                          max={20}
                          className="w-14"
                          value={topK}
                          onChange={(e) =>
                            setTopK(Number(e.target.value) || 5)
                          }
                          disabled={busy !== null}
                        />
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="rounded-xl px-6"
                      onClick={() => void onAnalyze()}
                      disabled={busy !== null || !question.trim()}
                    >
                      {busy === "analyze" ? "分析中…" : "分析する"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "sources" && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto max-w-3xl space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>エラー</AlertTitle>
                    <AlertDescription className="font-mono text-xs break-all">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                {info && !error && (
                  <Alert>
                    <AlertTitle>完了</AlertTitle>
                    <AlertDescription>{info}</AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>ファイルアップロード</CardTitle>
                    <CardDescription>
                      <code className="text-xs">data/uploads/</code>{" "}
                      へ保存（.md / .txt /
                      .json）。質問画面で再インデックスが必要です。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.txt,.json,text/markdown,text/plain,application/json"
                      onChange={onUpload}
                      disabled={busy !== null}
                      className="sr-only"
                    />
                    <Button
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-fit rounded-xl"
                    >
                      <Upload className="size-4" />
                      ファイルを選択
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>arXiv 取り込み</CardTitle>
                    <CardDescription>
                      <code className="text-xs">data/imports/arxiv/*.md</code>{" "}
                      に保存
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <Label>arXiv ID</Label>
                      <Textarea
                        value={arxivIds}
                        onChange={(e) => setArxivIds(e.target.value)}
                        rows={2}
                        placeholder="2301.00001 または https://arxiv.org/abs/..."
                        disabled={busy !== null}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>検索クエリ（任意）</Label>
                      <Input
                        value={arxivSearch}
                        onChange={(e) => setArxivSearch(e.target.value)}
                        placeholder="例: video diffusion"
                        disabled={busy !== null}
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
                          value={arxivMax}
                          onChange={(e) =>
                            setArxivMax(Number(e.target.value) || 5)
                          }
                          disabled={busy !== null}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        disabled={busy !== null}
                        onClick={() => void onArxivImportClick()}
                        className="rounded-xl"
                      >
                        {busy === "arxiv" ? "取得中…" : "arXiv から取得"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeSection === "schedule" && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="mx-auto max-w-3xl space-y-4">
                <Alert>
                  <AlertTitle>手動実行（MVP）</AlertTitle>
                  <AlertDescription>
                    保存したクエリは localStorage のみ。定期は cron 等から{" "}
                    <code className="text-xs">POST /api/data/imports/arxiv</code>
                  </AlertDescription>
                </Alert>

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>エラー</AlertTitle>
                    <AlertDescription className="font-mono text-xs break-all">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                {info && !error && (
                  <Alert>
                    <AlertTitle>完了</AlertTitle>
                    <AlertDescription>{info}</AlertDescription>
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>クエリを保存</CardTitle>
                    <CardDescription>
                      「今すぐ取得」で arXiv を再取得できます
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="grid gap-2">
                      <Label>表示名</Label>
                      <Input
                        value={newSavedName}
                        onChange={(e) => setNewSavedName(e.target.value)}
                        placeholder="例: 週次サーベイ"
                        disabled={busy !== null}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>arXiv ID（複数可）</Label>
                      <Textarea
                        value={newSavedIds}
                        onChange={(e) => setNewSavedIds(e.target.value)}
                        rows={2}
                        disabled={busy !== null}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>検索クエリ</Label>
                      <Input
                        value={newSavedSearch}
                        onChange={(e) => setNewSavedSearch(e.target.value)}
                        disabled={busy !== null}
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
                          value={newSavedMax}
                          onChange={(e) =>
                            setNewSavedMax(Number(e.target.value) || 5)
                          }
                          disabled={busy !== null}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        disabled={busy !== null}
                        onClick={addSavedQuery}
                        className="rounded-xl"
                      >
                        保存
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="font-heading text-sm font-medium">
                    保存済み（{savedQueries.length}）
                  </h3>
                  {savedQueries.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      まだありません。
                    </p>
                  ) : (
                    savedQueries.map((item) => (
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
                                  {new Date(item.lastRunAt).toLocaleString(
                                    "ja-JP",
                                  )}
                                </p>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              size="sm"
                              className="rounded-lg"
                              disabled={busy !== null}
                              onClick={() => void runSaved(item)}
                            >
                              今すぐ取得
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy !== null}
                              onClick={() => deleteSaved(item.id)}
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
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
