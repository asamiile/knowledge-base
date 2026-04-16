const STORAGE_KEY = "spira_access_token";
const LEGACY_STORAGE_KEY = "kb_access_token";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  let t = localStorage.getItem(STORAGE_KEY);
  if (!t) {
    const legacyLs = localStorage.getItem(LEGACY_STORAGE_KEY);
    const legacySs = sessionStorage.getItem(LEGACY_STORAGE_KEY);
    const legacy = legacyLs ?? legacySs;
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      t = legacy;
    }
  }  
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

/** Persist JWT in localStorage until expiry (survives closing the browser tab). */
export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, token);
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_STORAGE_KEY);  
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_STORAGE_KEY);  
}

export function authEnabledInBrowser(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}
