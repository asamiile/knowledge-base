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

  return (
    <AddSourcesPanel
      error={error}
      info={info}
      busy={busy}
      fileInputRef={fileInputRef}
      onPickUploadFile={onPickUploadFile}
      pendingUpload={pendingUpload}
      cancelPendingUpload={cancelPendingUpload}
      confirmPendingUpload={confirmPendingUpload}
      searchArxivIds={searchArxivIds}
      setSearchArxivIds={setSearchArxivIds}
      arxivSearch={arxivSearch}
      setArxivSearch={setArxivSearch}
      arxivMax={arxivMax}
      setArxivMax={setArxivMax}
      arxivPreviewEntries={arxivPreviewEntries}
      arxivPreviewSelectedIds={arxivPreviewSelectedIds}
      fetchArxivPreviewFromAddPage={fetchArxivPreviewFromAddPage}
      toggleArxivPreviewSelected={toggleArxivPreviewSelected}
      setArxivPreviewAllSelected={setArxivPreviewAllSelected}
      confirmArxivImportFromPreview={confirmArxivImportFromPreview}
      clearArxivPreview={clearArxivPreview}
      pendingReindex={pendingReindex}
      onReindexClick={onReindexClick}
    />
  );
}
