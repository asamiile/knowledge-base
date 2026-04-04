"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <p className="text-foreground text-sm font-medium">
          {pending.file.name}
          {pending.truncated && (
            <span className="text-muted-foreground ml-2 font-normal text-xs">
              （先頭 {pending.preview.length.toLocaleString()} 文字のみ表示）
            </span>
          )}
        </p>
        <pre className="bg-muted/50 max-h-64 overflow-auto rounded-xl border p-3 font-mono text-xs whitespace-pre-wrap wrap-break-word">
          {pending.preview}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={disabled}
            onClick={onCancel}
            className="rounded-xl"
            type="button"
          >
            キャンセル
          </Button>
          <Button
            disabled={disabled}
            onClick={onConfirm}
            className="rounded-xl"
            type="button"
          >
            {uploadBusy ? "アップロード中…" : "この内容でアップロード"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
