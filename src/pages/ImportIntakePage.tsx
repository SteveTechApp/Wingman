import React from "react";
import { Link } from "react-router-dom";

export default function ImportIntakePage() {
  return (
    <div>
      <div className="wm-kicker">Workspace</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>Import Intake</div>
      <p className="wm-p" style={{ marginTop: 10 }}>
        Intake workspace for client briefs, requirement extraction, and kickoff scoping.
      </p>

      <div className="wm-divider" />

      <div className="wm-card wm-card-pad">
        <div className="wm-h2">Planned import pipeline</div>
        <ul className="wm-p" style={{ marginTop: 8, paddingLeft: 18 }}>
          <li>Upload proposal briefs and survey data.</li>
          <li>Extract key requirements and room constraints.</li>
          <li>Route accepted requirements into Room Wizard.</li>
        </ul>
        <div className="wm-row" style={{ marginTop: 10 }}>
          <Link className="wm-btn wm-btn-primary" to="/tools/room-wizard">Continue to Room Wizard</Link>
        </div>
      </div>
    </div>
  );
}
