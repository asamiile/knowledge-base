"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";

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
          <AlertDescription className="font-mono text-xs break-all">
            {error}
          </AlertDescription>
        </Alert>
      )}
      {info && !error && (
        <Alert variant="success">
          <AlertDescription>{info}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
