"use client";

import { useState } from "react";

export type StudioShell = {
  busy: string | null;
  setBusy: React.Dispatch<React.SetStateAction<string | null>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  info: string | null;
  setInfo: React.Dispatch<React.SetStateAction<string | null>>;
};

/**
 * ナレッジスタジオ全体で共有する busy / トースト相当の error・info。
 * ルート遷移時にメッセージをクリアする（effect 内 setState は eslint 回避のためレンダー同期）。
 */
export function useStudioShell(pathname: string): StudioShell {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [messagesClearedForPath, setMessagesClearedForPath] =
    useState(pathname);

  if (pathname !== messagesClearedForPath) {
    setMessagesClearedForPath(pathname);
    setError(null);
    setInfo(null);
  }

  return { busy, setBusy, error, setError, info, setInfo };
}
