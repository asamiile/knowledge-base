"use client";

import type { Dispatch, SetStateAction } from "react";

import type { PeriodicSavedSearchTarget } from "@/lib/api/saved-searches";
import type { SavedMaterialSearch } from "@/lib/saved-material-searches";
import { Separator } from "@/components/ui/separator";

import { SavedSearchForm } from "./saved-search-form";
import { SavedSearchList } from "./saved-search-list";
import { StudioAlerts } from "./studio-alerts";

export type SavedSearchesPanelProps = {
  error: string | null;
  info: string | null;
  busy: string | null;
  savedMaterialSearches: SavedMaterialSearch[];
  saveMaterialName: string;
  setSaveMaterialName: Dispatch<SetStateAction<string>>;
  saveMaterialArxivIds: string;
  setSaveMaterialArxivIds: Dispatch<SetStateAction<string>>;
  saveMaterialArxivKeyword: string;
  setSaveMaterialArxivKeyword: Dispatch<SetStateAction<string>>;
  saveMaterialTopK: number;
  setSaveMaterialTopK: Dispatch<SetStateAction<number>>;
  saveMaterialIntervalMinutes: number;
  setSaveMaterialIntervalMinutes: Dispatch<SetStateAction<number>>;
  saveMaterialScheduleEnabled: boolean;
  setSaveMaterialScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  saveMaterialSearchTarget: PeriodicSavedSearchTarget;
  setSaveMaterialSearchTarget: Dispatch<
    SetStateAction<PeriodicSavedSearchTarget>
  >;
  addSavedMaterialSearch: () => void | Promise<void>;
  runSavedMaterialSearch: (item: SavedMaterialSearch) => void | Promise<void>;
  patchSavedMaterialSearch: (
    id: string,
    patch: Partial<SavedMaterialSearch>,
  ) => void | Promise<void>;
  deleteSavedMaterialSearch: (id: string) => void | Promise<void>;
};

/** `/saved` — 定期実行（保存条件） */
export function SavedSearchesPanel({
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
}: SavedSearchesPanelProps) {
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
