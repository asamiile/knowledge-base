import { apiBase, fetchJson } from "./api";

export type SavedSearchRunLogListItem = {
  id: string;
  saved_search_id: string | null;
  title_snapshot: string;
  status: string;
  created_at: string;
};

export type SavedSearchRunLogRead = SavedSearchRunLogListItem & {
  error_message: string | null;
  imported_content: string | null;
  imported_payload: Record<string, unknown> | null;
};

export async function listSavedSearchRunLogs(): Promise<
  SavedSearchRunLogListItem[]
> {
  return fetchJson<SavedSearchRunLogListItem[]>(
    `${apiBase()}/api/knowledge/saved-search-run-logs`,
  );
}

export async function getSavedSearchRunLog(
  id: string,
): Promise<SavedSearchRunLogRead> {
  return fetchJson<SavedSearchRunLogRead>(
    `${apiBase()}/api/knowledge/saved-search-run-logs/${id}`,
  );
}
