import type { SavedSearchRow, SavedSearchTarget } from "@/lib/api/saved-searches";

const STORAGE_KEY = "spira-base:saved-material-searches:v1";
const LEGACY_STORAGE_KEY = "knowledge-base:saved-material-searches:v1";

/** localStorage から DB への一回限り移行済みフラグ */
export const SAVED_SEARCHES_MIGRATED_TO_DB_KEY =
  "spira-base:saved-searches-migrated-to-db:v1";
export const LEGACY_SAVED_SEARCHES_MIGRATED_TO_DB_KEY =
  "knowledge-base:saved-searches-migrated-to-db:v1";

export function isSavedSearchesMigratedToDbFlag(): boolean {
  if (typeof window === "undefined") return false;
  return (
    localStorage.getItem(SAVED_SEARCHES_MIGRATED_TO_DB_KEY) === "1" ||
    localStorage.getItem(LEGACY_SAVED_SEARCHES_MIGRATED_TO_DB_KEY) === "1"
  );
}

export type SavedMaterialSearch = {
  id: string;
  name: string;
  /** Local material query vs arxiv keyword search (arxivIds for paper IDs). */
  query: string;
  /** arXiv paper IDs; separate from keyword (same as /add). */
  arxivIds: string[];
  /** knowledge=ローカルベクトル検索 / arxiv=arXiv（API・移行後は常にあり） */
  searchTarget?: SavedSearchTarget;
  topK: number;
  /** 0 = 定期なし（手動のみ）。それ以外は分単位の間隔 */
  intervalMinutes: number;
  /** 定期実行が有効（ブラウザ起動・タブ表示中のみタイマーで実行） */
  scheduleEnabled: boolean;
  lastRunAt?: string;
};

export function savedSearchRowToClient(row: SavedSearchRow): SavedMaterialSearch {
  return {
    id: row.id,
    name: row.name,
    query: row.query,
    arxivIds: row.arxiv_ids ?? [],
    searchTarget: row.search_target ?? "knowledge",
    topK: row.top_k,
    intervalMinutes: row.interval_minutes,
    scheduleEnabled: row.schedule_enabled,
    lastRunAt: row.last_run_at ?? undefined,
  };
}

export function loadSavedMaterialSearches(): SavedMaterialSearch[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is Record<string, unknown> =>
          typeof x === "object" &&
          x !== null &&
          "id" in x &&
          typeof (x as { id: unknown }).id === "string" &&
          "query" in x &&
          typeof (x as { query: unknown }).query === "string",
      )
      .map(
        (x) =>
          ({
            ...x,
            arxivIds: Array.isArray(x.arxivIds)
              ? (x.arxivIds as unknown[]).filter((y) => typeof y === "string")
              : [],
          }) as SavedMaterialSearch,
      );
  } catch {
    return [];
  }
}

export function storeSavedMaterialSearches(items: SavedMaterialSearch[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
