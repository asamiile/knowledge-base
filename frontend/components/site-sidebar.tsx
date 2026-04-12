"use client";

import { Suspense } from "react";

import {
  FolderInput,
  LayoutDashboard,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import { SidebarPeriodicRunLogs } from "@/components/sidebar-periodic-run-logs";
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
import type { KnowledgeSection } from "@/lib/knowledge-section";
import type { KnowledgeStats } from "@/lib/api/knowledge";
import { cn } from "@/lib/utils";

export function SiteSidebar({
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
              isActive={activeSection === "dashboard"}
              tooltip="ダッシュボード"
              disabled={navDisabled("dashboard")}
              onClick={() => onSectionChange("dashboard")}
            >
              <LayoutDashboard />
              <span className="group-data-[collapsible=icon]:sr-only">
                ダッシュボード
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "ask"}
              tooltip="質問する"
              disabled={navDisabled("ask")}
              onClick={() => onSectionChange("ask")}
            >
              <MessageSquareText />
              <span className="group-data-[collapsible=icon]:sr-only">
                質問する
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "sources"}
              tooltip="資料を追加"
              disabled={navDisabled("sources")}
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
              isActive={activeSection === "search"}
              tooltip="資料の検索"
              disabled={navDisabled("search")}
              onClick={() => onSectionChange("search")}
            >
              <Search />
              <span className="group-data-[collapsible=icon]:sr-only">
                資料の検索
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <Suspense fallback={null}>
            <SidebarPeriodicRunLogs
              activeSection={activeSection}
              onSectionChange={onSectionChange}
              navDisabled={navDisabled}
            />
          </Suspense>
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
            className={cn(
              "w-full",
              "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none",
              "hover:group-data-[collapsible=icon]:bg-sidebar-accent hover:group-data-[collapsible=icon]:text-sidebar-accent-foreground",
              "dark:group-data-[collapsible=icon]:bg-transparent dark:hover:group-data-[collapsible=icon]:bg-sidebar-accent",
            )}
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
