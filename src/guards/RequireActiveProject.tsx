import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useProjectContext } from "@/context/ProjectContext";

export default function RequireActiveProject(props: { children: React.ReactNode }) {
  const { children } = props;
  const loc = useLocation();

  // Hardening: if context throws or is unavailable, redirect to Projects instead of crashing the app.
  let ctx: any = null;
  try {
    ctx = useProjectContext();
  } catch {
    ctx = null;
  }

  const activeId =
    ctx?.activeProjectId ??
    ctx?.project?.id ??
    null;

  if (!activeId) {
    // Preserve where the user tried to go, so you can return later if you want.
    return <Navigate to="/app/projects" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}


