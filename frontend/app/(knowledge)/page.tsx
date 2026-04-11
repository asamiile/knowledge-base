"use client";

import { DashboardPanel } from "./components/dashboard-panel";
import { useKnowledgeStudio } from "./knowledge-studio-context";

/** `/` — ダッシュボード */
export default function DashboardPage() {
  const { refreshStats } = useKnowledgeStudio();

  return <DashboardPanel onRefreshStats={refreshStats} />;
}
