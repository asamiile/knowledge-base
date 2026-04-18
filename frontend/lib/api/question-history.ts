import type { AnalyzeResponse } from "./analyze";
import { apiBase, fetchJson } from "./api";

export type QuestionHistoryItem = {
  id: number;
  /** 認証オン時はサーバーが付与。認証オフや旧データでは null */
  user_id: string | null;
  question: string;
  response: AnalyzeResponse;
  created_at: string;
};

export async function getQuestionHistory(limit = 50): Promise<QuestionHistoryItem[]> {
  const u = new URL(`${apiBase()}/api/knowledge/question-history`);
  u.searchParams.set("limit", String(limit));
  return fetchJson<QuestionHistoryItem[]>(u.toString(), { method: "GET" });
}
