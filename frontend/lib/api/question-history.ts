import type { AnalyzeResponse } from "./analyze";
import { apiBase, fetchJson } from "./api";

export type QuestionHistoryItem = {
  id: number;
  question: string;
  response: AnalyzeResponse;
  created_at: string;
};

export async function getQuestionHistory(limit = 50): Promise<QuestionHistoryItem[]> {
  const u = new URL(`${apiBase()}/api/knowledge/question-history`);
  u.searchParams.set("limit", String(limit));
  return fetchJson<QuestionHistoryItem[]>(u.toString(), { method: "GET" });
}
