import {
  authEnabledInBrowser,
  clearAccessToken,
  getAccessToken,
} from "@/lib/auth/token";

/** API のオリジン（末尾スラッシュなし） */
export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001").replace(
    /\/$/,
    "",
  );
}

/** Bearer を付与（トークンがあれば）。 */
export function withAuth(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? undefined);
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers };
}

export function onUnauthorizedResponse(r: Response): void {
  if (r.status !== 401) return;
  if (typeof window === "undefined") return;
  if (!authEnabledInBrowser()) return;
  clearAccessToken();
  if (!window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
}

/** JSON API 用: 応答をパースし、!ok のとき FastAPI の `detail` を含めて投げる */
export async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(input, withAuth(init));
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    onUnauthorizedResponse(r);
    throw new Error(`API error ${r.status}: ${text.slice(0, 500)}`);
  }
  if (!r.ok) {
    onUnauthorizedResponse(r);
    const detail =
      typeof data === "object" && data && "detail" in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : text;
    throw new Error(`${r.status} ${detail}`);
  }
  return data as T;
}
