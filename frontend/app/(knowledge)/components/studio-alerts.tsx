"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type StudioAlertsProps = {
  error: string | null;
  info: string | null;
};

/** ナレッジスタジオ共通: エラー / 成功トースト相当の Alert */
export function StudioAlerts({ error, info }: StudioAlertsProps) {
  return (
    <>
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
    </>
  );
}
