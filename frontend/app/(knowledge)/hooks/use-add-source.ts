"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import {
  type ArxivPreviewEntry,
  postArxivImport,
  postArxivPreview,
  postReindex,
  postUpload,
} from "@/lib/api/data";
import { splitArxivIdsInput } from "@/lib/arxiv-input";

import type { StudioShell } from "./use-studio-shell";

const UPLOAD_PREVIEW_CHAR_LIMIT = 48_000;

export function useAddSource(
  shell: StudioShell,
  refreshStats: () => void | Promise<void>,
) {
  const { setBusy, setError, setInfo } = shell;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchArxivIds, setSearchArxivIds] = useState("");
  const [arxivSearch, setArxivSearch] = useState("");
  const [arxivMax, setArxivMax] = useState(5);
  const [arxivPreviewEntries, setArxivPreviewEntries] = useState<
    ArxivPreviewEntry[] | null
  >(null);
  const [arxivPreviewSelectedIds, setArxivPreviewSelectedIds] = useState<
    string[]
  >([]);

  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    preview: string;
    truncated: boolean;
  } | null>(null);

  const [pendingReindex, setPendingReindex] = useState(false);

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
          arxiv_ids:
            mode === "keyword" ? undefined : ids.length ? ids : undefined,
          search_query: mode === "id" ? undefined : q || undefined,
          max_results: arxivMax,
        });
        if (res.entries.length === 0) {
          setInfo("該当する論文が見つかりませんでした。");
          return true;
        }
        setArxivPreviewEntries(res.entries);
        setArxivPreviewSelectedIds(res.entries.map((e) => e.arxiv_id));
        setInfo(
          `${res.entries.length} 件を表示しました。取り込む論文にチェックを付けて取り込んでください。`,
        );
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [
      arxivMax,
      arxivSearch,
      clearArxivPreview,
      searchArxivIds,
      setBusy,
      setError,
      setInfo,
    ],
  );

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
  }, [
    arxivMax,
    arxivPreviewSelectedIds,
    clearArxivPreview,
    setBusy,
    setError,
    setInfo,
  ]);

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
    [setError, setInfo],
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
  }, [pendingUpload, setBusy, setError, setInfo]);

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
  }, [refreshStats, setBusy, setError, setInfo]);

  return {
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
  };
}
