import React from "react";
import { Link } from "react-router-dom";

type ToolCard = {
  label: string;
  route: string;
  source: string;
};

const TOOL_CARDS: ToolCard[] = [
  {
    label: "Competitor Compare",
    route: "/tools/competitor-compare",
    source: "src/pages/tools/CompetitorComparePage.tsx",
  },
  {
    label: "Proposal Builder",
    route: "/tools/proposal-builder",
    source: "src/pages/tools/ProposalBuilderPage.tsx",
  },
  {
    label: "Room Wizard",
    route: "/tools/room-wizard",
    source: "src/pages/tools/RoomWizardPage.tsx",
  },
  {
    label: "Training Hub",
    route: "/tools/training-hub",
    source: "src/pages/tools/TrainingHubPage.tsx",
  },
  {
    label: "Video Wall Planner",
    route: "/tools/video-wall-planner",
    source: "src/pages/tools/VideoWallPlannerPage.tsx",
  },
  {
    label: "Product Catalog",
    route: "/tools/catalog",
    source: "src/pages/tools/ProductCatalogPage.tsx",
  },
];

export default function ToolHubPage() {
  return (
    <div className="wm-container wm-page">
      <div className="wm-kicker">Tools</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>
        Tool Hub
      </div>
      <p className="wm-p" style={{ marginTop: 6 }}>
        Pre-sales toolset for distributors and system integrators.
      </p>

      <div className="wm-divider" />

      <div className="wm-grid wm-grid-3">
        {TOOL_CARDS.map((tool) => (
          <Link key={tool.route} className="wm-card wm-card-pad" to={tool.route} style={{ textDecoration: "none" }}>
            <div className="wm-h2">{tool.label}</div>
            <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>
              {tool.route}
            </div>
            <div className="wm-p" style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>
              {tool.source}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
