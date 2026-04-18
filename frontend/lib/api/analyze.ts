import { apiBase, fetchJson, onUnauthorizedResponse, withAuth } from "./api";

export type Citation = { document_id: number; excerpt: string; source_path?: string | null };

export type AnalyzeResponse = {
  answer: string;
  key_points: string[];
  citations: Citation[];
};

export type AnalyzeBody = {
  question: string;
  reindex_sources: boolean;
  top_k?: number;
  /** 既定 true。false で DB 履歴に残さない */
  save_question_history?: boolean;
};

export async function postAnalyze(body: AnalyzeBody): Promise<AnalyzeResponse> {
  return fetchJson<AnalyzeResponse>(`${apiBase()}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "done"; key_points: string[]; citations: Citation[] }
  | { type: "error"; message: string };

export async function* postAnalyzeStream(
  body: AnalyzeBody,
): AsyncGenerator<StreamEvent> {
  const resp = await fetch(
    `${apiBase()}/api/analyze/stream`,
    withAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

  onUnauthorizedResponse(resp);

  if (!resp.ok) {
    const text = await resp.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: unknown };
      if (j.detail != null) detail = JSON.stringify(j.detail);
    } catch { /* use text */ }
    throw new Error(`${resp.status} ${detail}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          yield JSON.parse(line.slice(6)) as StreamEvent;
        } catch { /* malformed line, skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
