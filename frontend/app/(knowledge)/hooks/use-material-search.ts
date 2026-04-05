"use client";

import { useCallback, useState } from "react";

import type { MaterialSearchHit } from "@/lib/api/knowledge";
import { postKnowledgeSearch } from "@/lib/api/knowledge";

import type { StudioShell } from "./use-studio-shell";

export function useMaterialSearch(shell: StudioShell) {
  const { setBusy, setError, setInfo } = shell;

  const [materialSearchQuery, setMaterialSearchQuery] = useState("");
  const [materialSearchTopK, setMaterialSearchTopK] = useState(5);
  const [materialSearchResults, setMaterialSearchResults] = useState<
    MaterialSearchHit[] | null
  >(null);
  const [materialSearchMs, setMaterialSearchMs] = useState<number | null>(
    null,
  );

  const runMaterialSearchImmediate = useCallback(
    async (query: string, topKReq: number): Promise<boolean> => {
      const q = query.trim();
      if (!q) {
        setError("検索クエリを入力してください。");
        return false;
      }
      setError(null);
      setInfo(null);
      setBusy("materialSearch");
      setMaterialSearchResults(null);
      setMaterialSearchMs(null);
      const t0 = performance.now();
      try {
        const data = await postKnowledgeSearch({ query: q, top_k: topKReq });
        setMaterialSearchResults(data.hits);
        setMaterialSearchMs(Math.round(performance.now() - t0));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [setBusy, setError, setInfo],
  );

  const onMaterialSearchClick = useCallback(async () => {
    void runMaterialSearchImmediate(materialSearchQuery, materialSearchTopK);
  }, [materialSearchQuery, materialSearchTopK, runMaterialSearchImmediate]);

  return {
    materialSearchQuery,
    setMaterialSearchQuery,
    materialSearchTopK,
    setMaterialSearchTopK,
    materialSearchResults,
    materialSearchMs,
    onMaterialSearchClick,
    runMaterialSearchImmediate,
  };
}
