const STORAGE_KEY = "knowledge-base:saved-arxiv-queries:v1";

export type SavedArxivQuery = {
  id: string;
  name: string;
  arxivIds: string;
  searchQuery: string;
  maxResults: number;
  /** ISO 8601 */
  lastRunAt?: string;
};

export function loadSavedArxivQueries(): SavedArxivQuery[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedArxivQuery =>
        typeof x === "object" &&
        x !== null &&
        "id" in x &&
        typeof (x as SavedArxivQuery).id === "string",
    );
  } catch {
    return [];
  }
}

export function storeSavedArxivQueries(items: SavedArxivQuery[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
