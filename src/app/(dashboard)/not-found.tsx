import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <div className="flex items-center justify-center p-12">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
          <div className="rounded-full bg-muted p-3">
            <FileQuestion className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Page not found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
