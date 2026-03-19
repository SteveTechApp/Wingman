import * as React from "react";

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthed, status } = useAuth();
  const loc = useLocation();
  if (status === "loading") return <div className="wm-route-loading">Restoring session...</div>;
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
