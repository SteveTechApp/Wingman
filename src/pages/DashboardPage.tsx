import React from "react";

export default function DashboardPage() {
  return (
    <div>
      <div className="wm-kicker">Workspace</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>Dashboard</div>
      <p className="wm-p" style={{ marginTop: 10 }}>
        Commercial baseline installed. Next: wire real data sources, product rules, and proposal outputs.
      </p>

      <div className="wm-divider"></div>

      <div className="wm-grid wm-grid-3">
        <div className="wm-card wm-card-pad">
          <div className="wm-h2">Active Projects</div>
          <p className="wm-p" style={{ marginTop: 8 }}>Scaffold. Add project store + CRM sync later.</p>
        </div>
        <div className="wm-card wm-card-pad">
          <div className="wm-h2">Design Shortcuts</div>
          <p className="wm-p" style={{ marginTop: 8 }}>Use Tool Hub for Room/VideoWall/Proposal.</p>
        </div>
        <div className="wm-card wm-card-pad">
          <div className="wm-h2">Knowledge</div>
          <p className="wm-p" style={{ marginTop: 8 }}>Training Hub scaffold is ready.</p>
        </div>
      </div>
    </div>
  );
}