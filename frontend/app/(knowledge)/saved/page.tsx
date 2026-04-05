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
  } = useKnowledgeStudio();

  return (
    <SavedSearchesPanel
      error={error}
      info={info}
      busy={busy}
      savedMaterialSearches={savedMaterialSearches}
      saveMaterialName={saveMaterialName}
      setSaveMaterialName={setSaveMaterialName}
      saveMaterialArxivIds={saveMaterialArxivIds}
      setSaveMaterialArxivIds={setSaveMaterialArxivIds}
      saveMaterialArxivKeyword={saveMaterialArxivKeyword}
      setSaveMaterialArxivKeyword={setSaveMaterialArxivKeyword}
      saveMaterialTopK={saveMaterialTopK}
      setSaveMaterialTopK={setSaveMaterialTopK}
      saveMaterialIntervalMinutes={saveMaterialIntervalMinutes}
      setSaveMaterialIntervalMinutes={setSaveMaterialIntervalMinutes}
      saveMaterialScheduleEnabled={saveMaterialScheduleEnabled}
      setSaveMaterialScheduleEnabled={setSaveMaterialScheduleEnabled}
      saveMaterialSearchTarget={saveMaterialSearchTarget}
      setSaveMaterialSearchTarget={setSaveMaterialSearchTarget}
      addSavedMaterialSearch={addSavedMaterialSearch}
      runSavedMaterialSearch={runSavedMaterialSearch}
      patchSavedMaterialSearch={patchSavedMaterialSearch}
      deleteSavedMaterialSearch={deleteSavedMaterialSearch}
    />
  );
}
