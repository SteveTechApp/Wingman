import React from "react";
import { Link } from "react-router-dom";

export default function ToolHubPage() {
  return (
    <div className="wm-container wm-page"><div className="wm-kicker">Tools</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>Tool Hub</div>
      <p className="wm-p" style={{ marginTop: 6 }}>
        Pre-sales toolset for distributors and system integrators.
      </p>

      <div className="wm-divider" />

      <div className="wm-grid wm-grid-3">
        <Link className="wm-card wm-card-pad" to="/tools/competitor-compare" style={{ textDecoration: "none" }}>
          <div className="wm-h2">Competitor Compare</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>/tools/competitor-compare</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>src/pages/tools/CompetitorComparePage.tsx</div>
        </Link>
        <Link className="wm-card wm-card-pad" to="/tools/proposal-builder" style={{ textDecoration: "none" }}>
          <div className="wm-h2">Proposal Builder</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>/tools/proposal-builder</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>src/pages/tools/ProposalBuilderPage.tsx</div>
        </Link>
        <Link className="wm-card wm-card-pad" to="/tools/room-wizard" style={{ textDecoration: "none" }}>
          <div className="wm-h2">Room Wizard</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>/tools/room-wizard</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>src/pages/tools/RoomWizardPage.tsx</div>
        </Link>
        <Link className="wm-card wm-card-pad" to="/tools/training-hub" style={{ textDecoration: "none" }}>
          <div className="wm-h2">Training Hub</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>/tools/training-hub</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>src/pages/tools/TrainingHubPage.tsx</div>
        </Link>
        <Link className="wm-card wm-card-pad" to="/tools/video-wall-planner" style={{ textDecoration: "none" }}>
          <div className="wm-h2">Video Wall Planner</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>/tools/video-wall-planner</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>src/pages/tools/VideoWallPlannerPage.tsx</div>
        </Link>
        <Link className="wm-card wm-card-pad" to="/tools/catalog" style={{ textDecoration: "none" }}>
          <div className="wm-h2">Product Catalog</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>/tools/catalog</div>
          <div className="wm-p" style={{ marginTop: 6, opacity: 0.7, fontSize: 11 }}>src/pages/tools/ProductCatalogPage.tsx</div>
        </Link>
      </div>
    </div>
  );
}
