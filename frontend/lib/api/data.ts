import { apiBase, fetchJson } from "./api";

export type UploadResponse = {
  path: string;
  filename: string;
  size_bytes: number;
};

export async function postUpload(file: File): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${apiBase()}/api/data/upload`, { method: "POST", body: fd });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      typeof data === "object" && data && "detail" in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : r.statusText,
    );
  }
  return data as UploadResponse;
}

export type ArxivImportResponse = { written: string[]; entry_count: number };

export type ArxivPreviewEntry = {
  arxiv_id: string;
  title: string;
  summary: string;
  authors: string[];
  abs_url: string;
};

export type ArxivPreviewResponse = { entries: ArxivPreviewEntry[] };

export async function postArxivPreview(body: {
  arxiv_ids?: string[];
  search_query?: string;
  max_results?: number;
}): Promise<ArxivPreviewResponse> {
  return fetchJson<ArxivPreviewResponse>(
    `${apiBase()}/api/data/imports/arxiv/preview`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function postArxivImport(body: {
  arxiv_ids?: string[];
  search_query?: string;
  max_results?: number;
  /** PDF から本文抽出を .md に追記（失敗時は Abstract のみ） */
  include_full_text?: boolean;
}): Promise<ArxivImportResponse> {
  return fetchJson<ArxivImportResponse>(`${apiBase()}/api/data/imports/arxiv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type ReindexResponse = {
  document_chunks: number;
  raw_data_rows: number;
};

/** DATA_DIR の再取り込み（LLM なし）。 */
export async function postReindex(): Promise<ReindexResponse> {
  return fetchJson<ReindexResponse>(`${apiBase()}/api/data/reindex`, {
    method: "POST",
  });
}

export type DataFileInfo = {
  path: string;
  size_bytes: number;
  modified_at: string;
};

export async function getDataFiles(limit = 2000): Promise<DataFileInfo[]> {
  const u = new URL(`${apiBase()}/api/data/files`);
  u.searchParams.set("limit", String(limit));
  const data = await fetchJson<{ files: DataFileInfo[] }>(u.toString(), {
    method: "GET",
  });
  return data.files;
}

export type FileEnrichmentResponse = {
  path: string;
  display_name: string;
  arxiv_id: string | null;
  citation_count: number | null;
  summary: string | null;
  tldr: string | null;
  sources: string[];
};

/** arXiv Atom を主に、引用数は OpenAlex から表示用メタを取得する。 */
export async function getFileEnrichment(
  path: string,
): Promise<FileEnrichmentResponse> {
  const u = new URL(`${apiBase()}/api/data/files/enrichment`);
  u.searchParams.set("path", path);
  return fetchJson<FileEnrichmentResponse>(u.toString(), { method: "GET" });
}
