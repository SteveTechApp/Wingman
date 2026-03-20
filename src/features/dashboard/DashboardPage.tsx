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
      "Set up a clean project shell and move straight into discovery.",
    supportingPoints: [
      "Capture the basics",
      "Shape the room scope",
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
      "Turn a brief, tender, or notes into a workable project start.",
    supportingPoints: [
      "Bring in source material",
      "Pull out key signals",
      "Skip manual setup",
    ],
    to: WM_ROUTES.importIntake,
    accentRgb: "108, 196, 255",
    Icon: ClipboardList,
  },
  {
    eyebrow: "Templates",
    title: "Browse architecture starters",
    description:
      "Use proven room starters to move faster and stay consistent.",
    supportingPoints: [
      "Start from tested patterns",
      "Move faster early",
      "Stay consistent",
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
            <div className="wm-title-xl">Pick the fastest way to start.</div>
            <div className="wm-body-sm wm-page-subtitle-muted" style={{ maxWidth: 820 }}>
              Start clean, import the brief, or jump in with a proven template.
            </div>
          </div>
        </div>
      </section>

      <section className="wm-section wm-section--tone-cyan wm-dashboard-page__panel">
        <div className="wm-section__head">
          <div className="wm-section__titles">
            <h2>Start Paths</h2>
            <p>Choose the clearest route for the job in front of you.</p>
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
              <div className="wm-dashboard-page__action-card-top">
                <div className="wm-kicker" style={{ color: `rgba(${card.accentRgb}, 0.96)` }}>
                  {card.eyebrow}
                </div>

                <div className="wm-dashboard-page__action-card-head">
                  <span
                    className="wm-dashboard-page__action-card-icon"
                    style={{
                      border: `1px solid rgba(${card.accentRgb}, 0.28)`,
                    }}
                  >
                    <card.Icon />
                  </span>

                  <div className="wm-dashboard-page__action-card-copy">
                    <div className="wm-title-lg wm-dashboard-page__action-card-title">
                      {card.title}
                    </div>
                    <div className="wm-body wm-dashboard-page__action-card-description">
                      {card.description}
                    </div>
                  </div>
                </div>

                <div className="wm-dashboard-page__action-tags">
                  {card.supportingPoints.map((point) => (
                    <span
                      key={point}
                      className="wm-dashboard-page__action-tag"
                      style={{
                        borderColor: `rgba(${card.accentRgb}, 0.22)`,
                        color: `rgba(${card.accentRgb}, 0.96)`,
                      }}
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>

              <div className="wm-dashboard-page__action-card-footer">
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
