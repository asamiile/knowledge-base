import { apiBase, fetchJson } from "./api";

export type TranslateResponse = {
  document_id: number;
  translated_text: string;
  cached: boolean;
};

export async function translateDocument(documentId: number): Promise<TranslateResponse> {
  return fetchJson<TranslateResponse>(`${apiBase()}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document_id: documentId }),
  });
}

export type TranslateTextResponse = {
  translated_text: string;
};

export async function translateText(text: string): Promise<TranslateTextResponse> {
  return fetchJson<TranslateTextResponse>(`${apiBase()}/api/translate/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
