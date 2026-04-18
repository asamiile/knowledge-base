"use client";

import { useAddSource } from "./hooks/use-add-source";
import { useAskAnalyze } from "./hooks/use-ask-analyze";
import { useKnowledgeStats } from "./hooks/use-knowledge-stats";
import { useMaterialSearch } from "./hooks/use-material-search";
import { useSavedSearches } from "./hooks/use-saved-searches";
import { useStudioNavigation } from "./hooks/use-studio-navigation";
import { useStudioShell } from "./hooks/use-studio-shell";

export function useKnowledgeStudioState() {
  const { pathname, activeSection, navigateToSection } = useStudioNavigation();
  const shell = useStudioShell(pathname);
  const { stats, statsLoading, refreshStats } = useKnowledgeStats();
  const material = useMaterialSearch(shell);
  const addSource = useAddSource(shell, refreshStats);
  const saved = useSavedSearches(shell, material.runMaterialSearchImmediate);
  const ask = useAskAnalyze(shell);

  const { busy, error, info } = shell;

  return {
    activeSection,
    navigateToSection,
    stats,
    statsLoading,
    refreshStats,
    busy,
    error,
    info,
    fileInputRef: addSource.fileInputRef,
    onPickUploadFile: addSource.onPickUploadFile,
    pendingUpload: addSource.pendingUpload,
    cancelPendingUpload: addSource.cancelPendingUpload,
    confirmPendingUpload: addSource.confirmPendingUpload,
    searchArxivIds: addSource.searchArxivIds,
    setSearchArxivIds: addSource.setSearchArxivIds,
    arxivSearch: addSource.arxivSearch,
    setArxivSearch: addSource.setArxivSearch,
    arxivMax: addSource.arxivMax,
    setArxivMax: addSource.setArxivMax,
    arxivPreviewEntries: addSource.arxivPreviewEntries,
    arxivPreviewSelectedIds: addSource.arxivPreviewSelectedIds,
    arxivImportIncludeFullText: addSource.arxivImportIncludeFullText,
    setArxivImportIncludeFullText: addSource.setArxivImportIncludeFullText,
    fetchArxivPreviewFromAddPage: addSource.fetchArxivPreviewFromAddPage,
    toggleArxivPreviewSelected: addSource.toggleArxivPreviewSelected,
    setArxivPreviewAllSelected: addSource.setArxivPreviewAllSelected,
    confirmArxivImportFromPreview: addSource.confirmArxivImportFromPreview,
    clearArxivPreview: addSource.clearArxivPreview,
    onReindexClick: addSource.onReindexClick,
    pendingBatchFiles: addSource.pendingBatchFiles,
    cancelPendingBatch: addSource.cancelPendingBatch,
    confirmPendingBatch: addSource.confirmPendingBatch,
    onUploadFilesDropped: addSource.onUploadFilesDropped,
    materialSearchQuery: material.materialSearchQuery,
    setMaterialSearchQuery: material.setMaterialSearchQuery,
    materialSearchTopK: material.materialSearchTopK,
    setMaterialSearchTopK: material.setMaterialSearchTopK,
    materialSearchResults: material.materialSearchResults,
    materialSearchMs: material.materialSearchMs,
    onMaterialSearchClick: material.onMaterialSearchClick,
    savedMaterialSearches: saved.savedMaterialSearches,
    newForm: saved.newForm,
    setNewForm: saved.setNewForm,
    addSavedMaterialSearch: saved.addSavedMaterialSearch,
    runSavedMaterialSearch: saved.runSavedMaterialSearch,
    patchSavedMaterialSearch: saved.patchSavedMaterialSearch,
    deleteSavedMaterialSearch: saved.deleteSavedMaterialSearch,
    onAskQuestionCompositionStart: ask.onAskQuestionCompositionStart,
    onAskQuestionCompositionEnd: ask.onAskQuestionCompositionEnd,
    onAskQuestionTextareaKeyDown: ask.onAskQuestionTextareaKeyDown,
    question: ask.question,
    submittedQuestion: ask.submittedQuestion,
    setQuestion: ask.setQuestion,
    topK: ask.topK,
    setTopK: ask.setTopK,
    result: ask.result,
    askOptionsOpen: ask.askOptionsOpen,
    setAskOptionsOpen: ask.setAskOptionsOpen,
    askOptionsTriggerRef: ask.askOptionsTriggerRef,
    askOptionsPanelRef: ask.askOptionsPanelRef,
    askOptionsCoords: ask.askOptionsCoords,
    submitAnalyze: ask.submitAnalyze,
    questionHistory: ask.questionHistory,
    refreshQuestionHistory: ask.refreshQuestionHistory,
  };
}

export type KnowledgeStudioValue = ReturnType<typeof useKnowledgeStudioState>;
