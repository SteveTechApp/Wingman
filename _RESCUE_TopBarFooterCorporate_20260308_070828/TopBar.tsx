import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Home,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

function pageTitle(pathname: string): { title: string; subtitle: string } {
  if (pathname.startsWith("/app/dashboard")) {
    return {
      title: "Dashboard",
      subtitle: "Overview of projects, activity, and recommended next steps.",
    };
  }

  if (pathname.startsWith("/app/projects")) {
    return {
      title: "Projects",
      subtitle: "Manage active opportunities, drafts, and saved workspaces.",
    };
  }

  if (pathname.startsWith("/app/tools/discovery")) {
    return {
      title: "Discovery",
      subtitle: "Capture customer requirements before selecting products.",
    };
  }

  if (pathname.startsWith("/app/tools/room-wizard")) {
    return {
      title: "Room Wizard",
      subtitle: "Build a guided room baseline and system starting point.",
    };
  }

  if (pathname.startsWith("/app/tools/catalog")) {
    return {
      title: "Product Catalog",
      subtitle: "Browse WyreStorm products and compare suitable options.",
    };
  }

  if (pathname.startsWith("/app/tools/competitor-compare")) {
    return {
      title: "Competitor Compare",
      subtitle: "Position WyreStorm against alternative manufacturer options.",
    };
  }

  if (pathname.startsWith("/app/tools/proposal-builder")) {
    return {
      title: "Proposal Builder",
      subtitle: "Prepare BOM, pricing structure, and customer-facing outputs.",
    };
  }

  if (pathname.startsWith("/app/tools/templates")) {
    return {
      title: "Templates",
      subtitle: "Start from repeatable room, market, and system baselines.",
    };
  }

  if (pathname.startsWith("/app/tools")) {
    return {
      title: "ToolHub",
      subtitle: "Launch tools quickly and follow a guided sales workflow.",
    };
  }

  return {
    title: "Wingman",
    subtitle: "Sales and design support workspace.",
  };
}

function readActiveProjectName(): string {
  try {
    const raw =
      localStorage.getItem("wm_active_project") ||
      localStorage.getItem("wm_project_active") ||
      localStorage.getItem("wm_current_project");

    if (!raw) return "No active project";

    const parsed = JSON.parse(raw);
    return parsed?.name || parsed?.projectName || parsed?.title || "No active project";
  } catch {
    return "No active project";
  }
}

function useWindowWidth(): number {
  const [width, setWidth] = React.useState<number>(() => {
    if (typeof window === "undefined") return 1440;
    return window.innerWidth;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

function TopButton({
  label,
  onClick,
  Icon,
  primary = false,
  disabled = false,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  Icon?: React.ComponentType<{ size?: string | number; className?: string }>;
  primary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={compact ? label : undefined}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? 0 : 8,
        minHeight: 38,
        minWidth: compact ? 38 : undefined,
        padding: compact ? "0 10px" : "0 12px",
        borderRadius: 12,
        border: primary
          ? "1px solid rgba(76,224,211,0.28)"
          : "1px solid rgba(150,190,255,0.14)",
        background: disabled
          ? "rgba(255,255,255,0.03)"
          : primary
            ? "linear-gradient(135deg, rgba(10,121,117,0.92), rgba(16,78,136,0.88))"
            : "rgba(255,255,255,0.045)",
        color: disabled ? "rgba(220,230,242,0.38)" : "#eef6ff",
        fontSize: 13,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled
          ? "none"
          : primary
            ? "0 8px 18px rgba(0,0,0,0.18)"
            : "0 4px 12px rgba(0,0,0,0.10)",
        whiteSpace: "nowrap",
      }}
    >
      {Icon ? <Icon size={15} /> : null}
      {!compact ? <span>{label}</span> : null}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  Icon,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  Icon: React.ComponentType<{ size?: string | number; className?: string }>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        border: "1px solid rgba(150,190,255,0.14)",
        background: disabled ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.045)",
        color: disabled ? "rgba(220,230,242,0.38)" : "#eef6ff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 4px 12px rgba(0,0,0,0.10)",
      }}
    >
      <Icon size={15} />
    </button>
  );
}

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const width = useWindowWidth();

  const { title, subtitle } = React.useMemo(
    () => pageTitle(location.pathname),
    [location.pathname]
  );

  const activeProjectName = React.useMemo(
    () => readActiveProjectName(),
    [location.pathname]
  );

  const canGoBack =
    typeof window !== "undefined" ? window.history.length > 1 : false;

  const isNarrow = width < 1200;
  const isVeryNarrow = width < 980;
  const isUltraNarrow = width < 760;

  const showSubtitle = !isVeryNarrow;
  const showProjectStrip = !isNarrow;
  const showProjectsButton = !isVeryNarrow;
  const showHomeButton = !isUltraNarrow;

  const handleStartProject = React.useCallback(() => {
    try {
      const blankProject = {
        name: `New Project ${Math.floor(Math.random() * 900 + 100)}`,
        status: "Draft",
        skuCount: 0,
        proposalState: "None",
        updatedAt: new Date().toLocaleString(),
        createdAt: new Date().toISOString(),
        items: [],
        skus: [],
      };

      localStorage.setItem("wm_active_project", JSON.stringify(blankProject));
    } catch {
      // continue regardless
    }

    navigate("/app/projects");
  }, [navigate]);

  return (
    <div
      className="wm-topbar"
      style={{
        minHeight: 56,
        padding: "8px 14px",
        display: "grid",
        gridTemplateColumns: showProjectStrip
          ? "minmax(220px, auto) minmax(260px, 560px) auto"
          : "minmax(220px, 1fr) auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          aria-label="Go to dashboard"
          title="Go to dashboard"
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            border: "1px solid rgba(76,224,211,0.18)",
            background:
              "linear-gradient(135deg, rgba(9,76,80,0.40), rgba(10,48,90,0.30))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#f4fbff",
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          <Sparkles size={17} />
        </button>

        <div
          style={{
            minWidth: 0,
            display: "grid",
            gap: 2,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              lineHeight: 1.05,
              color: "#f4fbff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>

          {showSubtitle ? (
            <div
              style={{
                fontSize: 11, color: "rgba(205,218,235,0.70)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {showProjectStrip ? (
        <div
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              minWidth: 0,
              maxWidth: 500,
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px",
              minHeight: 36,
              borderRadius: 12,
              border: "1px solid rgba(150,190,255,0.12)",
              background: "rgba(255,255,255,0.035)",
            }}
          >
            <Search size={15} />
            <div
              style={{
                minWidth: 0,
                display: "grid",
                gap: 1,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "rgba(190,205,225,0.58)",
                }}
              >
                Active Project
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#eef6ff",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeProjectName}
              </div>
            </div>

            <TopButton
              label="Open"
              onClick={() => navigate("/app/projects")}
              Icon={FolderOpen}
            />
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        <IconButton
          label="Back"
          onClick={() => navigate(-1)}
          Icon={ArrowLeft}
          disabled={!canGoBack}
        />
        <IconButton
          label="Forward"
          onClick={() => navigate(1)}
          Icon={ArrowRight}
        />

        {showHomeButton ? (
          <TopButton
            label="Home"
            onClick={() => navigate("/app/dashboard")}
            Icon={Home}
          />
        ) : null}

        {showProjectsButton ? (
          <TopButton
            label="Projects"
            onClick={() => navigate("/app/projects")}
            Icon={FolderOpen}
          />
        ) : null}

        <TopButton
          label="New Project"
          onClick={handleStartProject}
          Icon={Plus}
          primary
          compact={isVeryNarrow}
        />
      </div>
    </div>
  );
}
