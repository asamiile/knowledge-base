"use client";

import { EllipsisVertical, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authEnabledInBrowser, clearAccessToken } from "@/lib/auth/token";

export function SiteHeader() {
  const router = useRouter();
  const authOn = authEnabledInBrowser();

  function logout() {
    clearAccessToken();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background transition-all duration-200 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-3 px-4 lg:gap-4 lg:px-6">
        <div className="min-w-0">
          <p className="truncate text-base leading-tight font-semibold tracking-tight">
            ナレッジベース
          </p>
        </div>
        <div className="min-w-0 flex-1" />
        {authOn ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                  aria-label="アカウントメニュー"
                />
              }
            >
              <EllipsisVertical className="size-5" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  className="gap-2"
                  onClick={() => logout()}
                >
                  <LogOut className="size-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
