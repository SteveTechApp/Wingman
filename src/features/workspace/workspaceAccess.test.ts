import { describe, expect, it } from "vitest";

import { buildWorkspacePermissions, canManageWorkspaceRole } from "@/features/workspace/workspaceAccess";

describe("workspaceAccess", () => {
  it("keeps guests and unknown roles out of workspace mutations", () => {
    const permissions = buildWorkspacePermissions(null);
    expect(permissions.canManageWorkspace).toBe(false);
    expect(permissions.canEditProjects).toBe(false);
    expect(permissions.canCreateCustomerComments).toBe(false);
  });

  it("treats customer roles as collaboration-only users", () => {
    const permissions = buildWorkspacePermissions("customer");
    expect(permissions.canCreateCustomerComments).toBe(true);
    expect(permissions.canCreateInternalComments).toBe(false);
    expect(permissions.canPrepareShares).toBe(false);
    expect(permissions.canMarkCommercialReady).toBe(false);
  });

  it("limits role assignment authority by actor role", () => {
    expect(canManageWorkspaceRole("owner", "admin")).toBe(true);
    expect(canManageWorkspaceRole("owner", "owner")).toBe(false);
    expect(canManageWorkspaceRole("admin", "sales")).toBe(true);
    expect(canManageWorkspaceRole("admin", "admin")).toBe(false);
    expect(canManageWorkspaceRole("sales", "customer")).toBe(false);
  });
});
