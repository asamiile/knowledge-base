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

export async function postArxivImport(body: {
  arxiv_ids?: string[];
  search_query?: string;
  max_results?: number;
}): Promise<ArxivImportResponse> {
  return fetchJson<ArxivImportResponse>(`${apiBase()}/api/data/imports/arxiv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
