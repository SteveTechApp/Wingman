import React from "react";
import { Link } from "react-router-dom";

export default function VideoWallPlannerPage() {
  return (
    <div className="wm-page">
      <div className="wm-page-header">
        <div>
          <div className="wm-page-title">Video Wall Planner</div>
          <div className="wm-page-sub">Plan canvas size, matrices, and deployment assumptions.</div>
        </div>
      </div>

      <div className="wm-page-body" style={{ display: "grid", gap: "var(--wm-gap)" }}>
        <div className="wm-card wm-card-pad">
          <div className="wm-h2">Planning workflow</div>
          <p className="wm-p" style={{ marginTop: 8 }}>
            Define wall dimensions, output targets, and control/network requirements before final BOM selection.
          </p>
          <div className="wm-row" style={{ marginTop: 10 }}>
            <Link className="wm-btn wm-btn-primary" to="/tools/room-wizard">Start with Room Wizard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
