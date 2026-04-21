"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import type { PeriodicSavedSearchTarget } from "@/lib/api/saved-searches";
import type { SavedMaterialSearch } from "@/lib/api/saved-material-searches";
import { splitArxivIdsInput } from "@/lib/arxiv-input";
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

type NewFormState = {
  name: string;
  arxivIds: string;
  keyword: string;
  topK: number;
  includeFullText: boolean;
  intervalMinutes: number;
  scheduleEnabled: boolean;
  searchTarget: PeriodicSavedSearchTarget;
};

export type SavedSearchesPanelProps = {
  error: string | null;
  info: string | null;
  busy: string | null;
  savedMaterialSearches: SavedMaterialSearch[];
  newForm: NewFormState;
  setNewForm: (patch: Partial<NewFormState>) => void;
  addSavedMaterialSearch: (onSuccess?: () => void) => void | Promise<void>;
  runSavedMaterialSearch: (item: SavedMaterialSearch) => void | Promise<void>;
  patchSavedMaterialSearch: (
    id: string,
    patch: Partial<SavedMaterialSearch>,
  ) => void | Promise<void>;
  deleteSavedMaterialSearch: (id: string) => void | Promise<void>;
};

const DEFAULT_EDIT_FORM: NewFormState = {
  name: "",
  arxivIds: "",
  keyword: "",
  topK: 5,
  includeFullText: false,
  intervalMinutes: 0,
  scheduleEnabled: false,
  searchTarget: "arxiv",
};

/** `/saved` — 保存した条件一覧 */
export function SavedSearchesPanel({
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
}: SavedSearchesPanelProps) {
  const busyAny = busy !== null;
  const [sheetOpen, setSheetOpen] = useState(false);

  // 編集 Sheet
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedMaterialSearch | null>(null);
  const [editForm, setEditForm] = useState<NewFormState>(DEFAULT_EDIT_FORM);

  const patchEditForm = (patch: Partial<NewFormState>) =>
    setEditForm((f) => ({ ...f, ...patch }));

  const handleOpenEdit = (item: SavedMaterialSearch) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      arxivIds: item.arxivIds.join(" "),
      keyword: item.query,
      topK: item.topK,
      includeFullText: item.includeFullText,
      intervalMinutes: item.intervalMinutes,
      scheduleEnabled: item.scheduleEnabled,
      searchTarget: (item.searchTarget ?? "arxiv") as PeriodicSavedSearchTarget,
    });
    setEditSheetOpen(true);
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    void patchSavedMaterialSearch(editingItem.id, {
      name: editForm.name.trim(),
      query: editForm.keyword.trim(),
      arxivIds: splitArxivIdsInput(editForm.arxivIds),
      searchTarget: editForm.searchTarget,
      topK: editForm.topK,
      includeFullText: editForm.includeFullText,
      intervalMinutes: editForm.intervalMinutes,
      scheduleEnabled: editForm.scheduleEnabled && editForm.intervalMinutes > 0,
    });
    setEditSheetOpen(false);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4 pb-10">
        <StudioAlerts error={error} info={info} />

        {/* ページヘッダー */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold leading-snug">
              保存した条件
              {savedMaterialSearches.length > 0 && (
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  {savedMaterialSearches.length} 件
                </span>
              )}
            </h2>
            <p className="text-muted-foreground mt-0.5">
              arXiv の検索条件を保存して定期取り込みできます。
            </p>
          </div>

          <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>条件を編集</SheetTitle>
                <SheetDescription>
                  {editingItem?.name ?? ""}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">
                <SavedSearchForm
                  busyAny={busyAny}
                  busySavedSearchWrite={busy === "savedSearchWrite"}
                  saveMaterialName={editForm.name}
                  setSaveMaterialName={(v) => patchEditForm({ name: v })}
                  saveMaterialSearchTarget={editForm.searchTarget}
                  setSaveMaterialSearchTarget={(v) => patchEditForm({ searchTarget: v })}
                  saveMaterialArxivIds={editForm.arxivIds}
                  setSaveMaterialArxivIds={(v) => patchEditForm({ arxivIds: v })}
                  saveMaterialArxivKeyword={editForm.keyword}
                  setSaveMaterialArxivKeyword={(v) => patchEditForm({ keyword: v })}
                  saveMaterialTopK={editForm.topK}
                  setSaveMaterialTopK={(v) => patchEditForm({ topK: v })}
                  saveMaterialIncludeFullText={editForm.includeFullText}
                  setSaveMaterialIncludeFullText={(v) => patchEditForm({ includeFullText: v })}
                  saveMaterialIntervalMinutes={editForm.intervalMinutes}
                  setSaveMaterialIntervalMinutes={(v) => patchEditForm({ intervalMinutes: v })}
                  saveMaterialScheduleEnabled={editForm.scheduleEnabled}
                  setSaveMaterialScheduleEnabled={(v) => patchEditForm({ scheduleEnabled: v })}
                  onSave={handleEditSave}
                  saveLabel="変更を保存"
                />
              </div>
            </SheetContent>
          </Sheet>

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
                  saveMaterialName={newForm.name}
                  setSaveMaterialName={(v) => setNewForm({ name: v })}
                  saveMaterialSearchTarget={newForm.searchTarget}
                  setSaveMaterialSearchTarget={(v) => setNewForm({ searchTarget: v })}
                  saveMaterialArxivIds={newForm.arxivIds}
                  setSaveMaterialArxivIds={(v) => setNewForm({ arxivIds: v })}
                  saveMaterialArxivKeyword={newForm.keyword}
                  setSaveMaterialArxivKeyword={(v) => setNewForm({ keyword: v })}
                  saveMaterialTopK={newForm.topK}
                  setSaveMaterialTopK={(v) => setNewForm({ topK: v })}
                  saveMaterialIncludeFullText={newForm.includeFullText}
                  setSaveMaterialIncludeFullText={(v) => setNewForm({ includeFullText: v })}
                  saveMaterialIntervalMinutes={newForm.intervalMinutes}
                  setSaveMaterialIntervalMinutes={(v) => setNewForm({ intervalMinutes: v })}
                  saveMaterialScheduleEnabled={newForm.scheduleEnabled}
                  setSaveMaterialScheduleEnabled={(v) => setNewForm({ scheduleEnabled: v })}
                  onSave={() =>
                    void addSavedMaterialSearch(() => setSheetOpen(false))
                  }
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <SavedSearchList
          items={savedMaterialSearches}
          busyAny={busyAny}
          onPatch={(id, patch) => void patchSavedMaterialSearch(id, patch)}
          onDelete={(id) => void deleteSavedMaterialSearch(id)}
          onRunNow={(item) => void runSavedMaterialSearch(item)}
          onEdit={handleOpenEdit}
        />
      </div>
    </div>
  );
}
