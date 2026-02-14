import React from "react";
import { Link } from "react-router-dom";

export default function TrainingHubPage() {
  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Training Hub</div>
          <div className="wm-page-sub">Enablement resources, certifications, and onboarding guidance.</div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: "var(--wm-gap)" }}>
        <div className="wm-card wm-card-pad">
          <div className="wm-h2">Recommended next steps</div>
          <ul className="wm-p" style={{ marginTop: 8, paddingLeft: 18 }}>
            <li>Start with terminology and platform fundamentals.</li>
            <li>Complete AVoIP and video wall modules for project readiness.</li>
            <li>Use projects to apply modules to live opportunities.</li>
          </ul>
          <div className="wm-row" style={{ marginTop: 10 }}>
            <Link className="wm-btn" to="/app/dashboard">Return to Workspace</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
