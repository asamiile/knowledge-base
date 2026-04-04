const base = (): string =>
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export type KnowledgeStats = {
  document_chunks: number;
  raw_data_rows: number;
};

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  const r = await fetch(`${base()}/api/knowledge/stats`);
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API error ${r.status}: ${text.slice(0, 500)}`);
  }
  if (!r.ok) {
    throw new Error(text);
  }
  return data as KnowledgeStats;
}

export type Citation = { document_id: number; excerpt: string };

export type AnalyzeResponse = {
  answer: string;
  key_points: string[];
  citations: Citation[];
};

export type AnalyzeBody = {
  question: string;
  reindex_sources: boolean;
  top_k?: number;
};

export async function postAnalyze(body: AnalyzeBody): Promise<AnalyzeResponse> {
  const r = await fetch(`${base()}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API error ${r.status}: ${text.slice(0, 500)}`);
  }
  if (!r.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : text;
    throw new Error(`${r.status} ${detail}`);
  }
  return data as AnalyzeResponse;
}

export type UploadResponse = { path: string; filename: string; size_bytes: number };

export async function postUpload(file: File): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${base()}/api/data/upload`, { method: "POST", body: fd });
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
  const r = await fetch(`${base()}/api/imports/arxiv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API error ${r.status}: ${text.slice(0, 500)}`);
  }
  if (!r.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : text;
    throw new Error(`${r.status} ${detail}`);
  }
  return data as ArxivImportResponse;
}
