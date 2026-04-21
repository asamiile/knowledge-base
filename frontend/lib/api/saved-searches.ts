import { apiBase, fetchJson, onUnauthorizedResponse, withAuth } from "./api";

export type SavedSearchTarget = "knowledge" | "arxiv";

/** `/saved` フォームで選べる対象（ローカル索引は `/search` のため除外） */
export type PeriodicSavedSearchTarget = Exclude<SavedSearchTarget, "knowledge">;

export type SavedSearchRow = {
  id: string;
  /** 認証オン時はサーバーが付与。認証オフや旧データでは null */
  user_id: string | null;
  name: string;
  query: string;
  arxiv_ids: string[];
  search_target: SavedSearchTarget;
  top_k: number;
  include_full_text: boolean;
  interval_minutes: number;
  schedule_enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedSearchCreateBody = {
  name: string;
  query: string;
  arxiv_ids?: string[];
  search_target?: SavedSearchTarget;
  top_k?: number;
  include_full_text?: boolean;
  interval_minutes?: number;
  schedule_enabled?: boolean;
};

export type SavedSearchPatchBody = {
  name?: string;
  query?: string;
  arxiv_ids?: string[];
  search_target?: SavedSearchTarget;
  top_k?: number;
  include_full_text?: boolean;
  interval_minutes?: number;
  schedule_enabled?: boolean;
  last_run_at?: string | null;
};

export async function listSavedSearches(): Promise<SavedSearchRow[]> {
  return fetchJson<SavedSearchRow[]>(
    `${apiBase()}/api/knowledge/saved-searches`,
  );
}

export async function createSavedSearch(
  body: SavedSearchCreateBody,
): Promise<SavedSearchRow> {
  return fetchJson<SavedSearchRow>(`${apiBase()}/api/knowledge/saved-searches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchSavedSearch(
  id: string,
  body: SavedSearchPatchBody,
): Promise<SavedSearchRow> {
  return fetchJson<SavedSearchRow>(
    `${apiBase()}/api/knowledge/saved-searches/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const r = await fetch(
    `${apiBase()}/api/knowledge/saved-searches/${id}`,
    withAuth({ method: "DELETE" }),
  );
  if (!r.ok) {
    onUnauthorizedResponse(r);
    const text = await r.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: unknown };
      if (j.detail != null) detail = JSON.stringify(j.detail);
    } catch {
      /* use text */
    }
    throw new Error(`${r.status} ${detail}`);
  }
}
