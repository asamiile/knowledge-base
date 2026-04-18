"use client";

import { Button } from "@/components/ui/button";

export type AddSourcePendingUpload = {
  file: File;
  preview: string;
  truncated: boolean;
};

type AddSourceFilePreviewCardProps = {
  pending: AddSourcePendingUpload;
  disabled: boolean;
  uploadBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function AddSourceFilePreviewCard({
  pending,
  disabled,
  uploadBusy,
  onCancel,
  onConfirm,
}: AddSourceFilePreviewCardProps) {
  return (
    <section
      className="flex flex-col gap-3"
      aria-label={`プレビュー: ${pending.file.name}`}
    >
      <p className="text-foreground text-sm font-medium">
        {pending.file.name}
        {pending.truncated && (
          <span className="text-muted-foreground ml-2 font-normal text-xs">
            （先頭 {pending.preview.length.toLocaleString()} 文字のみ表示）
          </span>
        )}
      </p>
      <pre className="bg-muted/50 max-h-64 overflow-auto rounded-lg border border-border/60 p-3 font-mono text-xs whitespace-pre-wrap wrap-break-word">
        {pending.preview}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={disabled}
          onClick={onCancel}
          type="button"
        >
          キャンセル
        </Button>
        <Button
          disabled={disabled}
          onClick={onConfirm}
          type="button"
        >
          {uploadBusy ? "アップロード中…" : "この内容でアップロード"}
        </Button>
      </div>
    </section>
  );
}
