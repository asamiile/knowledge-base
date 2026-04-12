"use client";

import type { ChangeEvent, DragEvent, RefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { BookOpen, Upload } from "lucide-react";

import type { AddSourcePendingUpload } from "./add-source-file-preview-card";
import { ArxivQueryTabs } from "./arxiv-query-tabs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type AddSourceMainTab = "upload" | "arxiv";

export type AddSourceTabsProps = {
  mainTab: AddSourceMainTab;
  onMainTabValueChange: (value: string | number | null) => void;
  busyAny: boolean;
  busyArxivPreview: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPickUploadFile: (e: ChangeEvent<HTMLInputElement>) => void;
  pendingUpload: AddSourcePendingUpload | null;
  cancelPendingUpload: () => void;
  searchArxivIds: string;
  setSearchArxivIds: (v: string) => void;
  arxivSearch: string;
  setArxivSearch: (v: string) => void;
  arxivMax: number;
  setArxivMax: (v: number) => void;
  fetchArxivPreviewFromAddPage: (
    mode: "id" | "keyword",
  ) => void | Promise<unknown>;
  onUploadFilesDropped: (files: File[]) => void;
};

export function AddSourceTabs({
  mainTab,
  onMainTabValueChange,
  busyAny,
  busyArxivPreview,
  fileInputRef,
  onPickUploadFile,
  pendingUpload,
  cancelPendingUpload,
  searchArxivIds,
  setSearchArxivIds,
  arxivSearch,
  setArxivSearch,
  arxivMax,
  setArxivMax,
  fetchArxivPreviewFromAddPage,
  onUploadFilesDropped,
}: AddSourceTabsProps) {
  const [dropActive, setDropActive] = useState(false);
  const dropDepth = useRef(0);

  const onUploadDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropDepth.current += 1;
    setDropActive(true);
  }, []);

  const onUploadDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dropDepth.current -= 1;
    if (dropDepth.current <= 0) {
      dropDepth.current = 0;
      setDropActive(false);
    }
  }, []);

  const onUploadDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onUploadDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dropDepth.current = 0;
      setDropActive(false);
      onUploadFilesDropped(Array.from(e.dataTransfer.files));
    },
    [onUploadFilesDropped],
  );

  return (
    <section className="flex flex-col gap-4" aria-label="資料の取り込み">
      <Tabs
        value={mainTab}
        onValueChange={onMainTabValueChange}
        className="gap-4"
      >
        <TabsList className="inline-flex h-auto w-fit shrink-0 flex-nowrap items-stretch justify-start self-start p-1">
          <TabsTrigger
            value="upload"
            className="flex-none gap-2 rounded-md px-3 py-2 data-active:shadow-sm"
          >
            <Upload className="size-4 shrink-0" />
            ファイル
          </TabsTrigger>
          <TabsTrigger
            value="arxiv"
            className="flex-none gap-2 rounded-md px-3 py-2 data-active:shadow-sm"
          >
            <BookOpen className="size-4 shrink-0" />
            arXiv
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="flex flex-col gap-3">
          <div
            className={cn(
              "flex flex-col gap-3 rounded-xl border border-dashed border-border/80 p-4 transition-colors",
              dropActive && "border-primary bg-primary/5",
              busyAny && "pointer-events-none opacity-70",
            )}
            onDragEnter={onUploadDragEnter}
            onDragLeave={onUploadDragLeave}
            onDragOver={onUploadDragOver}
            onDrop={onUploadDrop}
          >
            <p className="text-muted-foreground text-xs">
              ここにファイルをドロップするか、下のボタンで選択できます（複数可）。
            </p>
            <p className="text-muted-foreground text-xs">
              形式：.md、.txt、.json、.pdf（PDF はテキスト抽出後に索引化）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.txt,.json,.pdf,text/markdown,text/plain,application/json,application/pdf"
              onChange={onPickUploadFile}
              disabled={busyAny}
              className="sr-only"
              title="アップロードするファイルを選択"
            />
          {!pendingUpload ? (
            <Button
              variant="outline"
              disabled={busyAny}
              onClick={() => fileInputRef.current?.click()}
              className="w-fit rounded-xl"
              type="button"
            >
              <Upload className="size-4" />
              ファイルを選択
            </Button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busyAny}
                onClick={() => cancelPendingUpload()}
                className="rounded-xl"
                type="button"
              >
                選択を取り消す
              </Button>
              <Button
                variant="outline"
                disabled={busyAny}
                onClick={() => {
                  cancelPendingUpload();
                  window.setTimeout(() => {
                    fileInputRef.current?.click();
                  }, 0);
                }}
                className="rounded-xl"
                type="button"
              >
                別のファイルを選ぶ
              </Button>
            </div>
          )}
          </div>
        </TabsContent>

        <TabsContent value="arxiv" className="flex flex-col gap-4">
          <ArxivQueryTabs
            intro={
              <p>
                <a
                  href="https://arxiv.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2 hover:text-primary"
                >
                  arXiv
                </a>
                の論文IDまたはキーワードを入力します。
              </p>
            }
            arxivIds={searchArxivIds}
            onArxivIdsChange={setSearchArxivIds}
            keyword={arxivSearch}
            onKeywordChange={setArxivSearch}
            disabled={busyAny}
            idsInputId="arxiv-paper-ids"
            keywordInputId="arxiv-keyword"
            maxResults={arxivMax}
            onMaxResultsChange={setArxivMax}
            maxResultsInputId="arxiv-max-results"
            paperIdTabFooter={
              <Button
                variant="secondary"
                disabled={busyAny}
                onClick={() => void fetchArxivPreviewFromAddPage("id")}
                className="w-fit rounded-xl"
                type="button"
              >
                {busyArxivPreview ? "取得中…" : "一覧を取得"}
              </Button>
            }
            keywordTabFooter={
              <Button
                variant="secondary"
                disabled={busyAny}
                onClick={() => void fetchArxivPreviewFromAddPage("keyword")}
                className="w-fit rounded-xl"
                type="button"
              >
                {busyArxivPreview ? "取得中…" : "一覧を取得"}
              </Button>
            }
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
