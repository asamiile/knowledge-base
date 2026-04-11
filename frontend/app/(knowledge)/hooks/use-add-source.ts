"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

import {
  type ArxivPreviewEntry,
  type DataFileInfo,
  getDataFiles,
  postArxivImport,
  postArxivPreview,
  postReindex,
  postUpload,
} from "@/lib/api/data";
import { splitArxivIdsInput } from "@/lib/arxiv-input";
import {
  getAutoReindexAfterImport,
  setAutoReindexAfterImport as persistAutoReindex,
} from "@/lib/preferences";

import type { StudioShell } from "./use-studio-shell";

const UPLOAD_PREVIEW_CHAR_LIMIT = 48_000;

const ALLOWED_EXT = new Set([".md", ".txt", ".json", ".pdf"]);

function allowedUploadFile(f: File): boolean {
  const n = f.name.toLowerCase();
  const i = n.lastIndexOf(".");
  if (i < 0) return false;
  return ALLOWED_EXT.has(n.slice(i));
}

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
  const [arxivImportIncludeFullText, setArxivImportIncludeFullText] =
    useState(false);

  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    preview: string;
    truncated: boolean;
  } | null>(null);
  const [pendingBatchFiles, setPendingBatchFiles] = useState<File[] | null>(
    null,
  );

  const [pendingReindex, setPendingReindex] = useState(false);
  const [reindexDialogOpen, setReindexDialogOpen] = useState(false);
  const [autoReindexAfterImport, setAutoReindexAfterImportState] =
    useState(false);
  const [sourceFiles, setSourceFiles] = useState<DataFileInfo[] | null>(null);

  useEffect(() => {
    setAutoReindexAfterImportState(getAutoReindexAfterImport());
  }, []);

  const refreshSourceFiles = useCallback(async () => {
    try {
      setSourceFiles(await getDataFiles(2000));
    } catch {
      setSourceFiles(null);
    }
  }, []);

  useEffect(() => {
    void refreshSourceFiles();
  }, [refreshSourceFiles]);

  const setAutoReindexAfterImport = useCallback((v: boolean) => {
    setAutoReindexAfterImportState(v);
    persistAutoReindex(v);
  }, []);

  const clearArxivPreview = useCallback(() => {
    setArxivPreviewEntries(null);
    setArxivPreviewSelectedIds([]);
  }, []);

  const runReindexNow = useCallback(async () => {
    setError(null);
    setInfo(null);
    setBusy("reindex");
    try {
      const res = await postReindex();
      setPendingReindex(false);
      setReindexDialogOpen(false);
      setInfo(
        `Index updated: chunks ${res.document_chunks}, raw_data ${res.raw_data_rows}`,
      );
      void refreshStats();
      await refreshSourceFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [refreshSourceFiles, refreshStats, setBusy, setError, setInfo]);

  const afterNewFilesOnDisk = useCallback(async () => {
    await refreshSourceFiles();
    if (getAutoReindexAfterImport()) {
      await runReindexNow();
    } else {
      setPendingReindex(true);
      setReindexDialogOpen(true);
    }
  }, [refreshSourceFiles, runReindexNow]);

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
        include_full_text: arxivImportIncludeFullText,
      });
      setInfo(
        `取得: ${res.entry_count} 件 → ${res.written.join(", ") || "(ファイルなし)"}`,
      );
      clearArxivPreview();
      if (res.written.length > 0) {
        await afterNewFilesOnDisk();
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  }, [
    afterNewFilesOnDisk,
    arxivImportIncludeFullText,
    arxivMax,
    arxivPreviewSelectedIds,
    clearArxivPreview,
    setBusy,
    setError,
    setInfo,
  ]);

  const onPickUploadFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      e.target.value = "";
      if (!list?.length) return;
      const files = Array.from(list).filter(allowedUploadFile);
      if (files.length === 0) {
        setError(".md / .txt / .json / .pdf のファイルを選んでください。");
        return;
      }
      setError(null);
      setInfo(null);
      setPendingBatchFiles(null);
      if (files.length > 1) {
        setPendingUpload(null);
        setPendingBatchFiles(files);
        return;
      }
      const f = files[0]!;
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

  const onUploadFilesDropped = useCallback(
    (files: File[]) => {
      const ok = files.filter(allowedUploadFile);
      if (ok.length === 0) {
        setError(".md / .txt / .json / .pdf のファイルをドロップしてください。");
        return;
      }
      setError(null);
      setInfo(null);
      setPendingUpload(null);
      if (ok.length === 1) {
        void (async () => {
          try {
            const f = ok[0]!;
            const text = await f.text();
            const truncated = text.length > UPLOAD_PREVIEW_CHAR_LIMIT;
            const preview = truncated
              ? text.slice(0, UPLOAD_PREVIEW_CHAR_LIMIT)
              : text;
            setPendingUpload({ file: f, preview, truncated });
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        })();
      } else {
        setPendingBatchFiles(ok);
      }
    },
    [setError, setInfo],
  );

  const cancelPendingUpload = useCallback(() => {
    setPendingUpload(null);
  }, []);

  const cancelPendingBatch = useCallback(() => {
    setPendingBatchFiles(null);
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
        await afterNewFilesOnDisk();
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  }, [afterNewFilesOnDisk, pendingUpload, setBusy, setError, setInfo]);

  const confirmPendingBatch = useCallback(async () => {
    if (!pendingBatchFiles?.length) return false;
    setError(null);
    setInfo(null);
    setBusy("upload");
    const paths: string[] = [];
    try {
      for (const file of pendingBatchFiles) {
        const res = await postUpload(file);
        paths.push(res.path);
      }
      setPendingBatchFiles(null);
      setInfo(
        `${paths.length} 件を保存しました（${paths.slice(0, 2).join(", ")}${paths.length > 2 ? "…" : ""}）`,
      );
      if (paths.length > 0) {
        await afterNewFilesOnDisk();
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(null);
    }
  }, [afterNewFilesOnDisk, pendingBatchFiles, setBusy, setError, setInfo]);

  const onReindexClick = useCallback(async () => {
    await runReindexNow();
  }, [runReindexNow]);

  const onCancelReindexDialog = useCallback(() => {
    setReindexDialogOpen(false);
  }, []);

  return {
    fileInputRef,
    onPickUploadFile,
    onUploadFilesDropped,
    pendingUpload,
    pendingBatchFiles,
    cancelPendingUpload,
    cancelPendingBatch,
    confirmPendingUpload,
    confirmPendingBatch,
    searchArxivIds,
    setSearchArxivIds,
    arxivSearch,
    setArxivSearch,
    arxivMax,
    setArxivMax,
    arxivPreviewEntries,
    arxivPreviewSelectedIds,
    arxivImportIncludeFullText,
    setArxivImportIncludeFullText,
    fetchArxivPreviewFromAddPage,
    toggleArxivPreviewSelected,
    setArxivPreviewAllSelected,
    confirmArxivImportFromPreview,
    clearArxivPreview,
    pendingReindex,
    onReindexClick,
    reindexDialogOpen,
    setReindexDialogOpen,
    onConfirmReindexDialog: runReindexNow,
    onCancelReindexDialog,
    autoReindexAfterImport,
    setAutoReindexAfterImport,
    sourceFiles,
    refreshSourceFiles,
  };
}
