import { useMemo, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { FolderKanban, LayoutGrid, PanelTopOpen, Sparkles } from "lucide-react";
import WingmanBrand from "@/components/branding/WingmanBrand";
import ThemeToggle from "@/components/ThemeToggle";

type PageMeta = {
  label: string;
  text: string;
  tone: "quick" | "workflow" | "output";
};

function inferMode(pathname: string): PageMeta {
  if (pathname.includes("/dashboard")) {
    return {
      label: "Mission Control",
      text: "Keep the shell familiar while changing the tool workspace.",
      tone: "workflow",
    };
  }

  if (pathname.includes("/guru")) {
    return {
      label: "Guru",
      text: "Chat-first sales, product and technical support.",
      tone: "quick",
    };
  }

  if (pathname.includes("/catalog")) {
    return {
      label: "Product Finder",
      text: "Search the catalog inside the shared workspace shell.",
      tone: "quick",
    };
  }

  if (pathname.includes("/compare")) {
    return {
      label: "Competitor Compare",
      text: "Validate fit, shortlist matches and keep the handoff structured.",
      tone: "quick",
    };
  }

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
  const projectName = useMemo(() => getProjectName(), [location.pathname]);

  return (
    <header className="wm-topbar" data-wm-topbar style={barStyle}>
      <div style={leftWrapStyle}>
        <Link to="/app/dashboard" style={brandLinkStyle}>
          <WingmanBrand size="md" showText />
        </Link>

        <div style={pageMetaStyle}>
          <div style={{ ...modeBadgeStyle, ...modeToneStyle(mode.tone) }}>
            <PanelTopOpen size={14} />
            <span>{mode.label}</span>
          </div>
          <div style={modeTextStyle}>{mode.text}</div>
        </div>
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

function modeToneStyle(tone: "quick" | "workflow" | "output"): CSSProperties {
  if (tone === "workflow") {
    return {
      border: "1px solid rgba(67,195,123,0.18)",
      background: "rgba(67,195,123,0.08)",
      color: "rgba(216,244,226,0.94)",
    };
  }

  if (tone === "output") {
    return {
      border: "1px solid rgba(214,139,79,0.22)",
      background: "rgba(214,139,79,0.08)",
      color: "rgba(255,232,211,0.94)",
    };
  }

  return {
    border: "1px solid rgba(110,168,255,0.22)",
    background: "rgba(110,168,255,0.08)",
    color: "rgba(225,236,255,0.94)",
  };
}

const barStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  minHeight: 72,
  padding: "12px 16px",
  flexWrap: "wrap",
};

const leftWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  minWidth: 0,
  flexWrap: "wrap",
};

const brandLinkStyle: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
};

const pageMetaStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
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
  color: "var(--wm-text-soft)",
  maxWidth: 420,
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
