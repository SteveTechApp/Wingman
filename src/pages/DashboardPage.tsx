import React from "react";
import { Link } from "react-router-dom";
import { featuresByArea } from "@/data/featureRegistry";

const WORKSPACE_FEATURES = featuresByArea("workspace");
const TOOL_FEATURES = featuresByArea("tools");

export default function DashboardPage() {
  return (
    <div>
      <div className="wm-kicker">Workspace</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>
        Dashboard
      </div>
      <p className="wm-p" style={{ marginTop: 10 }}>
        Current Wingman feature inventory and launch points.
      </p>

      <div className="wm-divider" />

      <div className="wm-grid wm-grid-3">
        {WORKSPACE_FEATURES.map((feature) => (
          <Link key={feature.id} to={feature.route} className="wm-card wm-card-pad" style={{ textDecoration: "none" }}>
            <div className="wm-h2">{feature.label}</div>
            <p className="wm-p" style={{ marginTop: 8 }}>{feature.summary}</p>
          </Link>
        ))}
      </div>

      <div className="wm-divider" />

      <div className="wm-kicker">Applications</div>
      <div className="wm-grid wm-grid-3" style={{ marginTop: 10 }}>
        {TOOL_FEATURES.map((feature) => (
          <Link key={feature.id} to={feature.route} className="wm-card wm-card-pad" style={{ textDecoration: "none" }}>
            <div className="wm-h2">{feature.label}</div>
            <p className="wm-p" style={{ marginTop: 8 }}>{feature.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
