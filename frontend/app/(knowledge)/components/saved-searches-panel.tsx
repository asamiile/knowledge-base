"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import type { PeriodicSavedSearchTarget } from "@/lib/api/saved-searches";
import type { SavedMaterialSearch } from "@/lib/saved-material-searches";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  addSavedMaterialSearch: (onSuccess?: () => void) => void | Promise<void>;
  runSavedMaterialSearch: (item: SavedMaterialSearch) => void | Promise<void>;
  patchSavedMaterialSearch: (
    id: string,
    patch: Partial<SavedMaterialSearch>,
  ) => void | Promise<void>;
  deleteSavedMaterialSearch: (id: string) => void | Promise<void>;
};

/** `/saved` — 保存した条件一覧 */
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
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* ページヘッダー */}
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold leading-snug">
            保存した条件
            {savedMaterialSearches.length > 0 && (
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {savedMaterialSearches.length} 件
              </span>
            )}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            arXiv の検索条件を保存して定期取り込みできます。
          </p>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={busyAny}
              />
            }
          >
            <Plus className="size-4" aria-hidden />
            追加
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>条件を追加</SheetTitle>
              <SheetDescription>
                arXiv の検索条件を保存します。
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
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
                onSave={() =>
                  void addSavedMaterialSearch(() => setSheetOpen(false))
                }
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {(error || info) && (
        <div className="mb-3 shrink-0">
          <StudioAlerts error={error} info={info} />
        </div>
      )}

      {/* 一覧 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
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
