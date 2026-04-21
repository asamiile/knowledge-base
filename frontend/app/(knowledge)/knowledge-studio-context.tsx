"use client";

import { createContext, useContext } from "react";

import { SiteSidebar } from "@/components/site-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import {
  useKnowledgeStudioState,
  type KnowledgeStudioValue,
} from "./use-knowledge-studio-state";

const KnowledgeStudioContext = createContext<KnowledgeStudioValue | null>(null);

export function useKnowledgeStudio(): KnowledgeStudioValue {
  const ctx = useContext(KnowledgeStudioContext);
  if (!ctx) {
    throw new Error(
      "useKnowledgeStudio は KnowledgeStudioProvider 内で使ってください",
    );
  }
  return ctx;
}

export function KnowledgeStudioProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const value = useKnowledgeStudioState();

  return (
    <KnowledgeStudioContext.Provider value={value}>
      <SidebarProvider className="bg-background h-full min-h-0 w-full flex-1 overflow-hidden [--header-height:theme(spacing.14)]">
        <SiteSidebar
          activeSection={value.activeSection}
          onSectionChange={value.navigateToSection}
          stats={value.stats}
          statsLoading={value.statsLoading}
          busy={value.busy}
        />
        <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <SiteHeader />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 text-base md:px-6 md:py-6 @container/main">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </KnowledgeStudioContext.Provider>
  );
}
