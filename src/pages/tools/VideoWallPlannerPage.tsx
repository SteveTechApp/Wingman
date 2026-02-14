import React from "react";
import { Link } from "react-router-dom";
import ToolPageLayout from "@/components/layout/ToolPageLayout";

export default function VideoWallPlannerPage() {
  return (
    <ToolPageLayout
      title="Video Wall Planner"
      subtitle="Plan canvas size, matrices, and deployment assumptions."
    >
      <div className="wm-card wm-card-pad">
        <div className="wm-h2">Planning workflow</div>
        <p className="wm-p" style={{ marginTop: 8 }}>
          Define wall dimensions, output targets, and control/network requirements before final BOM selection.
        </p>
        <div className="wm-row" style={{ marginTop: 10 }}>
          <Link className="wm-btn wm-btn-primary" to="/tools/room-wizard">
            Start with Room Wizard
          </Link>
        </div>
      </div>
    </ToolPageLayout>
  );
}
