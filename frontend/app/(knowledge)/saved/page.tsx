"use client";

import { SavedSearchForm } from "../components/saved-search-form";
import { SavedSearchList } from "../components/saved-search-list";
import { StudioAlerts } from "../components/studio-alerts";
import { useKnowledgeStudio } from "../knowledge-studio-context";
import { Separator } from "@/components/ui/separator";

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

  const busyAny = busy !== null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4">
        <StudioAlerts error={error} info={info} />

        <SavedSearchForm
          busyAny={busyAny}
          busySavedSearchWrite={busy === "savedSearchWrite"}
          saveMaterialName={saveMaterialName}
          setSaveMaterialName={setSaveMaterialName}
          saveMaterialSearchTarget={saveMaterialSearchTarget}
          setSaveMaterialSearchTarget={setSaveMaterialSearchTarget}
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
          onSave={() => void addSavedMaterialSearch()}
        />

        <Separator className="my-4" />

        <SavedSearchList
          items={savedMaterialSearches}
          busyAny={busyAny}
          onPatch={(id, patch) => void patchSavedMaterialSearch(id, patch)}
          onDelete={(id) => void deleteSavedMaterialSearch(id)}
          onRunNow={(item) => void runSavedMaterialSearch(item)}
        />
      </div>
    </div>
  );
}
