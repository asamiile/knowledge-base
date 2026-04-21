"use client";

import { useCallback, useState } from "react";
import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import { Database } from "lucide-react";

import type { ArxivPreviewEntry } from "@/lib/api/data";
import { Button } from "@/components/ui/button";

import { AddSourceArxivPreviewCard } from "./add-source-arxiv-preview-card";
import { AddSourceBatchPreviewCard } from "./add-source-batch-preview-card";
import {
  AddSourceFilePreviewCard,
  type AddSourcePendingUpload,
} from "./add-source-file-preview-card";
import { AddSourceTabs, type AddSourceMainTab } from "./add-source-tabs";
import { StudioAlerts } from "./studio-alerts";

export type AddSourcesPanelProps = {
  error: string | null;
  info: string | null;
  busy: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickUploadFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onUploadFilesDropped: (files: File[]) => void;
  pendingUpload: AddSourcePendingUpload | null;
  pendingBatchFiles: File[] | null;
  cancelPendingUpload: () => void;
  cancelPendingBatch: () => void;
  confirmPendingUpload: () => void | Promise<boolean>;
  confirmPendingBatch: () => void | Promise<boolean>;
  searchArxivIds: string;
  setSearchArxivIds: Dispatch<SetStateAction<string>>;
  arxivSearch: string;
  setArxivSearch: Dispatch<SetStateAction<string>>;
  arxivMax: number;
  setArxivMax: Dispatch<SetStateAction<number>>;
  arxivPreviewEntries: ArxivPreviewEntry[] | null;
  arxivPreviewSelectedIds: string[];
  arxivImportIncludeFullText: boolean;
  setArxivImportIncludeFullText: (v: boolean) => void;
  fetchArxivPreviewFromAddPage: (
    mode: "id" | "keyword",
  ) => void | Promise<boolean>;
  toggleArxivPreviewSelected: (arxivId: string) => void;
  setArxivPreviewAllSelected: (selected: boolean) => void;
  confirmArxivImportFromPreview: () => void | Promise<boolean>;
  clearArxivPreview: () => void;
  onReindexClick: () => void | Promise<void>;
};

/** `/add` — 資料を追加 */
export function AddSourcesPanel({
  error,
  info,
  busy,
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
  onReindexClick,
}: AddSourcesPanelProps) {
  const [addSourceMainTab, setAddSourceMainTab] =
    useState<AddSourceMainTab>("upload");

  const onAddSourceMainTabChange = useCallback(
    (value: string | number | null) => {
      if (value !== "upload" && value !== "arxiv") return;
      const next = value as AddSourceMainTab;
      setAddSourceMainTab((prev) => {
        if (prev === next) return prev;
        if (next === "arxiv") {
          cancelPendingUpload();
          cancelPendingBatch();
        } else {
          clearArxivPreview();
        }
        return next;
      });
    },
    [cancelPendingBatch, cancelPendingUpload, clearArxivPreview],
  );

  const busyUpload = busy === "upload";
  const busyArxivPreview = busy === "arxiv-preview";
  const busyArxivImport = busy === "arxiv-import";
  const busyAny = busy !== null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4">
        <StudioAlerts error={error} info={info} />

        <AddSourceTabs
          mainTab={addSourceMainTab}
          onMainTabValueChange={onAddSourceMainTabChange}
          busyAny={busyAny}
          busyArxivPreview={busyArxivPreview}
          fileInputRef={fileInputRef}
          onPickUploadFile={onPickUploadFile}
          pendingUpload={pendingUpload}
          cancelPendingUpload={cancelPendingUpload}
          searchArxivIds={searchArxivIds}
          setSearchArxivIds={setSearchArxivIds}
          arxivSearch={arxivSearch}
          setArxivSearch={setArxivSearch}
          arxivMax={arxivMax}
          setArxivMax={setArxivMax}
          fetchArxivPreviewFromAddPage={fetchArxivPreviewFromAddPage}
          onUploadFilesDropped={onUploadFilesDropped}
        />

        {addSourceMainTab === "upload" && pendingBatchFiles && (
          <AddSourceBatchPreviewCard
            files={pendingBatchFiles}
            disabled={busyAny}
            uploadBusy={busyUpload}
            onCancel={() => cancelPendingBatch()}
            onConfirm={() => void confirmPendingBatch()}
          />
        )}

        {addSourceMainTab === "upload" && pendingUpload && (
          <AddSourceFilePreviewCard
            pending={pendingUpload}
            disabled={busyAny}
            uploadBusy={busyUpload}
            onCancel={() => cancelPendingUpload()}
            onConfirm={() => void confirmPendingUpload()}
          />
        )}

        {addSourceMainTab === "arxiv" &&
          arxivPreviewEntries &&
          arxivPreviewEntries.length > 0 && (
            <AddSourceArxivPreviewCard
              entries={arxivPreviewEntries}
              selectedIds={arxivPreviewSelectedIds}
              disabled={busyAny}
              importBusy={busyArxivImport}
              includeFullText={arxivImportIncludeFullText}
              onIncludeFullTextChange={setArxivImportIncludeFullText}
              onToggleSelected={(id) => toggleArxivPreviewSelected(id)}
              onSelectAll={(sel) => setArxivPreviewAllSelected(sel)}
              onConfirmImport={() => void confirmArxivImportFromPreview()}
            />
          )}

        <Button
          type="button"
          variant="secondary"
          disabled={busyAny}
          onClick={() => void onReindexClick()}
          className="w-fit gap-2"
        >
          <Database className="size-4" />
          {busy === "reindex" ? "更新中…" : "インデックスを更新"}
        </Button>
      </div>
    </div>
  );
}
