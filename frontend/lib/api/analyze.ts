import { apiBase, fetchJson } from "./api";

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
  return fetchJson<AnalyzeResponse>(`${apiBase()}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
