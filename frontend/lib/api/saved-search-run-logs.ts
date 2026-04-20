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
  /** path → 翻訳済みスニペット のキャッシュ */
  translated_hints: Record<string, string> | null;
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

export async function patchRunLogHintTranslation(
  logId: string,
  path: string,
  translatedText: string,
): Promise<SavedSearchRunLogRead> {
  return fetchJson<SavedSearchRunLogRead>(
    `${apiBase()}/api/knowledge/saved-search-run-logs/${logId}/hint-translation`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, translated_text: translatedText }),
    },
  );
}
