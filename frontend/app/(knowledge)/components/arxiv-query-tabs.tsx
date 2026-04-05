"use client";

import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export type ArxivQueryTabsProps = {
  /** タブの上に表示する説明（リンク・スタイルは呼び出し側） */
  intro: ReactNode;
  arxivIds: string;
  onArxivIdsChange: (value: string) => void;
  keyword: string;
  onKeywordChange: (value: string) => void;
  disabled?: boolean;
  idsInputId: string;
  keywordInputId: string;
  /** 論文IDタブ内・入力の下（例: 「一覧を取得」） */
  paperIdTabFooter?: ReactNode;
  /**
   * キーワード検索向けの最大件数（1〜20）。API の max_results に相当。
   * 指定時はキーワードタブ内・入力の直下に表示（論文IDのみの取得には効かない）。
   */
  maxResults?: number;
  onMaxResultsChange?: (value: number) => void;
  maxResultsInputId?: string;
  /** キーワードタブ内・件数入力の下（例: 「一覧を取得」） */
  keywordTabFooter?: ReactNode;
  /** false のとき「必須」バッジを出さない（保存フォームなど、どちらか片方で可な場合） */
  showRequiredBadges?: boolean;
};

/** arXiv 用: 論文ID / キーワードをタブで切り替える入力ブロック（/add・/saved 共通） */
export function ArxivQueryTabs({
  intro,
  arxivIds,
  onArxivIdsChange,
  keyword,
  onKeywordChange,
  disabled = false,
  idsInputId,
  keywordInputId,
  paperIdTabFooter,
  maxResults,
  onMaxResultsChange,
  maxResultsInputId = "arxiv-query-max-results",
  keywordTabFooter,
  showRequiredBadges = true,
}: ArxivQueryTabsProps) {
  const showMaxResults =
    maxResults != null && onMaxResultsChange != null;
  return (
    <div className="flex flex-col gap-4">
      <div className="text-muted-foreground text-xs">{intro}</div>
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
                htmlFor={idsInputId}
                className="text-foreground text-sm font-medium"
              >
                論文ID
              </Label>
              {showRequiredBadges && (
                <Badge variant="secondary" className="font-normal">
                  必須
                </Badge>
              )}
            </div>
            <Textarea
              id={idsInputId}
              value={arxivIds}
              onChange={(e) => onArxivIdsChange(e.target.value)}
              rows={5}
              placeholder={"0000.00000\nhttps://arxiv.org/abs/0000.00000"}
              disabled={disabled}
              className="rounded-xl field-sizing-fixed"
            />
          </div>
          {paperIdTabFooter}
        </TabsContent>
        <TabsContent value="keyword" className="flex flex-col gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label
                htmlFor={keywordInputId}
                className="text-foreground text-sm font-medium"
              >
                キーワード
              </Label>
              {showRequiredBadges && (
                <Badge variant="secondary" className="font-normal">
                  必須
                </Badge>
              )}
            </div>
            <Input
              id={keywordInputId}
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="例: video diffusion"
              disabled={disabled}
              className="rounded-xl"
            />
          </div>
          {showMaxResults && (
            <div className="grid w-fit gap-1">
              <Label htmlFor={maxResultsInputId} className="text-xs">
                一度に取得する件数（1〜20）
              </Label>
              <Input
                id={maxResultsInputId}
                type="number"
                min={1}
                max={20}
                className="w-24 rounded-xl"
                value={maxResults}
                onChange={(e) =>
                  onMaxResultsChange(Number(e.target.value) || 5)
                }
                disabled={disabled}
              />
            </div>
          )}
          {keywordTabFooter}
        </TabsContent>
      </Tabs>
    </div>
  );
}
