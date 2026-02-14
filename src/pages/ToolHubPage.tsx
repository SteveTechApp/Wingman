import React from "react";
import { Link } from "react-router-dom";
import { featuresByArea } from "@/data/featureRegistry";

const TOOL_CARDS = featuresByArea("tools");

function statusTone(status: "live" | "scaffold") {
  return status === "live" ? "rgba(16,185,129,.9)" : "rgba(148,163,184,.85)";
}

export default function ToolHubPage() {
  return (
    <div className="wm-container wm-page">
      <div className="wm-kicker">Tools</div>
      <div className="wm-h1" style={{ marginTop: 6 }}>
        Tool Hub
      </div>
      <p className="wm-p" style={{ marginTop: 6 }}>
        Pre-sales toolset for distributors and system integrators.
      </p>

      <div className="wm-divider" />

      <div className="wm-grid wm-grid-3">
        {TOOL_CARDS.map((tool) => (
          <Link key={tool.id} className="wm-card wm-card-pad" to={tool.route} style={{ textDecoration: "none" }}>
            <div className="wm-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div className="wm-h2">{tool.label}</div>
              <span className="wm-chip" style={{ fontSize: 10, color: statusTone(tool.status) }}>
                {tool.status === "live" ? "Live" : "Scaffold"}
              </span>
            </div>
            <div className="wm-p" style={{ marginTop: 6, opacity: 0.9 }}>
              {tool.route}
            </div>
            <div className="wm-p" style={{ marginTop: 6 }}>{tool.summary}</div>
            <div className="wm-p" style={{ marginTop: 6, opacity: 0.65, fontSize: 11 }}>
              {tool.source}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
