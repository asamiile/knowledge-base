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
import { TeamSwitcher } from "@/components/team-switcher";
import type { KnowledgeStats } from "@/lib/api";

import type { KnowledgeSection } from "./types";

const teams = [
  {
    name: "知識ベース",
    plan: "ローカル RAG",
    logo: <Sparkles className="size-4" />,
  },
];

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
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "ask"}
              tooltip="質問"
              disabled={navDisabled("ask")}
              onClick={() => onSectionChange("ask")}
            >
              <MessageSquareText />
              <span>質問</span>
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
              <span>資料を追加</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeSection === "schedule"}
              tooltip="定期・検索"
              disabled={navDisabled("schedule")}
              onClick={() => onSectionChange("schedule")}
            >
              <CalendarClock />
              <span>定期・検索</span>
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
