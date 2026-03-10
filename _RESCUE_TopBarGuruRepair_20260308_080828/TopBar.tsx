import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import heroLogo from "@/assets/branding/heroLogo.png";

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
      const parsed = JSON.parse(raw) as Record<string, unknown> | null;
      const name =
        (typeof parsed?.name === "string" && parsed.name) ||
        (typeof parsed?.projectName === "string" && parsed.projectName) ||
        (typeof parsed?.title === "string" && parsed.title) ||
        "";
      if (name.trim()) return name.trim();
    } catch {
    }
  }

  return "No active project";
}

function smallBtnStyle(active?: boolean): React.CSSProperties {
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
        gridTemplateColumns: "300px minmax(360px, 1fr) auto",
        alignItems: "center",
        gap: 16,
        padding: "0 16px",
        borderBottom: "1px solid rgba(140,190,255,0.10)",
        backdropFilter: "blur(14px)",
        background: "rgba(7,16,30,0.78)",
      }}
    >
      <button
        onClick={() => navigate("/app/dashboard")}
        aria-label="Open dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 68,
          padding: "0 8px",
          border: "none",
          background: "transparent",
          color: "#eef5ff",
          cursor: "pointer",
          justifySelf: "start",
        }}
      >
        <img
          src={heroLogo}
          alt="WyreStorm Wingman"
          style={{
            height: 64,
            width: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </button>

      <div
        style={{
          height: 50,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          fontSize: 16,
          fontWeight: 600,
          color: "#eef5ff",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        Active Project - {projectName}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifySelf: "end",
        }}
      >
        <button onClick={() => window.history.back()} style={smallBtnStyle()}>{"<"}</button>
        <button onClick={() => window.history.forward()} style={smallBtnStyle()}>{">"}</button>
        <button onClick={() => navigate("/app/dashboard")} style={smallBtnStyle(isHome)}>Home</button>
        <button onClick={() => navigate("/app/projects")} style={smallBtnStyle(isProjects)}>Projects</button>
        <button onClick={() => navigate("/app/tools")} style={smallBtnStyle(isTools)}>Tools</button>
        <button
          onClick={() => navigate("/app/projects/new")}
          style={{
            height: 42,
            padding: "0 18px",
            borderRadius: 12,
            border: "1px solid rgba(101,232,255,0.16)",
            background: "linear-gradient(90deg, #19b6d3, #1c79c6)",
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