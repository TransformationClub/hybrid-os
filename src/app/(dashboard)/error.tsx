"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);

    // Send to Sentry when available
    import("@/lib/monitoring/sentry")
      .then((mod) => mod.captureError(error, { digest: error.digest }))
      .catch(() => {});
  }, [error]);

  return (
    <div className="flex items-center justify-center p-12">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {error.message || "An unexpected error occurred while loading this page."}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground/60 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <Button onClick={() => unstable_retry()}>Try Again</Button>
        </CardContent>
      </Card>
    </div>
  );
}
