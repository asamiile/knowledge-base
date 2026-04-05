import type {
  PeriodicSavedSearchTarget,
  SavedSearchTarget,
} from "@/lib/api/saved-searches";

/** 定期保存フォームの外部ソース一覧（項目を足すだけで拡張） */
export const SAVED_SEARCH_TARGET_FORM_OPTIONS: {
  value: PeriodicSavedSearchTarget;
  label: string;
}[] = [{ value: "arxiv", label: "arXiv" }];

export const SAVED_SEARCH_INTERVAL_OPTIONS: { value: string; label: string }[] =
  [
    { value: "0", label: "定期なし（手動のみ）" },
    { value: "5", label: "5 分ごと" },
    { value: "15", label: "15 分ごと" },
    { value: "30", label: "30 分ごと" },
    { value: "60", label: "1 時間ごと" },
    { value: "360", label: "6 時間ごと" },
    { value: "1440", label: "24 時間ごと" },
  ];

/** 一覧の既存レコード用（新規保存は arXiv のみ） */
export function savedSearchTargetLabel(v: SavedSearchTarget): string {
  if (v === "knowledge") return "ローカル資料インデックス";
  return "arXiv";
}
