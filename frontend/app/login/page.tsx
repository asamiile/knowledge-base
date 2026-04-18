"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import {
  authEnabledInBrowser,
  getAccessToken,
} from "@/lib/auth/token";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** [shadcn login-01](https://ui.shadcn.com/blocks/login#login-01) レイアウト。 */
export default function LoginPage() {
  const router = useRouter();
  const authOn = authEnabledInBrowser();

  useEffect(() => {
    if (!authOn) return;
    if (getAccessToken()) {
      router.replace("/");
    }
  }, [router, authOn]);

  if (!authOn) {
    return (
      <div className="bg-background flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">ログインは無効です</CardTitle>
              <CardDescription>
                フロントの{" "}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  NEXT_PUBLIC_AUTH_ENABLED
                </code>{" "}
                が{" "}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">true</code>{" "}
                になっていません。未設定のときはナレッジ画面をそのまま使えます。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm leading-relaxed">
                ログイン動作を試す場合は、frontend の{" "}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">.env.local</code>{" "}
                などに{" "}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  NEXT_PUBLIC_AUTH_ENABLED=true
                </code>{" "}
                を書き、開発サーバーを再起動してください。バックエンド側も{" "}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  AUTH_ENABLED=true
                </code>{" "}
                と{" "}
                <code className="bg-muted rounded px-1 py-0.5 text-xs">
                  AUTH_JWT_SECRET
                </code>{" "}
                が必要です。
              </p>
              <Link href="/" className="block">
                <Button type="button" variant="outline" className="w-full">
                  トップへ
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
