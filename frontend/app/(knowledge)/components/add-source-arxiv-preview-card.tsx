"use client";

import type { ArxivPreviewEntry } from "@/lib/api/data";
import { textSnippet } from "@/lib/text-snippet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type AddSourceArxivPreviewCardProps = {
  entries: ArxivPreviewEntry[];
  selectedIds: string[];
  disabled: boolean;
  importBusy: boolean;
  onToggleSelected: (arxivId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onClose: () => void;
  onConfirmImport: () => void;
};

export function AddSourceArxivPreviewCard({
  entries,
  selectedIds,
  disabled,
  importBusy,
  onToggleSelected,
  onSelectAll,
  onClose,
  onConfirmImport,
}: AddSourceArxivPreviewCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground text-sm font-medium">
            取り込み対象
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={disabled}
              onClick={() => onSelectAll(true)}
            >
              すべて選択
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              disabled={disabled}
              onClick={() => onSelectAll(false)}
            >
              すべて解除
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg"
              disabled={disabled}
              onClick={onClose}
            >
              一覧を閉じる
            </Button>
          </div>
        </div>
        <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto overscroll-contain pr-1">
          {entries.map((e, i) => {
            const checked = selectedIds.includes(e.arxiv_id);
            const cbId = `arxiv-preview-${i}`;
            return (
              <li
                key={`${e.arxiv_id}-${i}`}
                className="bg-muted/30 flex gap-3 rounded-xl border p-3"
              >
                <Checkbox
                  id={cbId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => onToggleSelected(e.arxiv_id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <label
                    htmlFor={cbId}
                    className="text-foreground cursor-pointer text-sm font-medium leading-snug"
                  >
                    {e.title}
                  </label>
                  <p className="text-muted-foreground text-xs">
                    {e.arxiv_id}
                    {e.authors.length > 0 && (
                      <>
                        {" · "}
                        {e.authors.join(", ")}
                      </>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {textSnippet(e.summary, 320)}
                  </p>
                  <a
                    href={e.abs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-block text-xs underline underline-offset-2"
                  >
                    arXiv で開く
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        <Button
          disabled={disabled}
          onClick={onConfirmImport}
          className="w-fit rounded-xl"
          type="button"
        >
          {importBusy ? "取り込み中…" : "選択した論文を取り込む"}
        </Button>
      </CardContent>
    </Card>
  );
}
