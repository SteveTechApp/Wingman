import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardList, FolderOpen, LayoutTemplate, PlusCircle } from "lucide-react";
import {
  getActiveProject,
  subscribeProjects,
} from "@/features/projects/projectStore";

type IconType = React.ComponentType<{ size?: string | number; className?: string }>;

type ActionCard = {
  title: string;
  description: string;
  to: string;
  Icon: IconType;
  accentRgb: string;
};

const startCards: ActionCard[] = [
  {
    title: "Start a new project",
    description: "Create a new Wingman project and begin requirements capture.",
    to: "/app/projects/new",
    Icon: PlusCircle,
    accentRgb: "59, 212, 208",
  },
  {
    title: "Import a brief",
    description: "Bring in customer notes or scope information and structure it.",
    to: "/app/tools/import-intake",
    Icon: ClipboardList,
    accentRgb: "242, 140, 40",
  },
  {
    title: "Browse architecture starters",
    description: "Use templates and proven solution patterns as a starting point.",
    to: "/app/tools/templates",
    Icon: LayoutTemplate,
    accentRgb: "75, 141, 255",
  },
];

function CompactActionCard({
  title,
  description,
  to,
  Icon,
  accentRgb,
  onOpen,
}: ActionCard & { onOpen: (to: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(to)}
      className="wm-card wm-dashboard-page__action-card"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        gap: 10,
        minHeight: 0,
        padding: 10,
        textAlign: "left",
        borderRadius: 12,
        cursor: "pointer",
        color: "var(--wm-text)",
        "--wm-action-accent-rgb": accentRgb,
      } as React.CSSProperties}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          className="wm-dashboard-page__action-card-icon"
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          <Icon size={16} />
        </span>

        <ArrowRight size={18} className="wm-dashboard-page__action-card-arrow" />
      </div>

      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 10,
            opacity: 0.78,
            lineHeight: 1.35,
          }}
        >
          {description}
        </div>
      </div>

      <div
        className="wm-dashboard-page__action-card-cta"
        style={{
          fontSize: 10,
          fontWeight: 700,
          opacity: 0.86,
        }}
      >
        Open
      </div>
    </button>
  );
}

function RailLink({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wm-card wm-dashboard-page__rail-link"
      style={{
        display: "grid",
        gap: 6,
        padding: 12,
        minHeight: 0,
        textAlign: "left",
        borderRadius: 14,
        cursor: "pointer",
        color: "var(--wm-text)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700 }}>{title}</span>
        <FolderOpen size={17} />
      </div>
      <span style={{ fontSize: 10, opacity: 0.72, lineHeight: 1.35 }}>{subtitle}</span>
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const activeProject = React.useSyncExternalStore(
    subscribeProjects,
    () => getActiveProject() ?? null,
    () => null,
  );

  const activeProjectName = activeProject?.name ?? "No active project";

  const activeProjectSubtitle = activeProject?.customer
    ? activeProject.customer
    : "Open an existing project or create a new one to continue.";

  const pickUpWork = React.useMemo(() => {
    if (!activeProject) {
      return [];
    }

    return [
      {
        title: activeProject.name ?? "Active project",
        subtitle: activeProject.customer || "Continue working on this project.",
        to: "/app/projects",
      },
    ];
  }, [activeProject]);

  return (
    <div
      className="wm-dashboard-page"
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      <section
        className="wm-card wm-dashboard-page__hero"
        style={{
          padding: 10,
          borderRadius: 14,
          display: "grid",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: 0.72,
                marginBottom: 4,
              }}
            >
              Mission Control
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                lineHeight: 1.06,
                fontWeight: 800,
              }}
            >
              What do you want to move forward today?
            </h1>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="wm-btn-nav wm-btn-nav--primary"
              onClick={() => navigate("/app/tools/discovery")}
              style={{ minHeight: 36, padding: "0 13px", borderRadius: 12 }}
            >
              Resume Guided Project
            </button>
            <button
              type="button"
              className="wm-btn-nav"
              onClick={() => navigate("/app/tools/import-intake")}
              style={{ minHeight: 36, padding: "0 13px", borderRadius: 12 }}
            >
              Import Customer Brief
            </button>
            <button
              type="button"
              className="wm-btn-nav"
              onClick={() => navigate("/app/projects")}
              style={{ minHeight: 36, padding: "0 13px", borderRadius: 12 }}
            >
              Open Projects
            </button>
          </div>
        </div>

        <div
          className="wm-card wm-dashboard-page__active-project"
          style={{
            padding: 10,
            borderRadius: 12,
            minHeight: "unset",
            display: "grid",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.72,
            }}
          >
            Active Project
          </div>

          <div
            style={{
              fontSize: 24,
              lineHeight: 1.02,
              fontWeight: 800,
            }}
          >
            {activeProjectName}
          </div>

          <div
            style={{
              fontSize: 10,
              opacity: 0.76,
              lineHeight: 1.35,
            }}
          >
            {activeProjectSubtitle}
          </div>

          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            Next best move:{" "}
            <button
              type="button"
              onClick={() => navigate("/app/tools/discovery")}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                margin: 0,
                cursor: "pointer",
                font: "inherit",
                fontWeight: 800,
                color: "var(--wm-text)",
              }}
            >
              Resume Guided Project
            </button>
          </div>
        </div>
      </section>

      <section
        className="wm-dashboard-page__main-grid"
        style={{
          display: "grid",
          gap: 8,
          alignItems: "start",
        }}
      >
        <div
          className="wm-card wm-dashboard-page__start-panel"
          style={{
            padding: 10,
            borderRadius: 14,
            display: "grid",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Start a Project
          </div>

          <div
            className="wm-dashboard__start-grid wm-dashboard-page__start-grid"
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {startCards.map((card) => (
              <CompactActionCard
                key={card.title}
                {...card}
                onOpen={(to) => navigate(to)}
              />
            ))}
          </div>
        </div>

        <section
          className="wm-card wm-dashboard-page__panel"
          style={{
            padding: 10,
            borderRadius: 14,
            display: "grid",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Pick up work
          </div>

          {pickUpWork.length ? (
            pickUpWork.map((item) => (
              <RailLink
                key={item.title}
                title={item.title}
                subtitle={item.subtitle}
                onClick={() => navigate(item.to)}
              />
            ))
          ) : (
            <div
              className="wm-card"
              style={{
                padding: 12,
                borderRadius: 14,
                fontSize: 10,
                opacity: 0.78,
                lineHeight: 1.4,
              }}
            >
              No active work yet. Start a new project or import a brief.
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
