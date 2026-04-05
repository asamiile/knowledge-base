"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  patchSavedSearch,
  type PeriodicSavedSearchTarget,
} from "@/lib/api/saved-searches";
import { postArxivPreview } from "@/lib/api/data";
import { postKnowledgeSearch } from "@/lib/api/knowledge";
import { splitArxivIdsInput } from "@/lib/arxiv-input";
import {
  loadSavedMaterialSearches,
  SAVED_SEARCHES_MIGRATED_TO_DB_KEY,
  savedSearchRowToClient,
  storeSavedMaterialSearches,
  type SavedMaterialSearch,
} from "@/lib/saved-material-searches";

import type { StudioShell } from "./use-studio-shell";

export function useSavedSearches(
  shell: StudioShell,
  runMaterialSearchImmediate: (
    query: string,
    topKReq: number,
  ) => Promise<boolean>,
) {
  const { busy, setBusy, setError, setInfo } = shell;

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
  }, [setError]);

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
        /* サイレント失敗 */
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
    const scheduleOn = saveMaterialScheduleEnabled && interval > 0;
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
    setBusy,
    setError,
    setInfo,
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
    [
      runMaterialSearchImmediate,
      setBusy,
      setError,
      setInfo,
    ],
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
    [setError],
  );

  const deleteSavedMaterialSearch = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await deleteSavedSearch(id);
        setSavedMaterialSearches((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [setError],
  );

  return {
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
  };
}
