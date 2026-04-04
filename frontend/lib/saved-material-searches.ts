const STORAGE_KEY = "knowledge-base:saved-material-searches:v1";

/** localStorage から DB への一回限り移行済みフラグ */
export const SAVED_SEARCHES_MIGRATED_TO_DB_KEY =
  "knowledge-base:saved-searches-migrated-to-db:v1";

import type { SavedSearchRow } from "@/lib/api/saved-searches";

export type SavedMaterialSearch = {
  id: string;
  name: string;
  /** 資料インデックスへの検索クエリ */
  query: string;
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
    topK: row.top_k,
    intervalMinutes: row.interval_minutes,
    scheduleEnabled: row.schedule_enabled,
    lastRunAt: row.last_run_at ?? undefined,
  };
}

export function loadSavedMaterialSearches(): SavedMaterialSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SavedMaterialSearch =>
        typeof x === "object" &&
        x !== null &&
        "id" in x &&
        typeof (x as SavedMaterialSearch).id === "string" &&
        "query" in x &&
        typeof (x as SavedMaterialSearch).query === "string",
    );
  } catch {
    return [];
  }
}

export function storeSavedMaterialSearches(items: SavedMaterialSearch[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
