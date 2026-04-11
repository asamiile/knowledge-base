"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, Dispatch, RefObject, SetStateAction } from "react";
import { Database, FileStack } from "lucide-react";

import type { ArxivPreviewEntry, DataFileInfo } from "@/lib/api/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { AddSourceArxivPreviewCard } from "./add-source-arxiv-preview-card";
import { AddSourceBatchPreviewCard } from "./add-source-batch-preview-card";
import {
  AddSourceFilePreviewCard,
  type AddSourcePendingUpload,
} from "./add-source-file-preview-card";
import { AddSourceTabs, type AddSourceMainTab } from "./add-source-tabs";
import { StudioAlerts } from "./studio-alerts";

export type AddSourcesPanelProps = {
  error: string | null;
  info: string | null;
  busy: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickUploadFile: (e: ChangeEvent<HTMLInputElement>) => void;
  onUploadFilesDropped: (files: File[]) => void;
  pendingUpload: AddSourcePendingUpload | null;
  pendingBatchFiles: File[] | null;
  cancelPendingUpload: () => void;
  cancelPendingBatch: () => void;
  confirmPendingUpload: () => void | Promise<boolean>;
  confirmPendingBatch: () => void | Promise<boolean>;
  searchArxivIds: string;
  setSearchArxivIds: Dispatch<SetStateAction<string>>;
  arxivSearch: string;
  setArxivSearch: Dispatch<SetStateAction<string>>;
  arxivMax: number;
  setArxivMax: Dispatch<SetStateAction<number>>;
  arxivPreviewEntries: ArxivPreviewEntry[] | null;
  arxivPreviewSelectedIds: string[];
  arxivImportIncludeFullText: boolean;
  setArxivImportIncludeFullText: (v: boolean) => void;
  fetchArxivPreviewFromAddPage: (
    mode: "id" | "keyword",
  ) => void | Promise<boolean>;
  toggleArxivPreviewSelected: (arxivId: string) => void;
  setArxivPreviewAllSelected: (selected: boolean) => void;
  confirmArxivImportFromPreview: () => void | Promise<boolean>;
  clearArxivPreview: () => void;
  pendingReindex: boolean;
  onReindexClick: () => void | Promise<void>;
  reindexDialogOpen: boolean;
  onConfirmReindexDialog: () => void | Promise<void>;
  onCancelReindexDialog: () => void;
  autoReindexAfterImport: boolean;
  setAutoReindexAfterImport: (v: boolean) => void;
  sourceFiles: DataFileInfo[] | null;
  refreshSourceFiles: () => void | Promise<void>;
};

function duplicateBasenameGroups(
  files: DataFileInfo[] | null,
): [string, string[]][] {
  if (!files?.length) return [];
  const m = new Map<string, string[]>();
  for (const f of files) {
    const base = f.path.split("/").pop() ?? f.path;
    const g = m.get(base) ?? [];
    g.push(f.path);
    m.set(base, g);
  }
  return [...m.entries()].filter(([, paths]) => paths.length > 1);
}

/** `/add` — 資料を追加 */
export function AddSourcesPanel({
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
  pendingReindex,
  onReindexClick,
  reindexDialogOpen,
  onConfirmReindexDialog,
  onCancelReindexDialog,
  autoReindexAfterImport,
  setAutoReindexAfterImport,
  sourceFiles,
  refreshSourceFiles,
}: AddSourcesPanelProps) {
  const [addSourceMainTab, setAddSourceMainTab] =
    useState<AddSourceMainTab>("upload");

  const dupGroups = useMemo(
    () => duplicateBasenameGroups(sourceFiles),
    [sourceFiles],
  );

  const onAddSourceMainTabChange = useCallback(
    (value: string | number | null) => {
      if (value !== "upload" && value !== "arxiv") return;
      const next = value as AddSourceMainTab;
      setAddSourceMainTab((prev) => {
        if (prev === next) return prev;
        if (next === "arxiv") {
          cancelPendingUpload();
          cancelPendingBatch();
        } else {
          clearArxivPreview();
        }
        return next;
      });
    },
    [cancelPendingBatch, cancelPendingUpload, clearArxivPreview],
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
          onUploadFilesDropped={onUploadFilesDropped}
        />

        {addSourceMainTab === "upload" && pendingBatchFiles && (
          <AddSourceBatchPreviewCard
            files={pendingBatchFiles}
            disabled={busyAny}
            uploadBusy={busyUpload}
            onCancel={() => cancelPendingBatch()}
            onConfirm={() => void confirmPendingBatch()}
          />
        )}

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
              includeFullText={arxivImportIncludeFullText}
              onIncludeFullTextChange={setArxivImportIncludeFullText}
              onToggleSelected={(id) => toggleArxivPreviewSelected(id)}
              onSelectAll={(sel) => setArxivPreviewAllSelected(sel)}
              onClose={() => clearArxivPreview()}
              onConfirmImport={() => void confirmArxivImportFromPreview()}
            />
          )}

        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Checkbox
              id="auto-reindex-after-import"
              checked={autoReindexAfterImport}
              disabled={busyAny}
              onCheckedChange={(c) => setAutoReindexAfterImport(c === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="auto-reindex-after-import"
              className="text-foreground cursor-pointer text-sm font-normal leading-snug"
            >
              取り込み後にインデックスを自動更新する（オフのときは確認ダイアログ）
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-foreground flex items-center gap-2 text-sm font-medium">
                <FileStack className="text-muted-foreground size-4" />
                DATA_DIR 内のファイル
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                disabled={busyAny}
                onClick={() => void refreshSourceFiles()}
              >
                一覧を再取得
              </Button>
            </div>
            {dupGroups.length > 0 && (
              <p className="text-muted-foreground text-xs">
                同名ファイルが別パスに{" "}
                {dupGroups.length}
                組あります。一覧でパスを確認できます。
              </p>
            )}
            {sourceFiles === null ? (
              <p className="text-muted-foreground text-xs">一覧を読み込み中…</p>
            ) : sourceFiles.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                ファイルはまだありません。
              </p>
            ) : (
              <ul className="border-border bg-background max-h-48 overflow-y-auto rounded-lg border text-xs">
                {sourceFiles.map((f) => (
                  <li
                    key={f.path}
                    className="border-border/60 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b px-2 py-1.5 last:border-b-0"
                  >
                    <span className="min-w-0 break-all font-mono">
                      {f.path}
                    </span>
                    <span className="text-muted-foreground shrink-0 tabular-nums">
                      {f.size_bytes.toLocaleString()} B
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <Button
          disabled={busyAny || !pendingReindex}
          onClick={() => void onReindexClick()}
          className="w-fit gap-2 rounded-xl"
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

      {reindexDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 supports-backdrop-filter:backdrop-blur-xs"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onCancelReindexDialog();
          }}
        >
          <div
            className="bg-popover text-popover-foreground w-full max-w-md space-y-4 rounded-xl border p-5 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reindex-dialog-title"
          >
            <h2 id="reindex-dialog-title" className="text-base font-semibold">
              インデックスを更新しますか？
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              取り込んだファイルを検索できるようにするにはインデックスの更新が必要です。今すぐ実行するか、あとから上のボタンで実行できます。
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={onCancelReindexDialog}
              >
                後で
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={busy === "reindex"}
                onClick={() => void onConfirmReindexDialog()}
              >
                {busy === "reindex" ? "更新中…" : "今すぐ更新"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
