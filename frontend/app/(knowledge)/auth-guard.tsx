"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  authEnabledInBrowser,
  getAccessToken,
} from "@/lib/auth/token";

export function KnowledgeAuthGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [ready, setReady] = useState(() => !authEnabledInBrowser());

  useEffect(() => {
    if (!authEnabledInBrowser()) {
      setReady(true);
      return;
    }
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
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
