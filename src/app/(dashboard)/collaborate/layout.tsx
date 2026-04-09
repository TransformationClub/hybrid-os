import { CollaborateProvider } from "@/components/collaborate/collaborate-provider";
import type { ReactNode } from "react";

export default function CollaborateLayout({ children }: { children: ReactNode }) {
  return <CollaborateProvider>{children}</CollaborateProvider>;
}
