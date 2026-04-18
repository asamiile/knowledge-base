"use client";

import { SavedSearchesPanel } from "../components/saved-searches-panel";
import { useKnowledgeStudio } from "../knowledge-studio-context";

/** `/saved` — 定期実行（保存条件） */
export default function SavedMaterialSearchesPage() {
  const {
    error,
    info,
    busy,
    savedMaterialSearches,
    newForm,
    setNewForm,
    addSavedMaterialSearch,
    runSavedMaterialSearch,
    patchSavedMaterialSearch,
    deleteSavedMaterialSearch,
  } = useKnowledgeStudio();

  return (
    <SavedSearchesPanel
      error={error}
      info={info}
      busy={busy}
      savedMaterialSearches={savedMaterialSearches}
      newForm={newForm}
      setNewForm={setNewForm}
      addSavedMaterialSearch={addSavedMaterialSearch}
      runSavedMaterialSearch={runSavedMaterialSearch}
      patchSavedMaterialSearch={patchSavedMaterialSearch}
      deleteSavedMaterialSearch={deleteSavedMaterialSearch}
    />
  );
}
