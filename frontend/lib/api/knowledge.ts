import { apiBase, fetchJson } from "./api";

export type KnowledgeStats = {
  document_chunks: number;
  raw_data_rows: number;
};

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return fetchJson<KnowledgeStats>(`${apiBase()}/api/knowledge/stats`);
}

export type MaterialSearchHit = {
  document_id: number;
  text: string;
  distance: number;
  /** DATA_DIR 相対パス。あるとき `/file?path=`へリンク可能 */
  source_path?: string | null;
};

export type MaterialSearchResponse = { hits: MaterialSearchHit[] };

export async function postKnowledgeSearch(body: {
  query: string;
  top_k?: number;
}): Promise<MaterialSearchResponse> {
  return fetchJson<MaterialSearchResponse>(`${apiBase()}/api/knowledge/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: body.query, top_k: body.top_k ?? 5 }),
  });
}
