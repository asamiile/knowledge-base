const CLOUD_RUN_HOST_MARKER = ".run.app";

function canonicalBaseUrl(): string | null {
  const raw =
    process.env.CANONICAL_SITE_URL ??
    process.env.NEXT_PUBLIC_CANONICAL_SITE_URL;
  if (!raw?.trim()) return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function isCloudRunDefaultHost(host: string): boolean {
  const h = host.toLowerCase();
  if (!h.endsWith(CLOUD_RUN_HOST_MARKER)) return false;
  return h.includes(".a.run.app") || /\.[a-z0-9-]+\.run\.app$/i.test(h);
}

export default function middleware(request: Request) {
  const base = canonicalBaseUrl();
  if (!base) return;

  const hostHeader = request.headers.get("host");
  const host = hostHeader?.split(":")[0]?.toLowerCase() ?? "";
  if (!host || !isCloudRunDefaultHost(host)) return;

  let canonicalHost: string;
  try {
    canonicalHost = new URL(base).host.toLowerCase();
  } catch {
    return;
  }
  if (host === canonicalHost) return;

  const current = new URL(request.url);
  const target = new URL(current.pathname + current.search, base);
  return Response.redirect(target.toString(), 301);
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico).*)",
  ],
};
