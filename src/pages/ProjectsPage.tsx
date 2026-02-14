import React from "react";
import { Link } from "react-router-dom";

export default function ProjectsPage() {
  return (
    <div>
      <div className="wm-kicker">Workspace</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>Projects</div>
      <p className="wm-p" style={{ marginTop: 10 }}>
        Project management foundation. Use tool routes to generate design inputs, then track status here.
      </p>

      <div className="wm-divider" />

      <div className="wm-card wm-card-pad">
        <div className="wm-h2">Next implementation steps</div>
        <ul className="wm-p" style={{ marginTop: 8, paddingLeft: 18 }}>
          <li>Persist project list and metadata to backend storage.</li>
          <li>Attach room design outputs and generated BOM snapshots.</li>
          <li>Expose proposal export history per project.</li>
        </ul>
        <div className="wm-row" style={{ marginTop: 10 }}>
          <Link className="wm-btn" to="/tools/room-wizard">Open Room Wizard</Link>
          <Link className="wm-btn wm-btn-primary" to="/tools/proposal-builder">Open Proposal Builder</Link>
        </div>
      </div>
    </div>
  );
}
