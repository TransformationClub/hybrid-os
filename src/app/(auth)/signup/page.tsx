"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { brand } from "@/config/brand";
import { signup } from "@/lib/auth/actions";
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

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [workspaceName, setWorkspaceName] = useState("");
  const [slug, setSlug] = useState("");

  function handleWorkspaceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setWorkspaceName(value);
    setSlug(toSlug(value));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
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
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Get started with {brand.name} in seconds.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Jane Smith"
                autoComplete="name"
                required
                className="h-9"
              />
            </div>

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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="workspaceName">Workspace name</Label>
              <Input
                id="workspaceName"
                name="workspaceName"
                type="text"
                placeholder="Acme Inc."
                value={workspaceName}
                onChange={handleWorkspaceChange}
                required
                className="h-9"
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  Your workspace URL: {brand.url.replace("https://", "")}/{slug}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="mt-1 w-full"
              disabled={isPending}
            >
              {isPending ? "Creating account..." : "Create account"}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
