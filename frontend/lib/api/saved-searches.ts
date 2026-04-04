import { apiBase, fetchJson } from "./api";

export type SavedSearchRow = {
  id: string;
  name: string;
  query: string;
  top_k: number;
  interval_minutes: number;
  schedule_enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedSearchCreateBody = {
  name: string;
  query: string;
  top_k?: number;
  interval_minutes?: number;
  schedule_enabled?: boolean;
};

export type SavedSearchPatchBody = {
  name?: string;
  query?: string;
  top_k?: number;
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
  const r = await fetch(`${apiBase()}/api/knowledge/saved-searches/${id}`, {
    method: "DELETE",
  });
  if (!r.ok) {
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
