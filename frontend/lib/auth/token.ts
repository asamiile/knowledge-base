const STORAGE_KEY = "kb_access_token";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  let t = localStorage.getItem(STORAGE_KEY);
  if (!t) {
    const legacy = sessionStorage.getItem(STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      sessionStorage.removeItem(STORAGE_KEY);
      t = legacy;
    }
  }
  return t;
}

export function getAccessToken(): string | null {
  return readToken();
}

/** ログイン成功時。ブラウザを閉じても JWT の有効期限までは保持（localStorage）。 */
export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, token);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function authEnabledInBrowser(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}
