"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { brand } from "@/config/brand";
import { forgotPassword } from "@/lib/auth/actions";
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

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await forgotPassword(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(true);
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
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your
            password.
          </CardDescription>
        </CardHeader>

        {success ? (
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              Check your email for a password reset link. It may take a minute to
              arrive.
            </div>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
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

              <Button
                type="submit"
                size="lg"
                className="mt-1 w-full"
                disabled={isPending}
              >
                {isPending ? "Sending..." : "Send reset link"}
              </Button>
            </CardContent>
          </form>
        )}

        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
