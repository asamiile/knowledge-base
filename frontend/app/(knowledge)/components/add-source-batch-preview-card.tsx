"use client";

import { Button } from "@/components/ui/button";

export type AddSourceBatchPreviewCardProps = {
  files: File[];
  disabled: boolean;
  uploadBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

/** 複数ファイル一括アップロードの確認（プレビューはファイル名のみ） */
export function AddSourceBatchPreviewCard({
  files,
  disabled,
  uploadBusy,
  onCancel,
  onConfirm,
}: AddSourceBatchPreviewCardProps) {
  return (
    <div className="border-border bg-muted/30 space-y-3 rounded-xl border p-4">
      <p className="text-muted-foreground text-xs">
        {files.length} 件をアップロードします（.md / .txt / .json / .pdf）
      </p>
      <ul className="max-h-40 overflow-y-auto text-sm">
        {files.map((f) => (
          <li key={`${f.name}-${f.size}`} className="truncate py-0.5">
            {f.name}{" "}
            <span className="text-muted-foreground tabular-nums">
              ({f.size.toLocaleString()} B)
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onCancel}
          className="rounded-xl"
        >
          キャンセル
        </Button>
        <Button
          type="button"
          disabled={disabled}
          onClick={() => void onConfirm()}
          className="rounded-xl"
        >
          {uploadBusy ? "アップロード中…" : "まとめてアップロード"}
        </Button>
      </div>
    </div>
  );
}
