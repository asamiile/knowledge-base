"use client";

import {
  CalendarClock,
  FolderInput,
  MessageSquareText,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { KnowledgeStats } from "@/lib/api/knowledge";

import type { KnowledgeSection } from "./types";

/**
 * 折りたたみ時: フッター「統計を更新」と同じ outline・高さ h-7・アイコンのみ（ラベルは sr-only）
 */
const navBtnIconMode = cn(
  "group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:min-h-7 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:rounded-[min(var(--radius-md),12px)] group-data-[collapsible=icon]:border group-data-[collapsible=icon]:border-border group-data-[collapsible=icon]:bg-background group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:shadow-none hover:group-data-[collapsible=icon]:bg-muted hover:group-data-[collapsible=icon]:text-foreground group-data-[collapsible=icon]:[&_svg]:size-3.5 dark:group-data-[collapsible=icon]:border-input dark:group-data-[collapsible=icon]:bg-input/30 dark:hover:group-data-[collapsible=icon]:bg-input/50",
);

export function KnowledgeAppSidebar({
  activeSection,
  onSectionChange,
  stats,
  statsLoading,
  onRefreshStats,
  busy,
}: {
  activeSection: KnowledgeSection;
  onSectionChange: (s: KnowledgeSection) => void;
  stats: KnowledgeStats | null;
  statsLoading: boolean;
  onRefreshStats: () => void;
  busy: string | null;
}) {
  const navDisabled = (section: KnowledgeSection) =>
    busy !== null && activeSection !== section;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div
          className="flex items-start gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:items-center"
          title="知識ベース"
        >
          <Sparkles className="size-4 shrink-0 text-sidebar-foreground" />
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:sr-only">
            <p className="truncate text-sm leading-tight font-semibold">
              知識ベース
            </p>
            <p className="text-muted-foreground truncate text-xs leading-tight">
              ローカル RAG
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="gap-2 group-data-[collapsible=icon]:gap-2 p-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "ask"}
              tooltip="質問"
              disabled={navDisabled("ask")}
              className={navBtnIconMode}
              onClick={() => onSectionChange("ask")}
            >
              <MessageSquareText />
              <span className="group-data-[collapsible=icon]:sr-only">質問</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "sources"}
              tooltip="資料を追加"
              disabled={navDisabled("sources")}
              className={navBtnIconMode}
              onClick={() => onSectionChange("sources")}
            >
              <FolderInput />
              <span className="group-data-[collapsible=icon]:sr-only">
                資料を追加
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "schedule"}
              tooltip="定期・検索"
              disabled={navDisabled("schedule")}
              className={navBtnIconMode}
              onClick={() => onSectionChange("schedule")}
            >
              <CalendarClock />
              <span className="group-data-[collapsible=icon]:sr-only">
                定期・検索
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="space-y-2">
          <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] group-data-[collapsible=icon]:hidden">
            <Badge variant="secondary" className="font-mono text-[10px]">
              chunks {statsLoading ? "…" : (stats?.document_chunks ?? "—")}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              raw {statsLoading ? "…" : (stats?.raw_data_rows ?? "—")}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full group-data-[collapsible=icon]:px-2"
            disabled={statsLoading}
            onClick={onRefreshStats}
          >
            <RefreshCw
              className={`size-3.5 ${statsLoading ? "animate-spin" : ""}`}
            />
            <span className="group-data-[collapsible=icon]:sr-only">
              統計を更新
            </span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
