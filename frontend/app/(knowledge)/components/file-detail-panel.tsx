"use client";

import { useMemo } from "react";

import type { DataFileInfo } from "@/lib/api/data";
import { getDataFileLookup } from "@/lib/api/data";
import { useAsyncData } from "../hooks/use-async-data";

import { FileDetailExternalMeta } from "./file-detail-external-meta";

function isSafeRelativePath(path: string): boolean {
  if (!path || path.includes("..")) return false;
  const norm = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return norm.length > 0;
}

/** Scrollable main column (same idea as `/search`). */
function StudioScrollPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl space-y-4 pb-10">{children}</div>
    </div>
  );
}

type FileDetailPanelProps = {
  pathParam: string | null;
};

/** `/file?path=…` — DATA_DIR 上の 1 ファイルメタ */
export function FileDetailPanel({ pathParam }: FileDetailPanelProps) {
  const decodedPath = useMemo(() => {
    if (!pathParam) return null;
    try {
      return decodeURIComponent(pathParam);
    } catch {
      return null;
    }
  }, [pathParam]);

  const pathInvalid = useMemo(() => {
    if (!pathParam) return false;
    if (!decodedPath || !isSafeRelativePath(decodedPath)) return true;
    return false;
  }, [pathParam, decodedPath]);

  const fetchKey = pathInvalid || !decodedPath ? null : decodedPath;
  const {
    loading: rowLoading,
    data: rowData,
    error: listError,
  } = useAsyncData(
    () => (fetchKey ? getDataFileLookup(fetchKey) : Promise.resolve(null)),
    fetchKey,
  );
  const row: DataFileInfo | null | undefined = rowLoading ? undefined : rowData;

  const fileLabel = useMemo(() => {
    if (!decodedPath) return "";
    const seg = decodedPath.split("/").pop();
    return seg ?? decodedPath;
  }, [decodedPath]);

  if (!pathParam) {
    return (
      <StudioScrollPage>
        <p className="text-muted-foreground text-sm">
          <code className="text-foreground">path</code>{" "}
          クエリがありません。
        </p>
      </StudioScrollPage>
    );
  }

  if (pathInvalid) {
    return (
      <StudioScrollPage>
        <p className="text-destructive text-sm">パスが不正です。</p>
      </StudioScrollPage>
    );
  }

  return (
    <StudioScrollPage>
      {decodedPath ? (
        <FileDetailExternalMeta
          key={decodedPath}
          dataPath={decodedPath}
          fileLabel={fileLabel}
          fileMeta={row}
          fileMetaError={listError}
        />
      ) : null}
    </StudioScrollPage>
  );
}
