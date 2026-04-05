"use client";

import { MaterialSearchPanel } from "../components/material-search-panel";
import { useKnowledgeStudio } from "../knowledge-studio-context";

/** `/search` — ローカル資料のベクトル検索（チャンク一覧） */
export default function MaterialSearchPage() {
  const s = useKnowledgeStudio();

  return (
    <MaterialSearchPanel
      error={s.error}
      info={s.info}
      busy={s.busy}
      materialSearchQuery={s.materialSearchQuery}
      setMaterialSearchQuery={s.setMaterialSearchQuery}
      materialSearchTopK={s.materialSearchTopK}
      setMaterialSearchTopK={s.setMaterialSearchTopK}
      materialSearchResults={s.materialSearchResults}
      materialSearchMs={s.materialSearchMs}
      onMaterialSearchClick={() => void s.onMaterialSearchClick()}
    />
  );
}
