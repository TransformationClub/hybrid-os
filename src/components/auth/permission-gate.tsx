"use client";

import type { ReactNode } from "react";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type Permission,
} from "@/lib/auth/rbac";

interface PermissionGateProps {
  /** Single permission or array of permissions to check. */
  requires: Permission | Permission[];
  /** When true and `requires` is an array, the user must hold every listed permission. Default: false (any). */
  requireAll?: boolean;
  /** Rendered when the user lacks the required permission(s). Defaults to null. */
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  requires,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const role = useCurrentRole();

  const permitted = Array.isArray(requires)
    ? requireAll
      ? hasAllPermissions(role, requires)
      : hasAnyPermission(role, requires)
    : hasPermission(role, requires);

  if (!permitted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
