import type { DataFileInfo } from "@/lib/api/data";

export type DataFileCategoryKey =
  | "imports_arxiv"
  | "imports_other"
  | "uploads"
  | "other";

export const DATA_FILE_CATEGORY_LABEL: Record<DataFileCategoryKey, string> = {
  imports_arxiv: "arXiv 取り込み",
  imports_other: "その他の取り込み",
  uploads: "アップロード",
  other: "ルート／その他",
};

const CATEGORY_KEYS: DataFileCategoryKey[] = [
  "imports_arxiv",
  "imports_other",
  "uploads",
  "other",
];

export function categoryKeyForDataPath(path: string): DataFileCategoryKey {
  const norm = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (norm.startsWith("imports/arxiv/")) return "imports_arxiv";
  if (norm.startsWith("imports/")) return "imports_other";
  if (norm.startsWith("uploads/")) return "uploads";
  return "other";
}

export type PieSlice = {
  key: DataFileCategoryKey;
  name: string;
  count: number;
  fill: string;
};

/** アップロード（`uploads/`）と arXiv 取り込み（`imports/arxiv/`）の件数 */
export function countUploadAndArxiv(files: DataFileInfo[]): {
  upload: number;
  arxiv: number;
} {
  let upload = 0;
  let arxiv = 0;
  for (const f of files) {
    const k = categoryKeyForDataPath(f.path);
    if (k === "uploads") upload += 1;
    else if (k === "imports_arxiv") arxiv += 1;
  }
  return { upload, arxiv };
}

export function aggregateDataFilesForPie(files: DataFileInfo[]): PieSlice[] {
  const counts: Record<DataFileCategoryKey, number> = {
    imports_arxiv: 0,
    imports_other: 0,
    uploads: 0,
    other: 0,
  };
  for (const f of files) {
    counts[categoryKeyForDataPath(f.path)] += 1;
  }
  return CATEGORY_KEYS.filter((k) => counts[k] > 0).map((key) => ({
    key,
    name: DATA_FILE_CATEGORY_LABEL[key],
    count: counts[key],
    fill: `var(--color-${key})`,
  }));
}
