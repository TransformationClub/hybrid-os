import type { WorkspaceRole } from "@/types";

// Re-export for convenience
export type { WorkspaceRole };

// ============================================================
// Permissions
// ============================================================

export type Permission =
  | "manage_workspace"
  | "manage_agents"
  | "manage_skills"
  | "create_initiative"
  | "approve_content"
  | "edit_content"
  | "view_content"
  | "manage_integrations"
  | "manage_members";

// ============================================================
// Role → Permission mapping
// ============================================================

const ALL_PERMISSIONS: Permission[] = [
  "manage_workspace",
  "manage_agents",
  "manage_skills",
  "create_initiative",
  "approve_content",
  "edit_content",
  "view_content",
  "manage_integrations",
  "manage_members",
];

export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  admin: ALL_PERMISSIONS,

  strategist: [
    "manage_agents",
    "manage_skills",
    "create_initiative",
    "approve_content",
    "edit_content",
    "view_content",
    "manage_integrations",
  ],

  operator: [
    "create_initiative",
    "edit_content",
    "view_content",
  ],

  reviewer: [
    "approve_content",
    "view_content",
  ],

  viewer: [
    "view_content",
  ],
};

// ============================================================
// Permission checks
// ============================================================

export function hasPermission(
  role: WorkspaceRole,
  permission: Permission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(
  role: WorkspaceRole,
  permissions: Permission[]
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  return permissions.some((p) => rolePerms.includes(p));
}

export function hasAllPermissions(
  role: WorkspaceRole,
  permissions: Permission[]
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  return permissions.every((p) => rolePerms.includes(p));
}
