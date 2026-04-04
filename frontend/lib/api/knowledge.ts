import { apiBase, fetchJson } from "./api";

export type KnowledgeStats = {
  document_chunks: number;
  raw_data_rows: number;
};

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return fetchJson<KnowledgeStats>(`${apiBase()}/api/knowledge/stats`);
}
