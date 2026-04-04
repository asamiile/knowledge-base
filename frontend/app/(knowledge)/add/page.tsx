"use client";

import { Database, Upload } from "lucide-react";

import { useKnowledgeStudio } from "../knowledge-studio-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/** `/add` — 資料を追加 */
export default function AddSourcesPage() {
  const s = useKnowledgeStudio();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl space-y-4">
        {s.error && (
          <Alert variant="destructive">
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription className="font-mono text-xs break-all">
              {s.error}
            </AlertDescription>
          </Alert>
        )}
        {s.info && !s.error && (
          <Alert variant="success">
            <AlertTitle>完了</AlertTitle>
            <AlertDescription>{s.info}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>ファイルアップロード</CardTitle>
            <CardDescription className="text-xs">
              ファイル形式：.md, .txt, .json
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <input
              ref={s.fileInputRef}
              type="file"
              accept=".md,.txt,.json,text/markdown,text/plain,application/json"
              onChange={s.onUpload}
              disabled={s.busy !== null}
              className="sr-only"
              title="アップロードするファイルを選択"
            />
            <Button
              variant="outline"
              disabled={s.busy !== null}
              onClick={() => s.fileInputRef.current?.click()}
              className="w-fit rounded-xl"
            >
              <Upload className="size-4" />
              ファイルを選択
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>arXiv 取り込み</CardTitle>
            <CardDescription className="text-xs">
              <a
                href="https://arxiv.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-2 hover:text-primary"
              >
                arXivで論文を検索する
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              value={s.arxivIds}
              onChange={(e) => s.setArxivIds(e.target.value)}
              rows={2}
              placeholder="2301.00001 または https://arxiv.org/abs/..."
              disabled={s.busy !== null}
              className="rounded-xl"
              aria-label="arXiv ID"
            />
            <Button
              variant="secondary"
              disabled={s.busy !== null}
              onClick={() => void s.onArxivImportClick()}
              className="w-fit rounded-xl"
            >
              {s.busy === "arxiv" ? "取得中…" : "arXiv から取得"}
            </Button>
          </CardContent>
        </Card>

        <Button
          disabled={s.busy !== null || !s.pendingReindex}
          onClick={() => void s.onReindexClick()}
          className="w-fit rounded-xl gap-2"
          title={
            !s.pendingReindex && s.busy === null
              ? "ファイルのアップロードまたは arXiv 取り込み（ファイル保存）のあとに実行できます"
              : undefined
          }
        >
          <Database className="size-4" />
          {s.busy === "reindex" ? "更新中…" : "インデックスを更新"}
        </Button>
      </div>
    </div>
  );
}
