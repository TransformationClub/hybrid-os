"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { brand } from "@/config/brand";
import { login, loginWithMagicLink } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail } from "lucide-react";

type LoginMode = "password" | "magic-link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<LoginMode>("password");
  const [isPending, startTransition] = useTransition();

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginWithMagicLink(formData);
      if (result?.error) {
        setError(result.error);
      }
      if (result?.success) {
        setSuccess(result.message ?? "Check your email for the magic link.");
      }
    });
  }

  function toggleMode() {
    setError(null);
    setSuccess(null);
    setMode((prev) => (prev === "password" ? "magic-link" : "password"));
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">H</span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {brand.name}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in to your account</CardTitle>
          <CardDescription>
            {mode === "password"
              ? "Enter your credentials to access your workspace."
              : "We will send a sign-in link to your email."}
          </CardDescription>
        </CardHeader>

        {mode === "password" ? (
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className="h-9"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="h-9"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-1 w-full"
                disabled={isPending}
              >
                {isPending ? "Signing in..." : "Sign in"}
              </Button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={toggleMode}
              >
                <Mail className="size-4" data-icon="inline-start" />
                Sign in with Magic Link
              </Button>
            </CardContent>
          </form>
        ) : (
          <form onSubmit={handleMagicLinkSubmit}>
            <CardContent className="flex flex-col gap-4">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-emerald-300/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {success}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  className="h-9"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-1 w-full"
                disabled={isPending || !!success}
              >
                <Mail className="size-4" data-icon="inline-start" />
                {isPending ? "Sending..." : "Send Magic Link"}
              </Button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={toggleMode}
              >
                Sign in with Password
              </Button>
            </CardContent>
          </form>
        )}

        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
