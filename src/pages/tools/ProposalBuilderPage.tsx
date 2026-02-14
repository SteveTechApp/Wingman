import React from "react";
import { Link } from "react-router-dom";
import ToolPageLayout from "@/components/layout/ToolPageLayout";

export default function ProposalBuilderPage() {
  return (
    <ToolPageLayout
      title="Proposal Builder"
      subtitle="Prepare proposal-ready outputs from workspace projects."
    >
      <div className="wm-card wm-card-pad">
        <div className="wm-h2">Start from workspace</div>
        <p className="wm-p" style={{ marginTop: 8 }}>
          Proposal generation uses project data. Open your projects list, then build and export from there.
        </p>
        <div className="wm-row" style={{ marginTop: 10 }}>
          <Link className="wm-btn wm-btn-primary" to="/app/projects">
            Go to Projects
          </Link>
        </div>
      </div>
    </ToolPageLayout>
  );
}
