"use client";

import { useCallback, useState } from "react";
import { Database } from "lucide-react";

import { AddSourceArxivPreviewCard } from "../components/add-source-arxiv-preview-card";
import { AddSourceFilePreviewCard } from "../components/add-source-file-preview-card";
import {
  AddSourceTabs,
  type AddSourceMainTab,
} from "../components/add-source-tabs";
import { StudioAlerts } from "../components/studio-alerts";
import { useKnowledgeStudio } from "../knowledge-studio-context";
import { Button } from "@/components/ui/button";

/** `/add` — 資料を追加 */
export default function AddSourcesPage() {
  const {
    error,
    info,
    busy,
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
  } = useKnowledgeStudio();

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
        } else {
          clearArxivPreview();
        }
        return next;
      });
    },
    [cancelPendingUpload, clearArxivPreview],
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
        />

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
              onToggleSelected={(id) => toggleArxivPreviewSelected(id)}
              onSelectAll={(sel) => setArxivPreviewAllSelected(sel)}
              onClose={() => clearArxivPreview()}
              onConfirmImport={() => void confirmArxivImportFromPreview()}
            />
          )}

        <Button
          disabled={busyAny || !pendingReindex}
          onClick={() => void onReindexClick()}
          className="w-fit rounded-xl gap-2"
          title={
            !pendingReindex && busy === null
              ? "ファイルのアップロードまたは arXiv 取り込み（ファイル保存）のあとに実行できます"
              : undefined
          }
        >
          <Database className="size-4" />
          {busy === "reindex" ? "更新中…" : "インデックスを更新"}
        </Button>
      </div>
    </div>
  );
}
