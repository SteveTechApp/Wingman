import React from "react";
import { Link } from "react-router-dom";

export default function ProposalBuilderPage() {
  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Proposal Builder</div>
          <div className="wm-page-sub">Prepare proposal-ready outputs from workspace projects.</div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: "var(--wm-gap)" }}>
        <div className="wm-card wm-card-pad">
          <div className="wm-h2">Start from workspace</div>
          <p className="wm-p" style={{ marginTop: 8 }}>
            Proposal generation uses project data. Open your projects list, then build and export from there.
          </p>
          <div className="wm-row" style={{ marginTop: 10 }}>
            <Link className="wm-btn wm-btn-primary" to="/app/projects">Go to Projects</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
