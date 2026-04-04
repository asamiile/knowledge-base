import type { KnowledgeSection } from "@/lib/knowledge-section";

export const KNOWLEDGE_PATHS: Record<KnowledgeSection, string> = {
  ask: "/",
  sources: "/add",
  schedule: "/search",
};

const PATH_TO_SECTION: Record<string, KnowledgeSection> = {
  "/": "ask",
  "/add": "sources",
  "/search": "schedule",
};

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function sectionToPath(section: KnowledgeSection): string {
  return KNOWLEDGE_PATHS[section];
}

/** 未登録パスは ask にフォールバック（想定外 URL 用） */
export function pathToSection(pathname: string): KnowledgeSection {
  return PATH_TO_SECTION[normalizePathname(pathname)] ?? "ask";
}
