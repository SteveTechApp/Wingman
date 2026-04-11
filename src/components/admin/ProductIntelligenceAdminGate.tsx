import * as React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

type Props = {
  children: React.ReactNode;
};

export default function ProductIntelligenceAdminGate({ children }: Props) {
  const auth = useAuth();
  const canAdmin = Boolean(
    auth.permissions.canManageWorkspace ||
      auth.workspaceRole === "admin" ||
      auth.workspaceRole === "owner" ||
      auth.user?.role === "admin",
  );

  if (canAdmin) {
    return <>{children}</>;
  }

  const accessLabel = auth.workspaceRole ?? auth.user?.role ?? "guest";

  return (
    <div className="wm-admin-gate">
      <div className="wm-admin-gate__backdrop" />
      <div className="wm-admin-gate__dialog" role="dialog" aria-modal="true" aria-labelledby="wm-admin-gate-title">
        <div className="wm-admin-gate__lock" aria-hidden="true">ADMIN</div>
        <div id="wm-admin-gate-title" className="wm-admin-gate__title">
          ADMIN PERMISSION REQUIRED
        </div>
        <div className="wm-admin-gate__copy">
          Product Intelligence editing is restricted to workspace owners and admins.
        </div>
        <div className="wm-admin-gate__error">
          Signed in with {accessLabel} access{auth.user?.email ? ` as ${auth.user.email}` : "."}
        </div>
        <div className="wm-admin-gate__copy">
          Ask a workspace owner to grant admin access instead of relying on shared client-side passwords.
        </div>
        <div className="wm-admin-gate__form">
          <Link to="/app/tools" className="wm-btn wm-admin-gate__button">
            Return to tools
          </Link>
        </div>
      </div>
    </div>
  );
}
