"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AnalyzeResponse } from "@/lib/api/analyze";
import { postAnalyze } from "@/lib/api/analyze";
import { postArxivImport, postReindex, postUpload } from "@/lib/api/data";
import type { KnowledgeStats } from "@/lib/api/knowledge";
import { getKnowledgeStats } from "@/lib/api/knowledge";
import type { KnowledgeSection } from "@/lib/knowledge-section";
import { pathToSection, sectionToPath } from "@/lib/knowledge-routes";
import {
  loadSavedArxivQueries,
  storeSavedArxivQueries,
  type SavedArxivQuery,
} from "@/lib/saved-arxiv-queries";

export function useKnowledgeStudioState() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imeComposingRef = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const activeSection = useMemo(
    () => pathToSection(pathname),
    [pathname],
  );

  const navigateToSection = useCallback(
    (section: KnowledgeSection) => {
      router.push(sectionToPath(section));
    },
    [router],
  );

  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [askOptionsOpen, setAskOptionsOpen] = useState(false);
  const askOptionsTriggerRef = useRef<HTMLButtonElement>(null);
  const askOptionsPanelRef = useRef<HTMLDivElement>(null);
  const [askOptionsCoords, setAskOptionsCoords] = useState<{
    left: number;
    bottom: number;
  } | null>(null);

  const [arxivIds, setArxivIds] = useState("");

  /** アップロード / arXiv 取り込み後、DB が DATA_DIR とずれている可能性があるとき true（再インデックスボタン用） */
  const [pendingReindex, setPendingReindex] = useState(false);

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

  // アップロード等の「完了」やエラーを画面間で共有しない（/add のメッセージが /search に残らないようにする）
  useEffect(() => {
    setInfo(null);
    setError(null);
  }, [pathname]);

  useLayoutEffect(() => {
    if (!askOptionsOpen) {
      setAskOptionsCoords(null);
      return;
    }
    const panelW = 320;
    const gap = 8;
    const update = () => {
      const el = askOptionsTriggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const left = Math.min(
        rect.left,
        Math.max(gap, window.innerWidth - panelW - gap),
      );
      setAskOptionsCoords({
        left,
        bottom: window.innerHeight - rect.top + gap,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [askOptionsOpen]);

  useEffect(() => {
    if (!askOptionsOpen) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (askOptionsTriggerRef.current?.contains(t)) return;
      if (askOptionsPanelRef.current?.contains(t)) return;
      setAskOptionsOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAskOptionsOpen(false);
    };
    document.addEventListener("pointerdown", onDoc, true);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", onDoc, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, [askOptionsOpen]);

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
        if (res.written.length > 0) {
          setPendingReindex(true);
        }
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
        reindex_sources: false,
        top_k: topK,
      });
      setResult(data);
      setLatencyMs(Math.round(performance.now() - t0));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [question, topK]);

  const submitAnalyze = useCallback(() => {
    if (busy !== null || !question.trim()) return;
    setAskOptionsOpen(false);
    void onAnalyze();
  }, [busy, question, onAnalyze]);

  const onUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      setError(null);
      setInfo(null);
      setBusy("upload");
      try {
        const res = await postUpload(f);
        setInfo(`保存: ${res.path}（${res.size_bytes} bytes）`);
        setPendingReindex(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  /** `/add` — ID のみ（検索クエリは `/search`） */
  const onArxivImportClick = useCallback(async () => {
    await runArxivImport({
      arxivIdsText: arxivIds,
      searchText: "",
      maxResults: 5,
    });
  }, [arxivIds, runArxivImport]);

  /** `/search` フォームの ID・検索クエリ・max_results で取得（保存不要） */
  const onArxivImportFromSearchForm = useCallback(async () => {
    await runArxivImport({
      arxivIdsText: newSavedIds,
      searchText: newSavedSearch,
      maxResults: newSavedMax,
    });
  }, [newSavedIds, newSavedSearch, newSavedMax, runArxivImport]);

  const onReindexClick = useCallback(async () => {
    setError(null);
    setInfo(null);
    setBusy("reindex");
    try {
      const res = await postReindex();
      setPendingReindex(false);
      setInfo(
        `インデックス更新: チャンク ${res.document_chunks} 件・raw_data ${res.raw_data_rows} 行`,
      );
      void refreshStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [refreshStats]);

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

  return {
    activeSection,
    navigateToSection,
    stats,
    statsLoading,
    refreshStats,
    busy,
    error,
    info,
    fileInputRef,
    onUpload,
    arxivIds,
    setArxivIds,
    onArxivImportClick,
    onArxivImportFromSearchForm,
    pendingReindex,
    onReindexClick,
    savedQueries,
    newSavedName,
    setNewSavedName,
    newSavedIds,
    setNewSavedIds,
    newSavedSearch,
    setNewSavedSearch,
    newSavedMax,
    setNewSavedMax,
    addSavedQuery,
    runSaved,
    deleteSaved,
    imeComposingRef,
    question,
    setQuestion,
    topK,
    setTopK,
    result,
    statsRows,
    askOptionsOpen,
    setAskOptionsOpen,
    askOptionsTriggerRef,
    askOptionsPanelRef,
    askOptionsCoords,
    submitAnalyze,
  };
}

export type KnowledgeStudioValue = ReturnType<typeof useKnowledgeStudioState>;
