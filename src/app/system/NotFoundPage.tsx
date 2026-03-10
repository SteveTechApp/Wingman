import * as React from "react";

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="wm-page">
      <div className="wm-card wm-card-pad">
        <div className="wm-h1">Not Found</div>
        <p className="wm-p" style={{ marginTop: 10 }}>The page you requested does not exist.</p>
        <div className="wm-row" style={{ marginTop: 12 }}>
          <Link className="wm-btn wm-btn-primary" to="/app/dashboard">Dashboard</Link>
          <Link className="wm-btn" to="/app/tools">Tool Hub</Link>
        </div>
      </div>
    </div>
  );
}
