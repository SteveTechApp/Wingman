import * as React from "react";

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="wm-page-shell">
      <div className="wm-section wm-page-stack">
        <div className="wm-page-stack">
          <div className="wm-page-kicker">System</div>
          <h1 className="wm-page-title">Not Found</h1>
          <p className="wm-page-subtitle">The page you requested does not exist.</p>
        </div>

        <div className="wm-action-row">
          <Link className="wm-btn wm-btn-primary" to="/app/dashboard">Dashboard</Link>
          <Link className="wm-btn" to="/app/tools">Tool Hub</Link>
        </div>
      </div>
    </div>
  );
}

