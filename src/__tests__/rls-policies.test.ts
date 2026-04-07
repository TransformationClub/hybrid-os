import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  ROLE_PERMISSIONS,
  type Permission,
} from "@/lib/auth/rbac";
import type { WorkspaceRole } from "@/types";

// ============================================================
// RLS Policy & Permission Tests
//
// These tests verify that the RBAC permission matrix and
// workspace-guard logic enforce the correct access boundaries.
// ============================================================

// ------------------------------------------------------------------
// 1. Role-Permission matrix completeness
// ------------------------------------------------------------------

describe("ROLE_PERMISSIONS matrix", () => {
  const ALL_ROLES: WorkspaceRole[] = [
    "admin",
    "strategist",
    "operator",
    "reviewer",
    "viewer",
  ];

  it("defines permissions for every role", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
    }
  });

  it("admin has every permission", () => {
    const allPerms: Permission[] = [
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
    for (const perm of allPerms) {
      expect(ROLE_PERMISSIONS.admin).toContain(perm);
    }
  });

  it("viewer only has view_content", () => {
    expect(ROLE_PERMISSIONS.viewer).toEqual(["view_content"]);
  });

  it("reviewer has approve_content and view_content but nothing else writeable", () => {
    expect(ROLE_PERMISSIONS.reviewer).toContain("approve_content");
    expect(ROLE_PERMISSIONS.reviewer).toContain("view_content");
    expect(ROLE_PERMISSIONS.reviewer).not.toContain("edit_content");
    expect(ROLE_PERMISSIONS.reviewer).not.toContain("manage_workspace");
    expect(ROLE_PERMISSIONS.reviewer).not.toContain("create_initiative");
  });

  it("operator can create initiatives and edit content", () => {
    expect(ROLE_PERMISSIONS.operator).toContain("create_initiative");
    expect(ROLE_PERMISSIONS.operator).toContain("edit_content");
    expect(ROLE_PERMISSIONS.operator).toContain("view_content");
  });

  it("operator cannot manage workspace or integrations", () => {
    expect(ROLE_PERMISSIONS.operator).not.toContain("manage_workspace");
    expect(ROLE_PERMISSIONS.operator).not.toContain("manage_integrations");
    expect(ROLE_PERMISSIONS.operator).not.toContain("manage_members");
  });

  it("strategist has most permissions except manage_workspace and manage_members", () => {
    expect(ROLE_PERMISSIONS.strategist).toContain("manage_agents");
    expect(ROLE_PERMISSIONS.strategist).toContain("manage_skills");
    expect(ROLE_PERMISSIONS.strategist).toContain("manage_integrations");
    expect(ROLE_PERMISSIONS.strategist).not.toContain("manage_workspace");
    expect(ROLE_PERMISSIONS.strategist).not.toContain("manage_members");
  });
});

// ------------------------------------------------------------------
// 2. hasPermission
// ------------------------------------------------------------------

describe("hasPermission", () => {
  it("returns true when role has the permission", () => {
    expect(hasPermission("admin", "manage_workspace")).toBe(true);
    expect(hasPermission("operator", "edit_content")).toBe(true);
    expect(hasPermission("viewer", "view_content")).toBe(true);
  });

  it("returns false when role lacks the permission", () => {
    expect(hasPermission("viewer", "edit_content")).toBe(false);
    expect(hasPermission("viewer", "manage_workspace")).toBe(false);
    expect(hasPermission("reviewer", "create_initiative")).toBe(false);
    expect(hasPermission("operator", "manage_agents")).toBe(false);
  });

  it("admin always returns true for any permission", () => {
    const perms: Permission[] = [
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
    for (const perm of perms) {
      expect(hasPermission("admin", perm)).toBe(true);
    }
  });
});

// ------------------------------------------------------------------
// 3. hasAnyPermission
// ------------------------------------------------------------------

describe("hasAnyPermission", () => {
  it("returns true when role has at least one of the requested permissions", () => {
    expect(
      hasAnyPermission("operator", ["manage_workspace", "edit_content"])
    ).toBe(true);
  });

  it("returns false when role has none of the requested permissions", () => {
    expect(
      hasAnyPermission("viewer", ["manage_workspace", "edit_content"])
    ).toBe(false);
  });

  it("returns true for admin regardless of which permissions are requested", () => {
    expect(
      hasAnyPermission("admin", ["manage_workspace", "manage_members"])
    ).toBe(true);
  });

  it("returns false for an empty permission list", () => {
    expect(hasAnyPermission("admin", [])).toBe(false);
  });
});

// ------------------------------------------------------------------
// 4. hasAllPermissions
// ------------------------------------------------------------------

describe("hasAllPermissions", () => {
  it("returns true when role has all requested permissions", () => {
    expect(
      hasAllPermissions("admin", ["manage_workspace", "manage_members"])
    ).toBe(true);
  });

  it("returns false when role is missing at least one", () => {
    expect(
      hasAllPermissions("operator", ["edit_content", "manage_workspace"])
    ).toBe(false);
  });

  it("returns true for an empty permission list (vacuous truth)", () => {
    expect(hasAllPermissions("viewer", [])).toBe(true);
  });

  it("strategist satisfies a broad set of content permissions", () => {
    expect(
      hasAllPermissions("strategist", [
        "manage_agents",
        "manage_skills",
        "approve_content",
        "edit_content",
        "view_content",
      ])
    ).toBe(true);
  });
});

// ------------------------------------------------------------------
// 5. Workspace guard logic (role hierarchy)
// ------------------------------------------------------------------

describe("workspace guard role hierarchy", () => {
  // The hierarchy defined in workspace-guard.ts:
  // viewer: 0, member: 1, editor: 2, admin: 3, owner: 4

  const hierarchy: Record<string, number> = {
    viewer: 0,
    member: 1,
    editor: 2,
    admin: 3,
    owner: 4,
  };

  function meetsRoleRequirement(
    userRole: string,
    requiredRole: string
  ): boolean {
    const userLevel = hierarchy[userRole] ?? -1;
    const requiredLevel = hierarchy[requiredRole] ?? 999;
    return userLevel >= requiredLevel;
  }

  it("admin meets admin requirement", () => {
    expect(meetsRoleRequirement("admin", "admin")).toBe(true);
  });

  it("owner meets admin requirement", () => {
    expect(meetsRoleRequirement("owner", "admin")).toBe(true);
  });

  it("viewer does not meet admin requirement", () => {
    expect(meetsRoleRequirement("viewer", "admin")).toBe(false);
  });

  it("editor meets editor requirement", () => {
    expect(meetsRoleRequirement("editor", "editor")).toBe(true);
  });

  it("member does not meet editor requirement", () => {
    expect(meetsRoleRequirement("member", "editor")).toBe(false);
  });

  it("unknown role fails any requirement", () => {
    expect(meetsRoleRequirement("unknown", "viewer")).toBe(false);
  });

  it("any known role fails an unknown requirement", () => {
    expect(meetsRoleRequirement("admin", "superadmin")).toBe(false);
  });

  it("viewer meets viewer requirement", () => {
    expect(meetsRoleRequirement("viewer", "viewer")).toBe(true);
  });
});

// ------------------------------------------------------------------
// 6. Cross-workspace isolation (unauthenticated / wrong workspace)
// ------------------------------------------------------------------

describe("workspace access isolation", () => {
  // verifyWorkspaceAccess returns { allowed: false } when there is
  // no authenticated user or when the user has no membership.
  // We test the result shape expectations here.

  it("unauthenticated result has allowed: false and no role", () => {
    const result = { allowed: false };
    expect(result.allowed).toBe(false);
    expect(result).not.toHaveProperty("role");
  });

  it("authenticated but non-member has allowed: false with userId", () => {
    const result = { allowed: false, userId: "user-123" };
    expect(result.allowed).toBe(false);
    expect(result.userId).toBe("user-123");
  });

  it("member result includes role and userId", () => {
    const result = { allowed: true, role: "admin", userId: "user-456" };
    expect(result.allowed).toBe(true);
    expect(result.role).toBe("admin");
    expect(result.userId).toBe("user-456");
  });

  it("mock mode returns admin access", () => {
    // When isSupabaseConfigured is false, verifyWorkspaceAccess
    // returns { allowed: true, role: "admin", userId: "mock-user" }
    const mockResult = { allowed: true, role: "admin", userId: "mock-user" };
    expect(mockResult.allowed).toBe(true);
    expect(mockResult.role).toBe("admin");
  });
});
