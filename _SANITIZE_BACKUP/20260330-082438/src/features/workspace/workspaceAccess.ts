export type DeploymentWorkspaceRole = "owner" | "admin" | "sales" | "customer";

export type DeploymentPermissions = {
  canManageWorkspace: boolean;
  canEditProjects: boolean;
  canCreateInternalComments: boolean;
  canCreateCustomerComments: boolean;
  canPrepareShares: boolean;
  canRegisterAttachments: boolean;
  canMarkCommercialReady: boolean;
  canViewDiagnostics: boolean;
};

const READ_ONLY_PERMISSIONS: DeploymentPermissions = {
  canManageWorkspace: false,
  canEditProjects: false,
  canCreateInternalComments: false,
  canCreateCustomerComments: true,
  canPrepareShares: false,
  canRegisterAttachments: false,
  canMarkCommercialReady: false,
  canViewDiagnostics: false,
};

const NO_WORKSPACE_PERMISSIONS: DeploymentPermissions = {
  canManageWorkspace: false,
  canEditProjects: false,
  canCreateInternalComments: false,
  canCreateCustomerComments: false,
  canPrepareShares: false,
  canRegisterAttachments: false,
  canMarkCommercialReady: false,
  canViewDiagnostics: false,
};

const SALES_PERMISSIONS: DeploymentPermissions = {
  canManageWorkspace: false,
  canEditProjects: true,
  canCreateInternalComments: true,
  canCreateCustomerComments: true,
  canPrepareShares: true,
  canRegisterAttachments: true,
  canMarkCommercialReady: true,
  canViewDiagnostics: true,
};

const ADMIN_PERMISSIONS: DeploymentPermissions = {
  canManageWorkspace: true,
  canEditProjects: true,
  canCreateInternalComments: true,
  canCreateCustomerComments: true,
  canPrepareShares: true,
  canRegisterAttachments: true,
  canMarkCommercialReady: true,
  canViewDiagnostics: true,
};

export function buildWorkspacePermissions(
  role: DeploymentWorkspaceRole | null | undefined,
): DeploymentPermissions {
  if (!role) return NO_WORKSPACE_PERMISSIONS;
  if (role === "customer") return READ_ONLY_PERMISSIONS;
  if (role === "sales") return SALES_PERMISSIONS;
  if (role === "admin" || role === "owner") return ADMIN_PERMISSIONS;
  return NO_WORKSPACE_PERMISSIONS;
}

export function canManageWorkspaceRole(
  actorRole: DeploymentWorkspaceRole | null | undefined,
  targetRole: DeploymentWorkspaceRole | null | undefined,
): boolean {
  if (actorRole === "owner") {
    return targetRole !== "owner";
  }

  if (actorRole === "admin") {
    return targetRole === "sales" || targetRole === "customer";
  }

  return false;
}
