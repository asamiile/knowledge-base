"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AnalyzeResponse } from "@/lib/api/analyze";
import { postAnalyze } from "@/lib/api/analyze";
import {
  type ArxivPreviewEntry,
  postArxivImport,
  postArxivPreview,
  postReindex,
  postUpload,
} from "@/lib/api/data";
import type { KnowledgeStats, MaterialSearchHit } from "@/lib/api/knowledge";
import { getKnowledgeStats, postKnowledgeSearch } from "@/lib/api/knowledge";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  patchSavedSearch,
  type PeriodicSavedSearchTarget,
} from "@/lib/api/saved-searches";
import type { KnowledgeSection } from "@/lib/knowledge-section";
import { pathToSection, sectionToPath } from "@/lib/knowledge-routes";
import { splitArxivIdsInput } from "@/lib/arxiv-input";
import {
  loadSavedMaterialSearches,
  SAVED_SEARCHES_MIGRATED_TO_DB_KEY,
  savedSearchRowToClient,
  storeSavedMaterialSearches,
  type SavedMaterialSearch,
} from "@/lib/saved-material-searches";

const UPLOAD_PREVIEW_CHAR_LIMIT = 48_000;

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

  /** `/add` の arXiv 取り込みフォーム（ID・キーワード・max_results） */
  const [searchArxivIds, setSearchArxivIds] = useState("");
  const [arxivSearch, setArxivSearch] = useState("");
  const [arxivMax, setArxivMax] = useState(5);
  const [arxivPreviewEntries, setArxivPreviewEntries] = useState<
    ArxivPreviewEntry[] | null
  >(null);
  /** 取り込み対象として選択中の arxiv_id */
  const [arxivPreviewSelectedIds, setArxivPreviewSelectedIds] = useState<
    string[]
  >([]);

  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    preview: string;
    truncated: boolean;
  } | null>(null);

  const [pendingReindex, setPendingReindex] = useState(false);

  const [materialSearchQuery, setMaterialSearchQuery] = useState("");
  const [materialSearchTopK, setMaterialSearchTopK] = useState(5);
  const [materialSearchResults, setMaterialSearchResults] = useState<
    MaterialSearchHit[] | null
  >(null);
  const [materialSearchMs, setMaterialSearchMs] = useState<number | null>(null);

  const [savedMaterialSearches, setSavedMaterialSearches] = useState<
    SavedMaterialSearch[]
  >([]);
  const [saveMaterialName, setSaveMaterialName] = useState("Untitled");
  const [saveMaterialArxivIds, setSaveMaterialArxivIds] = useState("");
  const [saveMaterialArxivKeyword, setSaveMaterialArxivKeyword] =
    useState("");
  const [saveMaterialTopK, setSaveMaterialTopK] = useState(5);
  const [saveMaterialIntervalMinutes, setSaveMaterialIntervalMinutes] =
    useState(0);
  const [saveMaterialScheduleEnabled, setSaveMaterialScheduleEnabled] =
    useState(false);
  const [saveMaterialSearchTarget, setSaveMaterialSearchTarget] =
    useState<PeriodicSavedSearchTarget>("arxiv");

  const busyRef = useRef(busy);
  busyRef.current = busy;
  const savedMaterialRef = useRef(savedMaterialSearches);
  savedMaterialRef.current = savedMaterialSearches;
  const silentScheduleLock = useRef(false);

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
    let cancelled = false;
    (async () => {
      try {
        let rows = await listSavedSearches();
        if (
          !cancelled &&
          rows.length === 0 &&
          typeof window !== "undefined" &&
          !localStorage.getItem(SAVED_SEARCHES_MIGRATED_TO_DB_KEY)
        ) {
          const legacy = loadSavedMaterialSearches();
          if (legacy.length > 0) {
            for (const item of legacy) {
              if (cancelled) return;
              const created = await createSavedSearch({
                name: item.name,
                query: item.query,
                arxiv_ids: item.arxivIds ?? [],
                search_target: item.searchTarget ?? "knowledge",
                top_k: item.topK,
                interval_minutes: item.intervalMinutes,
                schedule_enabled:
                  item.scheduleEnabled && item.intervalMinutes > 0,
              });
              if (item.lastRunAt) {
                try {
                  await patchSavedSearch(created.id, {
                    last_run_at: item.lastRunAt,
                  });
                } catch {
                  /* 移行時はベストエフォート */
                }
              }
            }
            if (!cancelled) {
              storeSavedMaterialSearches([]);
              localStorage.setItem(SAVED_SEARCHES_MIGRATED_TO_DB_KEY, "1");
              rows = await listSavedSearches();
            }
          }
        }
        if (!cancelled) {
          setSavedMaterialSearches(rows.map(savedSearchRowToClient));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  /** 保存条件の定期検索（ブラウザ起動中。手動 `busy` と競合時はスキップ） */
  useEffect(() => {
    const runDue = async () => {
      if (busyRef.current !== null || silentScheduleLock.current) return;
      const now = Date.now();
      const list = savedMaterialRef.current;
      const item = list.find((s) => {
        if (!s.scheduleEnabled || s.intervalMinutes <= 0) return false;
        const hasInput =
          (s.searchTarget ?? "knowledge") === "arxiv"
            ? s.query.trim().length > 0 || (s.arxivIds?.length ?? 0) > 0
            : s.query.trim().length > 0;
        if (!hasInput) return false;
        return (
          !s.lastRunAt ||
          now - new Date(s.lastRunAt).getTime() >= s.intervalMinutes * 60_000
        );
      });
      if (!item) return;

      silentScheduleLock.current = true;
      try {
        if ((item.searchTarget ?? "knowledge") === "arxiv") {
          const ids = item.arxivIds ?? [];
          const q = item.query.trim();
          await postArxivPreview({
            arxiv_ids: ids.length > 0 ? ids : undefined,
            search_query: q || undefined,
            max_results: item.topK,
          });
        } else {
          await postKnowledgeSearch({
            query: item.query.trim(),
            top_k: item.topK,
          });
        }
        const ts = new Date().toISOString();
        try {
          const row = await patchSavedSearch(item.id, { last_run_at: ts });
          const mapped = savedSearchRowToClient(row);
          setSavedMaterialSearches((prev) =>
            prev.map((x) => (x.id === item.id ? mapped : x)),
          );
        } catch {
          setSavedMaterialSearches((prev) =>
            prev.map((x) =>
              x.id === item.id ? { ...x, lastRunAt: ts } : x,
            ),
          );
        }
      } catch {
        /* サイレント失敗（コンソールに出さず UI は既存エラーと分離） */
      } finally {
        silentScheduleLock.current = false;
      }
    };

    const id = window.setInterval(() => {
      void runDue();
    }, 30_000);
    void runDue();
    return () => clearInterval(id);
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

  const clearArxivPreview = useCallback(() => {
    setArxivPreviewEntries(null);
    setArxivPreviewSelectedIds([]);
  }, []);

  const toggleArxivPreviewSelected = useCallback((arxivId: string) => {
    setArxivPreviewSelectedIds((prev) =>
      prev.includes(arxivId)
        ? prev.filter((x) => x !== arxivId)
        : [...prev, arxivId],
    );
  }, []);

  const setArxivPreviewAllSelected = useCallback(
    (selected: boolean) => {
      setArxivPreviewSelectedIds(() => {
        if (!arxivPreviewEntries?.length) return [];
        return selected
          ? arxivPreviewEntries.map((e) => e.arxiv_id)
          : [];
      });
    },
    [arxivPreviewEntries],
  );

  /** `/add` — プレビュー取得（保存しない） */
  const fetchArxivPreviewFromAddPage = useCallback(
    async (mode: "id" | "keyword") => {
      setError(null);
      setInfo(null);
      clearArxivPreview();
      const ids = splitArxivIdsInput(searchArxivIds);
      const q = arxivSearch.trim();
      if (mode === "id") {
        if (ids.length === 0) {
          setError("論文IDを1件以上入力してください。");
          return false;
        }
      } else if (!q) {
        setError("キーワードを入力してください。");
        return false;
      }
      setBusy("arxiv-preview");
      try {
        const res = await postArxivPreview({
          arxiv_ids: mode === "keyword" ? undefined : ids.length ? ids : undefined,
          search_query: mode === "id" ? undefined : q || undefined,
          max_results: arxivMax,
        });
        if (res.entries.length === 0) {
          setInfo("該当する論文が見つかりませんでした。");
          return true;
        }
        setArxivPreviewEntries(res.entries);
        setArxivPreviewSelectedIds(res.entries.map((e) => e.arxiv_id));
        setInfo(`${res.entries.length} 件を表示しました。取り込む論文にチェックを付けて取り込んでください。`);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [
      searchArxivIds,
      arxivSearch,
      arxivMax,
      clearArxivPreview,
    ],
  );

  /** `/add` — プレビューで選んだ論文だけ保存 */
  const confirmArxivImportFromPreview = useCallback(async () => {
    setError(null);
    setInfo(null);
    if (arxivPreviewSelectedIds.length === 0) {
      setError("取り込む論文を1件以上選択してください。");
      return false;
    }
    setBusy("arxiv-import");
    try {
      const res = await postArxivImport({
        arxiv_ids: arxivPreviewSelectedIds,
        max_results: arxivMax,
      });
      setInfo(
        `取得: ${res.entry_count} 件 → ${res.written.join(", ") || "(ファイルなし)"}`,
      );
      if (res.written.length > 0) {
        setPendingReindex(true);
      }
      clearArxivPreview();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  }, [arxivPreviewSelectedIds, arxivMax, clearArxivPreview]);

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

  const onAskQuestionCompositionStart = useCallback(() => {
    imeComposingRef.current = true;
  }, []);

  const onAskQuestionCompositionEnd = useCallback(() => {
    imeComposingRef.current = false;
  }, []);

  const onAskQuestionTextareaKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      if (imeComposingRef.current || e.nativeEvent.isComposing) {
        return;
      }
      e.preventDefault();
      submitAnalyze();
    },
    [submitAnalyze],
  );

  const onPickUploadFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = "";
      if (!f) return;
      setError(null);
      setInfo(null);
      try {
        const text = await f.text();
        const truncated = text.length > UPLOAD_PREVIEW_CHAR_LIMIT;
        const preview = truncated
          ? text.slice(0, UPLOAD_PREVIEW_CHAR_LIMIT)
          : text;
        setPendingUpload({ file: f, preview, truncated });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [],
  );

  const cancelPendingUpload = useCallback(() => {
    setPendingUpload(null);
  }, []);

  const confirmPendingUpload = useCallback(async () => {
    if (!pendingUpload) return false;
    setError(null);
    setInfo(null);
    setBusy("upload");
    try {
      const res = await postUpload(pendingUpload.file);
      setInfo(`保存: ${res.path}（${res.size_bytes} bytes）`);
      setPendingUpload(null);
      if (res.path) {
        setPendingReindex(true);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  }, [pendingUpload]);

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

  const runMaterialSearchImmediate = useCallback(
    async (query: string, topKReq: number): Promise<boolean> => {
      const q = query.trim();
      if (!q) {
        setError("検索クエリを入力してください。");
        return false;
      }
      setError(null);
      setInfo(null);
      setBusy("materialSearch");
      setMaterialSearchResults(null);
      setMaterialSearchMs(null);
      const t0 = performance.now();
      try {
        const data = await postKnowledgeSearch({ query: q, top_k: topKReq });
        setMaterialSearchResults(data.hits);
        setMaterialSearchMs(Math.round(performance.now() - t0));
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

  const onMaterialSearchClick = useCallback(async () => {
    void runMaterialSearchImmediate(materialSearchQuery, materialSearchTopK);
  }, [materialSearchQuery, materialSearchTopK, runMaterialSearchImmediate]);

  const addSavedMaterialSearch = useCallback(async () => {
    const name = saveMaterialName.trim();
    if (!name) {
      setError("表示名を入力してください。");
      return;
    }
    const ids = splitArxivIdsInput(saveMaterialArxivIds);
    const kw = saveMaterialArxivKeyword.trim();
    if (ids.length === 0 && !kw) {
      setError("論文IDまたはキーワードのいずれかを入力してください。");
      return;
    }
    setError(null);
    const interval = saveMaterialIntervalMinutes;
    const scheduleOn =
      saveMaterialScheduleEnabled && interval > 0;
    setBusy("savedSearchWrite");
    try {
      const row = await createSavedSearch({
        name,
        query: kw,
        arxiv_ids: ids,
        search_target: saveMaterialSearchTarget,
        top_k: saveMaterialTopK,
        interval_minutes: interval,
        schedule_enabled: scheduleOn,
      });
      setSavedMaterialSearches((prev) => [
        ...prev,
        savedSearchRowToClient(row),
      ]);
      setSaveMaterialName("Untitled");
      setSaveMaterialArxivIds("");
      setSaveMaterialArxivKeyword("");
      setSaveMaterialTopK(5);
      setSaveMaterialIntervalMinutes(0);
      setSaveMaterialScheduleEnabled(false);
      setSaveMaterialSearchTarget("arxiv");
      setInfo(`「${name}」を保存しました。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [
    saveMaterialName,
    saveMaterialArxivIds,
    saveMaterialArxivKeyword,
    saveMaterialTopK,
    saveMaterialIntervalMinutes,
    saveMaterialScheduleEnabled,
    saveMaterialSearchTarget,
  ]);

  const runSavedMaterialSearch = useCallback(
    async (item: SavedMaterialSearch) => {
      const q = item.query.trim();
      const ids = item.arxivIds ?? [];
      if ((item.searchTarget ?? "knowledge") === "arxiv") {
        if (ids.length === 0 && !q) {
          setError("論文IDまたはキーワードのいずれかが必要です。");
          return;
        }
      } else if (!q) {
        setError("検索クエリが空です。");
        return;
      }
      setError(null);
      setInfo(null);

      if ((item.searchTarget ?? "knowledge") === "arxiv") {
        setBusy("savedSearchRun");
        try {
          const res = await postArxivPreview({
            arxiv_ids: ids.length > 0 ? ids : undefined,
            search_query: q || undefined,
            max_results: item.topK,
          });
          setInfo(
            `「${item.name}」: arXiv で ${res.entries.length} 件ヒット（プレビューのみ。取り込みは「資料を追加」の arXiv から行えます）。`,
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          return;
        } finally {
          setBusy(null);
        }
      } else {
        const ok = await runMaterialSearchImmediate(q, item.topK);
        if (!ok) return;
      }

      const ts = new Date().toISOString();
      try {
        const row = await patchSavedSearch(item.id, { last_run_at: ts });
        setSavedMaterialSearches((prev) =>
          prev.map((x) =>
            x.id === item.id ? savedSearchRowToClient(row) : x,
          ),
        );
      } catch {
        setSavedMaterialSearches((prev) =>
          prev.map((x) =>
            x.id === item.id ? { ...x, lastRunAt: ts } : x,
          ),
        );
      }
    },
    [runMaterialSearchImmediate],
  );

  const patchSavedMaterialSearch = useCallback(
    async (id: string, patch: Partial<SavedMaterialSearch>) => {
      const body: Parameters<typeof patchSavedSearch>[1] = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.query !== undefined) body.query = patch.query;
      if (patch.arxivIds !== undefined) body.arxiv_ids = patch.arxivIds;
      if (patch.topK !== undefined) body.top_k = patch.topK;
      if (patch.searchTarget !== undefined) {
        body.search_target = patch.searchTarget;
      }
      if (patch.intervalMinutes !== undefined) {
        body.interval_minutes = patch.intervalMinutes;
      }
      if (patch.scheduleEnabled !== undefined) {
        body.schedule_enabled = patch.scheduleEnabled;
      }
      if (patch.lastRunAt !== undefined) {
        body.last_run_at = patch.lastRunAt ?? null;
      }
      setError(null);
      try {
        const row = await patchSavedSearch(id, body);
        setSavedMaterialSearches((prev) =>
          prev.map((s) =>
            s.id === id ? savedSearchRowToClient(row) : s,
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [],
  );

  const deleteSavedMaterialSearch = useCallback(async (id: string) => {
    setError(null);
    try {
      await deleteSavedSearch(id);
      setSavedMaterialSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
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
    onPickUploadFile,
    pendingUpload,
    cancelPendingUpload,
    confirmPendingUpload,
    searchArxivIds,
    setSearchArxivIds,
    arxivSearch,
    setArxivSearch,
    arxivMax,
    setArxivMax,
    arxivPreviewEntries,
    arxivPreviewSelectedIds,
    fetchArxivPreviewFromAddPage,
    toggleArxivPreviewSelected,
    setArxivPreviewAllSelected,
    confirmArxivImportFromPreview,
    clearArxivPreview,
    pendingReindex,
    onReindexClick,
    materialSearchQuery,
    setMaterialSearchQuery,
    materialSearchTopK,
    setMaterialSearchTopK,
    materialSearchResults,
    materialSearchMs,
    onMaterialSearchClick,
    savedMaterialSearches,
    saveMaterialName,
    setSaveMaterialName,
    saveMaterialArxivIds,
    setSaveMaterialArxivIds,
    saveMaterialArxivKeyword,
    setSaveMaterialArxivKeyword,
    saveMaterialTopK,
    setSaveMaterialTopK,
    saveMaterialIntervalMinutes,
    setSaveMaterialIntervalMinutes,
    saveMaterialScheduleEnabled,
    setSaveMaterialScheduleEnabled,
    saveMaterialSearchTarget,
    setSaveMaterialSearchTarget,
    addSavedMaterialSearch,
    runSavedMaterialSearch,
    patchSavedMaterialSearch,
    deleteSavedMaterialSearch,
    onAskQuestionCompositionStart,
    onAskQuestionCompositionEnd,
    onAskQuestionTextareaKeyDown,
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
