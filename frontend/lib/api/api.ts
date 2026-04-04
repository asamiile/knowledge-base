/** API のオリジン（末尾スラッシュなし） */
export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
    /\/$/,
    "",
  );
}

/** JSON API 用: 応答をパースし、!ok のとき FastAPI の `detail` を含めて投げる */
export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(input, init);
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`API error ${r.status}: ${text.slice(0, 500)}`);
  }
  if (!r.ok) {
    const detail =
      typeof data === "object" && data && "detail" in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : text;
    throw new Error(`${r.status} ${detail}`);
  }
  return data as T;
}
