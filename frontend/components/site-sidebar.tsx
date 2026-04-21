"use client";

import { Suspense } from "react";

import {
  FolderInput,
  LayoutDashboard,
  MessageSquareText,
  Search,
} from "lucide-react";

import { SidebarPeriodicRunLogs } from "@/components/sidebar-periodic-run-logs";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { KnowledgeSection } from "@/lib/knowledge-section";
import type { KnowledgeStats } from "@/lib/api/knowledge";

export function SiteSidebar({
  activeSection,
  onSectionChange,
  stats,
  statsLoading,
  busy,
}: {
  activeSection: KnowledgeSection;
  onSectionChange: (s: KnowledgeSection) => void;
  stats: KnowledgeStats | null;
  statsLoading: boolean;
  busy: string | null;
}) {
  const navDisabled = (section: KnowledgeSection) =>
    busy !== null && activeSection !== section;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-(--header-height) flex flex-row items-center gap-2 border-b border-sidebar-border px-2">
        <SidebarTrigger aria-label="サイドメニューを開閉" />
        <span className="truncate text-base font-semibold leading-tight tracking-tight group-data-[collapsible=icon]:hidden">
          spira-base
        </span>
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
        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs group-data-[collapsible=icon]:hidden">
          <Badge variant="secondary" className="font-mono text-xs">
            chunks {statsLoading ? "…" : (stats?.document_chunks ?? "—")}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            raw {statsLoading ? "…" : (stats?.raw_data_rows ?? "—")}
          </Badge>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
