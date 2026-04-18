"use client";

import { Bookmark, ChevronDown, History } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  sidebarMenuButtonVariants,
  useSidebar,
} from "@/components/ui/sidebar";
import type { KnowledgeSection } from "@/lib/knowledge-section";
import { KNOWLEDGE_PATHS } from "@/lib/knowledge-routes";
import {
  listSavedSearchRunLogs,
  type SavedSearchRunLogListItem,
} from "@/lib/api/saved-search-run-logs";
import { cn } from "@/lib/utils";

/** サイドバー内: 定期実行ログの折りたたみツリー（展開時のみ。アイコンモードは単一ボタン） */
export function SidebarPeriodicRunLogs({
  activeSection,
  onSectionChange,
  navDisabled,
}: {
  activeSection: KnowledgeSection;
  onSectionChange: (s: KnowledgeSection) => void;
  navDisabled: (section: KnowledgeSection) => boolean;
}) {
  const { state: sidebarState } = useSidebar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeLogId = searchParams.get("log");
  const [logs, setLogs] = useState<SavedSearchRunLogListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void listSavedSearchRunLogs()
      .then((list) => {
        if (!cancelled) setLogs(list);
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openSavedSettings = () => {
    onSectionChange("saved");
    router.push(KNOWLEDGE_PATHS.saved);
  };

  return (
    <>
      {sidebarState === "collapsed" && (
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={activeSection === "saved"}
            tooltip="定期実行を設定"
            disabled={navDisabled("saved")}
            onClick={openSavedSettings}
          >
            <Bookmark />
            <span className="sr-only">定期実行を設定</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden min-w-0">
        <Collapsible defaultOpen className="group/collapsible w-full min-w-0">
          <CollapsibleTrigger
            type="button"
            className={cn(
              sidebarMenuButtonVariants({ variant: "default", size: "default" }),
              "w-full min-w-0",
            )}
          >
            <History className="shrink-0 opacity-80" />
            <span className="truncate">定期実行</span>
            <ChevronDown className="text-sidebar-foreground/60 ml-auto size-4 shrink-0 opacity-80" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub
              className={cn("border-sidebar-border max-h-[min(40vh,20rem)] overflow-y-auto pr-1")}
            >
              <SidebarMenuSubItem>
                <SidebarMenuSubButton
                  size="md"
                  isActive={activeSection === "saved"}
                  className={cn(
                    navDisabled("saved") &&
                      "pointer-events-none opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
                  )}
                  render={
                    <button
                      type="button"
                      aria-label="定期実行を設定（/saved）"
                    />
                  }
                  onClick={() => {
                    if (navDisabled("saved")) return;
                    openSavedSettings();
                  }}
                >
                  <span className="text-left">定期実行を設定</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
              {loading && (
                <SidebarMenuSubItem>
                  <span className="text-sidebar-foreground/70 px-2 py-1 text-xs">
                    読み込み中…
                  </span>
                </SidebarMenuSubItem>
              )}
              {!loading && logs.length === 0 && (
                <SidebarMenuSubItem>
                  <span className="text-sidebar-foreground/70 px-2 py-1 text-xs">
                    ログなし
                  </span>
                </SidebarMenuSubItem>
              )}
              {logs.map((log) => (
                <SidebarMenuSubItem key={log.id}>
                  <SidebarMenuSubButton
                    size="md"
                    isActive={
                      activeSection === "savedLogs" && activeLogId === log.id
                    }
                    className={cn(
                      navDisabled("savedLogs") &&
                        "pointer-events-none opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
                    )}
                    render={
                      <button
                        type="button"
                        aria-label={log.title_snapshot || "Untitled"}
                      />
                    }
                    onClick={() => {
                      if (navDisabled("savedLogs")) return;
                      onSectionChange("savedLogs");
                      router.push(
                        `${KNOWLEDGE_PATHS.savedLogs}?log=${encodeURIComponent(log.id)}`,
                      );
                    }}
                  >
                    <span className="line-clamp-2 wrap-break-word text-left">
                      {log.title_snapshot || "Untitled"}
                    </span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    </>
  );
}
