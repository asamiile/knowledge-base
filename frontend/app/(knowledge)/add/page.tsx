"use client";

import { useCallback, useState } from "react";
import { BookOpen, Database, Upload } from "lucide-react";

import { AddSourceArxivPreviewCard } from "../components/add-source-arxiv-preview-card";
import { AddSourceFilePreviewCard } from "../components/add-source-file-preview-card";
import { useKnowledgeStudio } from "../knowledge-studio-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type AddSourceMainTab = "upload" | "arxiv";

/** `/add` — 資料を追加 */
export default function AddSourcesPage() {
  const {
    error,
    info,
    busy,
    fileInputRef,
    onPickUploadFile,
    pendingUpload,
    cancelPendingUpload,
    confirmPendingUpload,
    searchArxivIds,
    setSearchArxivIds,
    arxivSearch,
    setArxivSearch,
    arxivMax,
    setArxivMax,
    arxivPreviewEntries,
    arxivPreviewSelectedIds,
    fetchArxivPreviewFromAddPage,
    toggleArxivPreviewSelected,
    setArxivPreviewAllSelected,
    confirmArxivImportFromPreview,
    clearArxivPreview,
    pendingReindex,
    onReindexClick,
  } = useKnowledgeStudio();

  const [addSourceMainTab, setAddSourceMainTab] =
    useState<AddSourceMainTab>("upload");

  const onAddSourceMainTabChange = useCallback(
    (value: string | number | null) => {
      if (value !== "upload" && value !== "arxiv") return;
      const next = value as AddSourceMainTab;
      setAddSourceMainTab((prev) => {
        if (prev === next) return prev;
        if (next === "arxiv") {
          cancelPendingUpload();
        } else {
          clearArxivPreview();
        }
        return next;
      });
    },
    [cancelPendingUpload, clearArxivPreview],
  );

  const busyUpload = busy === "upload";
  const busyArxivPreview = busy === "arxiv-preview";
  const busyArxivImport = busy === "arxiv-import";
  const busyAny = busy !== null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4">
        {error && (
          <Alert variant="error">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription className="font-mono text-xs break-all">
              {error}
            </AlertDescription>
          </Alert>
        )}
        {info && !error && (
          <Alert variant="success">
            <AlertTitle>完了</AlertTitle>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Tabs
              value={addSourceMainTab}
              onValueChange={onAddSourceMainTabChange}
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
                <p className="text-muted-foreground text-xs">
                  アップロード可能なファイル形式：.md、.txt、.json
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.json,text/markdown,text/plain,application/json"
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
                  <div className="flex flex-col gap-2">
                    <p className="text-foreground text-sm">
                      <span className="font-medium">
                        {pendingUpload.file.name}
                      </span>
                      <span className="text-muted-foreground">
                        を選択しています。内容の確認は下のカードで行えます。
                      </span>
                    </p>
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
                  </div>
                )}
              </TabsContent>

              <TabsContent value="arxiv" className="flex flex-col gap-4">
                <p className="text-muted-foreground text-xs">
                  <a
                    href="https://arxiv.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline underline-offset-2 hover:text-primary"
                  >
                    arXiv
                  </a>
                  の論文IDまたはキーワードで取得します。取得方法は下のタブで切り替えます
                </p>
                <Tabs defaultValue="id" className="gap-4">
                  <TabsList className="inline-flex w-fit shrink-0 flex-nowrap justify-start self-start">
                    <TabsTrigger value="id" className="flex-none px-3">
                      論文ID
                    </TabsTrigger>
                    <TabsTrigger value="keyword" className="flex-none px-3">
                      キーワード
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="id" className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label
                          htmlFor="arxiv-paper-ids"
                          className="text-foreground text-sm font-medium"
                        >
                          論文ID
                        </Label>
                        <Badge variant="secondary" className="font-normal">
                          必須
                        </Badge>
                      </div>
                      <Textarea
                        id="arxiv-paper-ids"
                        value={searchArxivIds}
                        onChange={(e) => setSearchArxivIds(e.target.value)}
                        rows={2}
                        placeholder="2301.00001 または https://arxiv.org/abs/...、複数入力可"
                        disabled={busyAny}
                        className="rounded-xl"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      disabled={busyAny}
                      onClick={() => void fetchArxivPreviewFromAddPage("id")}
                      className="w-fit rounded-xl"
                      type="button"
                    >
                      {busyArxivPreview ? "取得中…" : "一覧を取得"}
                    </Button>
                  </TabsContent>
                  <TabsContent value="keyword" className="flex flex-col gap-4">
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Label
                          htmlFor="arxiv-keyword"
                          className="text-foreground text-sm font-medium"
                        >
                          キーワード
                        </Label>
                        <Badge variant="secondary" className="font-normal">
                          必須
                        </Badge>
                      </div>
                      <Input
                        id="arxiv-keyword"
                        value={arxivSearch}
                        onChange={(e) => setArxivSearch(e.target.value)}
                        placeholder="例: video diffusion"
                        disabled={busyAny}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="grid w-fit gap-1">
                        <Label htmlFor="arxiv-max-results" className="text-xs">
                          一度に取得する件数（1〜20）
                        </Label>
                        <Input
                          id="arxiv-max-results"
                          type="number"
                          min={1}
                          max={20}
                          className="w-24 rounded-xl"
                          value={arxivMax}
                          onChange={(e) =>
                            setArxivMax(Number(e.target.value) || 5)
                          }
                          disabled={busyAny}
                        />
                      </div>
                      <Button
                        variant="secondary"
                        disabled={busyAny}
                        onClick={() =>
                          void fetchArxivPreviewFromAddPage("keyword")
                        }
                        className="w-fit rounded-xl"
                        type="button"
                      >
                        {busyArxivPreview ? "取得中…" : "一覧を取得"}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

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
              onToggleSelected={(id) => toggleArxivPreviewSelected(id)}
              onSelectAll={(sel) => setArxivPreviewAllSelected(sel)}
              onClose={() => clearArxivPreview()}
              onConfirmImport={() => void confirmArxivImportFromPreview()}
            />
          )}

        <Button
          disabled={busyAny || !pendingReindex}
          onClick={() => void onReindexClick()}
          className="w-fit rounded-xl gap-2"
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
    </div>
  );
}
