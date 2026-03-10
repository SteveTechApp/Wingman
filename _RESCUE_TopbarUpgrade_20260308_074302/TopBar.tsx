import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import heroLogo from "@/assets/branding/wyrestorm-wingman-logo.png";

type ProjectSummary = {
  name?: string;
  projectName?: string;
  title?: string;
};

function readActiveProjectName(): string {
  const keys = [
    "wm_active_project",
    "wingman_active_project",
    "wm_current_project",
    "wm_project_active",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as ProjectSummary | null;
      const name = parsed?.name || parsed?.projectName || parsed?.title;
      if (typeof name === "string" && name.trim()) return name.trim();
    } catch {
    }
  }

  return "No active project";
}

function iconBtnStyle(): React.CSSProperties {
  return {
    height: 42,
    minWidth: 42,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "#eef5ff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function navBtnStyle(active?: boolean): React.CSSProperties {
  return {
    height: 42,
    padding: "0 14px",
    borderRadius: 12,
    border: active
      ? "1px solid rgba(88,233,255,0.22)"
      : "1px solid rgba(255,255,255,0.10)",
    background: active
      ? "linear-gradient(90deg, rgba(21,174,205,0.22), rgba(27,103,191,0.20))"
      : "rgba(255,255,255,0.04)",
    color: "#eef5ff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [projectName, setProjectName] = React.useState<string>(() => readActiveProjectName());

  React.useEffect(() => {
    const sync = () => setProjectName(readActiveProjectName());
    window.addEventListener("storage", sync);
    const id = window.setInterval(sync, 1200);
    return () => {
      window.removeEventListener("storage", sync);
      window.clearInterval(id);
    };
  }, []);

  const isHome =
    location.pathname === "/app" ||
    location.pathname === "/app/dashboard";

  const isProjects = location.pathname.startsWith("/app/projects");
  const isTools = location.pathname.startsWith("/app/tools");

  return (
    <header
      className="wm-topbar"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        height: 80,
        minHeight: 80,
        display: "grid",
        gridTemplateColumns: "320px minmax(300px, 520px) 1fr auto",
        alignItems: "center",
        gap: 16,
        padding: "0 14px",
        borderBottom: "1px solid rgba(140,190,255,0.10)",
        backdropFilter: "blur(14px)",
        background: "rgba(7,16,30,0.78)",
      }}
    >
      <button
        onClick={() => navigate("/app/dashboard")}
        aria-label="Go to dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          height: 62,
          width: "fit-content",
          padding: "0 14px 0 8px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: "#eef5ff",
        }}
      >
        <img
          src={heroLogo}
          alt="WyreStorm Wingman"
          style={{
            height: 54,
            width: "auto",
            objectFit: "contain",
            display: "block",
            filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.28))",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.05 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#eef5ff",
              whiteSpace: "nowrap",
            }}
          >
            Wingman
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "rgba(186,205,236,0.72)",
              whiteSpace: "nowrap",
            }}
          >
            WyreStorm sales assistant
          </span>
        </div>
      </button>

      <div
        style={{
          height: 46,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <span style={{ fontSize: 15, opacity: 0.86 }}>⌕</span>
        <div style={{ minWidth: 0, lineHeight: 1.15 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(166,187,222,0.78)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Active project
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#f5fbff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {projectName}
          </div>
        </div>
      </div>

      <div />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <button onClick={() => window.history.back()} style={iconBtnStyle()} aria-label="Back">
          ←
        </button>

        <button onClick={() => window.history.forward()} style={iconBtnStyle()} aria-label="Forward">
          →
        </button>

        <button onClick={() => navigate("/app/dashboard")} style={navBtnStyle(isHome)}>
          ⌂ <span>Home</span>
        </button>

        <button onClick={() => navigate("/app/projects")} style={navBtnStyle(isProjects)}>
          ☐ <span>Projects</span>
        </button>

        <button onClick={() => navigate("/app/tools")} style={navBtnStyle(isTools)}>
          ✦ <span>Tools</span>
        </button>

        <button
          onClick={() => navigate("/app/projects/new")}
          style={{
            height: 44,
            padding: "0 18px",
            borderRadius: 12,
            border: "1px solid rgba(101,232,255,0.16)",
            background: "linear-gradient(90deg, rgba(25,182,211,0.96), rgba(28,121,198,0.96))",
            color: "#04111f",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + New Project
        </button>
      </div>
    </header>
  );
}