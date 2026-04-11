/** ブラウザのみ。SSR では既定 false。 */

const AUTO_REINDEX_KEY = "knowledge-base:autoReindexAfterImport";

export function getAutoReindexAfterImport(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTO_REINDEX_KEY) === "1";
}

export function setAutoReindexAfterImport(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTO_REINDEX_KEY, value ? "1" : "0");
}
