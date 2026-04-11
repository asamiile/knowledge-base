import type { KnowledgeSection } from "@/lib/knowledge-section";

export const KNOWLEDGE_PATHS: Record<KnowledgeSection, string> = {
  dashboard: "/",
  ask: "/ask",
  sources: "/add",
  search: "/search",
  saved: "/saved",
  savedLogs: "/saved/logs",
  file: "/file",
};

const PATH_TO_SECTION: Record<string, KnowledgeSection> = {
  "/": "dashboard",
  "/ask": "ask",
  "/add": "sources",
  "/search": "search",
  "/saved/logs": "savedLogs",
  "/saved": "saved",
  "/file": "file",
};

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function sectionToPath(section: KnowledgeSection): string {
  return KNOWLEDGE_PATHS[section];
}

/** 未登録パスは dashboard にフォールバック */
export function pathToSection(pathname: string): KnowledgeSection {
  return PATH_TO_SECTION[normalizePathname(pathname)] ?? "dashboard";
}
