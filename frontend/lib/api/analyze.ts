import { apiBase, fetchJson } from "./api";

export type Citation = { document_id: number; excerpt: string; source_path?: string | null };

export type AnalyzeResponse = {
  answer: string;
  key_points: string[];
  citations: Citation[];
};

export type AnalyzeBody = {
  question: string;
  reindex_sources: boolean;
  top_k?: number;
  /** 既定 true。false で DB 履歴に残さない */
  save_question_history?: boolean;
};

export async function postAnalyze(body: AnalyzeBody): Promise<AnalyzeResponse> {
  return fetchJson<AnalyzeResponse>(`${apiBase()}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
