import * as React from "react";

import { Navigate, useLocation } from "react-router-dom";
import { useProjectContext } from "@/context";

export default function RequireActiveProject(props: { children: React.ReactNode }) {
  const { children } = props;
  const loc = useLocation();
  const ctx: any = useProjectContext();

  const activeId =
    ctx?.activeProjectId ??
    ctx?.project?.id ??
    null;

  if (!activeId) {
    return <Navigate to="/app/projects" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}
