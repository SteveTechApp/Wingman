import { useMemo, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { FolderKanban, LayoutGrid, Sparkles } from "lucide-react";
import WingmanBrand from "@/components/branding/WingmanBrand";

function inferMode(pathname: string): { label: string; text: string; tone: "quick" | "workflow" | "output" } {
  if (pathname.includes("/proposal") || pathname.includes("/projects")) {
    return {
      label: "Output Mode",
      text: "Proposal and project deliverables",
      tone: "output",
    };
  }

  if (
    pathname.includes("/discovery") ||
    pathname.includes("/templates") ||
    pathname.includes("/import-intake") ||
    pathname === "/app/tools"
  ) {
    return {
      label: "Workflow Mode",
      text: "Structured design and proposal workflow",
      tone: "workflow",
    };
  }

  return {
    label: "Quick Reference",
    text: "In-the-moment sales and technical support",
    tone: "quick",
  };
}

function getProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General sales mode";
}

export default function TopBar() {
  const location = useLocation();
  const mode = useMemo(() => inferMode(location.pathname), [location.pathname]);
  const projectName = useMemo(() => getProjectName(), []);

  return (
    <header style={barStyle}>
      <div style={brandWrapStyle}>
        <Link to="/app/dashboard" style={brandLinkStyle}>
          <WingmanBrand size="md" showText />
        </Link>
      </div>

      <div style={centerWrapStyle}>
        <div style={{ ...modeBadgeStyle, ...modeToneStyle(mode.tone) }}>
          <Sparkles size={14} />
          <span>{mode.label}</span>
        </div>
        <div style={modeTextStyle}>{mode.text}</div>
      </div>

      <div style={rightWrapStyle}>
        <div style={topInfoCardStyle}>
          <FolderKanban size={14} />
          <span>{projectName}</span>
        </div>

        <Link to="/app/tools" style={topButtonStyle}>
          <LayoutGrid size={14} />
          <span>Tools</span>
        </Link>
      </div>
    </header>
  );
}

function modeToneStyle(tone: "quick" | "workflow" | "output"): CSSProperties {
  if (tone === "workflow") {
    return {
      border: "1px solid rgba(20,184,166,0.28)",
      background: "linear-gradient(180deg, rgba(9,72,64,0.56), rgba(8,35,32,0.78))",
    };
  }

  if (tone === "output") {
    return {
      border: "1px solid rgba(245,158,11,0.28)",
      background: "linear-gradient(180deg, rgba(92,58,11,0.56), rgba(44,28,8,0.78))",
    };
  }

  return {
    border: "1px solid rgba(59,130,246,0.28)",
    background: "linear-gradient(180deg, rgba(18,64,123,0.56), rgba(9,27,48,0.78))",
  };
}

const barStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "300px 1fr 320px",
  alignItems: "center",
  gap: 10,
  minHeight: 70,
  padding: "10px 12px",
  borderBottom: "1px solid rgba(148,163,184,0.10)",
  background: "linear-gradient(180deg, rgba(9,21,35,0.98), rgba(9,21,35,0.92))",
  position: "sticky",
  top: 0,
  zIndex: 70,
  boxShadow: "0 10px 24px rgba(2,8,23,0.24)",
};

const brandWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  minWidth: 0,
};

const brandLinkStyle: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
};

const centerWrapStyle: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: 4,
};

const modeBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const modeTextStyle: CSSProperties = {
  fontSize: 12,
  opacity: 0.78,
};

const rightWrapStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: 8,
};

const topInfoCardStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 32,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.14)",
  background: "rgba(255,255,255,0.05)",
  fontSize: 12,
  maxWidth: 180,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const topButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(249,115,22,0.28)",
  background: "linear-gradient(180deg, rgba(249,115,22,0.18), rgba(120,53,15,0.24))",
  color: "inherit",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 800,
};