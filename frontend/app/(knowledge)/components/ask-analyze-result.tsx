"use client";

import {
  SeparatedResults,
  SeparatedResultsList,
} from "./separated-results";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalyzeResponse } from "@/lib/api/analyze";
import { downloadJson } from "@/lib/download-json";

export type AskAnalyzeResultProps = {
  result: AnalyzeResponse;
  statsRows: { label: string; value: string }[];
};

export function AskAnalyzeResult({ result, statsRows }: AskAnalyzeResultProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-muted-foreground text-sm font-medium">
          回答
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadJson(
              `analyze-${new Date().toISOString().slice(0, 19)}.json`,
              result,
            )
          }
        >
          JSON をダウンロード
        </Button>
      </div>

      <SeparatedResults>
        <section aria-labelledby="ask-metrics-heading">
          <h3
            id="ask-metrics-heading"
            className="font-heading pb-2 text-base font-medium"
          >
            メトリクス
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>項目</TableHead>
                <TableHead>値</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statsRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="text-muted-foreground">
                    {row.label}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section aria-label="回答本文">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {result.answer}
          </p>
        </section>

        <section aria-labelledby="ask-points-heading">
          <h3
            id="ask-points-heading"
            className="font-heading pb-2 text-base font-medium"
          >
            ポイント
          </h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            {result.key_points.map((k, i) => (
              <li key={i}>{k}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ask-citations-heading">
          <h3
            id="ask-citations-heading"
            className="font-heading pb-2 text-base font-medium"
          >
            引用
          </h3>
          <SeparatedResultsList
            items={result.citations}
            keyExtractor={(_, i) => i}
            renderItem={(c) => (
              <article>
                <span className="font-mono text-muted-foreground text-xs">
                  doc #{c.document_id}
                </span>
                <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                  {c.excerpt}
                </p>
              </article>
            )}
          />
        </section>
      </SeparatedResults>
    </>
  );
}
