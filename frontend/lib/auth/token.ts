const STORAGE_KEY = "kb_access_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function authEnabledInBrowser(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}
