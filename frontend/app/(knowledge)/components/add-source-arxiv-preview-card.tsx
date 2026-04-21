"use client";

import type { ArxivPreviewEntry } from "@/lib/api/data";
import { textSnippet } from "@/lib/text-snippet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { SeparatedResultsList } from "./separated-results";

type AddSourceArxivPreviewCardProps = {
  entries: ArxivPreviewEntry[];
  selectedIds: string[];
  disabled: boolean;
  importBusy: boolean;
  includeFullText: boolean;
  onIncludeFullTextChange: (value: boolean) => void;
  onToggleSelected: (arxivId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onConfirmImport: () => void;
};

export function AddSourceArxivPreviewCard({
  entries,
  selectedIds,
  disabled,
  importBusy,
  includeFullText,
  onIncludeFullTextChange,
  onToggleSelected,
  onSelectAll,
  onConfirmImport,
}: AddSourceArxivPreviewCardProps) {
  return (
    <section className="flex flex-col gap-3" aria-label="arXiv 取り込みプレビュー">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-foreground font-medium">
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
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto overscroll-contain pr-1">
        <SeparatedResultsList
          items={entries}
          keyExtractor={(e, i) => `${e.arxiv_id}-${i}`}
          renderItem={(e, i) => {
            const checked = selectedIds.includes(e.arxiv_id);
            const cbId = `arxiv-preview-${i}`;
            return (
              <div className="flex gap-3">
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
                    className="text-foreground cursor-pointer font-medium leading-snug"
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
                  <p className="text-muted-foreground leading-relaxed">
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
              </div>
            );
          }}
        />
      </div>
      <div className="flex items-center gap-3">
        <Switch
          id="arxiv-import-full-text"
          checked={includeFullText}
          disabled={disabled}
          onCheckedChange={onIncludeFullTextChange}
        />
        <Label
          htmlFor="arxiv-import-full-text"
          className="cursor-pointer text-sm font-normal text-muted-foreground"
        >
          PDF から本文も取り込む
        </Label>
      </div>
      <Button
        disabled={disabled}
        onClick={onConfirmImport}
        className="w-fit"
        type="button"
      >
        {importBusy ? "取り込み中…" : "選択した論文を取り込む"}
      </Button>
    </section>
  );
}
