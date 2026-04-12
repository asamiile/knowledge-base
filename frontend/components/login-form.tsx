"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { apiBase, fetchJson } from "@/lib/api/api";
import { setAccessToken } from "@/lib/auth/token";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginResponse = { access_token: string; token_type: string };

/** [shadcn login-01](https://ui.shadcn.com/blocks/login#login-01) をベースに、Google / サインアップリンクなし。 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetchJson<LoginResponse>(`${apiBase()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      setAccessToken(res.access_token);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-xl">ログイン</CardTitle>
        <CardDescription>
          管理者から案内されたメールアドレスとパスワードを入力してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                disabled={pending}
                placeholder="you@example.com"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                disabled={pending}
              />
            </div>
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full rounded-xl" disabled={pending}>
              {pending ? "ログイン中…" : "ログイン"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
