import * as React from "react";
import { Link } from "react-router-dom";
import { advanceActiveWorkflowProject, getActiveWorkflowProject } from "@/workflow/workflowStore";

export default function DiscoveryCompletePage() {
  const active = React.useMemo(() => getActiveWorkflowProject(), []);

  React.useEffect(() => {
    advanceActiveWorkflowProject("architecture");
  }, []);

  return (
    <div className="wm-page">
      <section className="wm-card" style={{ padding: 20 }}>
        <div className="wm-mc-kicker">Discovery complete</div>
        <h1 className="wm-title" style={{ marginTop: 10 }}>
          {active ? `${active.name} moved to Architecture` : "Project moved to Architecture"}
        </h1>
        <p className="wm-muted" style={{ marginTop: 10 }}>
          The active project has progressed to the next workflow stage.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
          <Link to="/app/dashboard" className="wm-btn wm-btn-primary">
            Return to Mission Control
          </Link>
          <button
            type="button"
            className="wm-btn wm-btn-secondary"
            onClick={() => advanceActiveWorkflowProject("products")}
          >
            Mark Products Next
          </button>
        </div>
      </section>
    </div>
  );
}