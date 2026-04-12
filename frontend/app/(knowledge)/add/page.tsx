"use client";

import { AddSourcesPanel } from "../components/add-sources-panel";
import { useKnowledgeStudio } from "../knowledge-studio-context";

/** `/add` — 資料を追加 */
export default function AddSourcesPage() {
  const {
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
  } = useKnowledgeStudio();

  return (
    <AddSourcesPanel
      error={error}
      info={info}
      busy={busy}
      fileInputRef={fileInputRef}
      onPickUploadFile={onPickUploadFile}
      onUploadFilesDropped={onUploadFilesDropped}
      pendingUpload={pendingUpload}
      pendingBatchFiles={pendingBatchFiles}
      cancelPendingUpload={cancelPendingUpload}
      cancelPendingBatch={cancelPendingBatch}
      confirmPendingUpload={confirmPendingUpload}
      confirmPendingBatch={confirmPendingBatch}
      searchArxivIds={searchArxivIds}
      setSearchArxivIds={setSearchArxivIds}
      arxivSearch={arxivSearch}
      setArxivSearch={setArxivSearch}
      arxivMax={arxivMax}
      setArxivMax={setArxivMax}
      arxivPreviewEntries={arxivPreviewEntries}
      arxivPreviewSelectedIds={arxivPreviewSelectedIds}
      arxivImportIncludeFullText={arxivImportIncludeFullText}
      setArxivImportIncludeFullText={setArxivImportIncludeFullText}
      fetchArxivPreviewFromAddPage={fetchArxivPreviewFromAddPage}
      toggleArxivPreviewSelected={toggleArxivPreviewSelected}
      setArxivPreviewAllSelected={setArxivPreviewAllSelected}
      confirmArxivImportFromPreview={confirmArxivImportFromPreview}
      clearArxivPreview={clearArxivPreview}
      onReindexClick={onReindexClick}
    />
  );
}
