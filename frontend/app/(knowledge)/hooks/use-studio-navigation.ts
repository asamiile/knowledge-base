"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { KnowledgeSection } from "@/lib/knowledge-section";
import { pathToSection, sectionToPath } from "@/lib/knowledge-routes";

export function useStudioNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const activeSection = useMemo(() => pathToSection(pathname), [pathname]);

  const navigateToSection = useCallback(
    (section: KnowledgeSection) => {
      router.push(sectionToPath(section));
    },
    [router],
  );

  return { pathname, activeSection, navigateToSection };
}
