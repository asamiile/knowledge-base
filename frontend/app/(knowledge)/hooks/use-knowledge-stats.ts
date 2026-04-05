"use client";

import { useCallback, useEffect, useState } from "react";

import type { KnowledgeStats } from "@/lib/api/knowledge";
import { getKnowledgeStats } from "@/lib/api/knowledge";

export function useKnowledgeStats() {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await getKnowledgeStats();
      setStats(s);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  return { stats, statsLoading, refreshStats };
}
