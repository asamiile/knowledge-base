"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  authEnabledInBrowser,
  clearAccessToken,
  isTokenValid,
} from "@/lib/auth/token";

export function KnowledgeAuthGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [ready, setReady] = useState(() => !authEnabledInBrowser());

  useEffect(() => {
    if (!authEnabledInBrowser()) {
      return;
    }
    if (!isTokenValid()) {
      clearAccessToken();
      router.replace("/login");
      return;
    }
    startTransition(() => {
      setReady(true);
    });
  }, [router]);

  if (!ready) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        読み込み中…
      </div>
    );
  }

  return <>{children}</>;
}
