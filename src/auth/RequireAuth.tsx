import { type ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";

type RequireAuthProps = {
  children?: ReactNode;
};

function normaliseProtectedPath(pathname: string): string {
  if (pathname === "/app/toolhub" || pathname === "/app/toolhub/") {
    return "/app/tools";
  }

  return pathname;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation();
  const { loading, isAuthenticated } = useAuth();

  const normalisedPath = normaliseProtectedPath(location.pathname);

  if (location.pathname !== normalisedPath) {
    return <Navigate to={normalisedPath} replace />;
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          width: "100%",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "radial-gradient(circle at top, rgba(243,140,46,0.10), transparent 24%), var(--wm-bg, #08111b)",
          color: "var(--wm-text, #e8edf7)",
        }}
      >
        <div
          style={{
            width: "min(100%, 360px)",
            borderRadius: "20px",
            padding: "24px",
            background: "rgba(10, 18, 30, 0.88)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              margin: "0 auto 14px",
              borderRadius: "999px",
              border: "3px solid rgba(255,255,255,0.14)",
              borderTopColor: "rgba(255,155,71,0.95)",
              animation: "wm-auth-spin 0.9s linear infinite",
            }}
          />
          <div style={{ fontSize: "18px", fontWeight: 700 }}>Opening workspace…</div>
          <div style={{ marginTop: "8px", opacity: 0.72, fontSize: "14px" }}>
            Checking your session.
          </div>
        </div>

        <style>{`
          @keyframes wm-auth-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}
