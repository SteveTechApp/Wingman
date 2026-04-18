import { useMemo, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { FolderKanban, Sparkles } from "lucide-react";
import WingmanBrand from "@/components/branding/WingmanBrand";
import ThemeToggle from "@/components/ThemeToggle";

type TopBarProps = {
  meta?: unknown;
};

function getProjectName(): string {
  return localStorage.getItem("wm:activeProjectName") || "General sales mode";
}

export default function TopBar(_props: TopBarProps) {
  const location = useLocation();
  const projectName = useMemo(() => getProjectName(), [location.pathname]);

  return (
    <header className="wm-topbar" data-wm-topbar style={barStyle}>
      <div style={leftWrapStyle}>
        <Link to="/app/dashboard" style={brandLinkStyle} aria-label="Wingman home">
          <WingmanBrand size="xxl" showText={false} />
        </Link>
      </div>

      <div style={rightWrapStyle}>
        <div style={topInfoCardStyle}>
          <FolderKanban size={14} />
          <span>{projectName}</span>
        </div>

        <Link to="/app/tools" style={topButtonStyle}>
          <Sparkles size={14} />
          <span>Tools</span>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}

const barStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  minHeight: 88,
  padding: "10px 16px",
};

const leftWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  flex: "0 0 auto",
};

const brandLinkStyle: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const rightWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginLeft: "auto",
  flexWrap: "wrap",
};

const topInfoCardStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 36,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid var(--wm-border-default)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 12,
  maxWidth: 220,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const topButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid var(--wm-brand-line)",
  background: "var(--wm-brand-soft)",
  color: "inherit",
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 800,
};