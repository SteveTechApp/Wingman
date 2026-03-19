import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  FolderPlus,
  LayoutTemplate,
} from "lucide-react";

import { WM_ROUTES } from "@/core/wingman/routeMap";

type WorkflowCard = {
  eyebrow: string;
  title: string;
  description: string;
  supportingPoints: string[];
  to: string;
  accentRgb: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const workflowCards: WorkflowCard[] = [
  {
    eyebrow: "Discovery",
    title: "Start a new project",
    description:
      "Create a new Wingman project, capture requirements, and begin building a structured AV solution.",
    supportingPoints: [
      "Capture customer requirements",
      "Define room and scope",
      "Start guided design",
    ],
    to: WM_ROUTES.newProject,
    accentRgb: "115, 231, 255",
    Icon: FolderPlus,
  },
  {
    eyebrow: "Import",
    title: "Import a brief",
    description:
      "Bring in customer notes, tender text, or survey data and convert it into a structured project.",
    supportingPoints: [
      "Import notes or scope",
      "Structure the brief",
      "Reduce manual setup",
    ],
    to: WM_ROUTES.importIntake,
    accentRgb: "108, 196, 255",
    Icon: ClipboardList,
  },
  {
    eyebrow: "Templates",
    title: "Browse architecture starters",
    description:
      "Start from proven room and solution templates to move faster and stay consistent.",
    supportingPoints: [
      "Use proven templates",
      "Speed up early design",
      "Keep solutions consistent",
    ],
    to: WM_ROUTES.templates,
    accentRgb: "96, 194, 132",
    Icon: LayoutTemplate,
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="wm-page wm-dashboard-page">
      <section className="wm-hero wm-dashboard-page__hero">
        <div className="wm-page-hero-row">
          <div className="wm-grid">
            <div className="wm-kicker">Mission Control</div>
            <div className="wm-title-xl">What do you want to move forward today?</div>
            <div className="wm-body-sm wm-page-subtitle-muted" style={{ maxWidth: 820 }}>
              Start from a clean project shell, import an existing brief, or use a proven template path.
              The app should feel like the guided project page: clear separation, obvious next moves, and
              just enough colour to make each choice distinct.
            </div>
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-cyan wm-dashboard-page__panel">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Start Paths</h2>
            <p>Choose the cleanest entry point for the opportunity in front of you.</p>
          </div>
        </div>

        <div className="wm-grid-cards wm-dashboard-page__start-grid">
          {workflowCards.map((card) => (
            <button
              key={card.title}
              type="button"
              className="wm-work-card wm-dashboard-page__action-card wm-hover-lift"
              style={{
                "--wm-action-accent-rgb": card.accentRgb,
                appearance: "none",
                width: "100%",
                minHeight: 0,
                textAlign: "left",
                cursor: "pointer",
                color: "inherit",
              } as React.CSSProperties}
              onClick={() => navigate(card.to)}
            >
              <div className="wm-dashboard-page__action-card-top" style={{ display: "grid", gap: 12 }}>
                <div className="wm-kicker" style={{ color: `rgba(${card.accentRgb}, 0.96)` }}>
                  {card.eyebrow}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 12, alignItems: "start" }}>
                  <span
                    className="wm-dashboard-page__action-card-icon"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid rgba(${card.accentRgb}, 0.28)`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <card.Icon />
                  </span>

                  <div style={{ display: "grid", gap: 8 }}>
                    <div className="wm-title-lg" style={{ fontSize: 22, lineHeight: 1.14 }}>
                      {card.title}
                    </div>
                    <div className="wm-body" style={{ fontSize: 14, lineHeight: 1.6 }}>
                      {card.description}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {card.supportingPoints.map((point) => (
                    <div
                      key={point}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "10px 1fr",
                        gap: 10,
                        alignItems: "start",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          marginTop: 6,
                          background: `rgba(${card.accentRgb}, 0.9)`,
                        }}
                      />
                      <span className="wm-body-sm" style={{ fontSize: 13, lineHeight: 1.55 }}>
                        {point}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span className="wm-dashboard-page__action-card-cta">Open</span>
                <span className="wm-dashboard-page__action-card-arrow">
                  <ArrowRight size={18} />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
