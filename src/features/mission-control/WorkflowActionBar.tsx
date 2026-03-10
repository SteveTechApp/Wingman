import * as React from "react";
import { Link } from "react-router-dom";
import {
  getActiveWorkflowProject,
  advanceActiveWorkflowProject,
} from "@/workflow/workflowStore";

export default function WorkflowActionBar() {
  const [, setTick] = React.useState(0);
  const active = getActiveWorkflowProject();

  const moveTo = (stage: "architecture" | "products" | "proposal") => {
    advanceActiveWorkflowProject(stage);
    setTick((v) => v + 1);
  };

  return (
    <section className="wm-mc-actions-panel wm-card">
      <div className="wm-mc-actions-head">
        <div>
          <div className="wm-mc-kicker">Active project</div>
          <h2 className="wm-subtitle wm-mc-actions-title">
            {active ? active.name : "No active project selected"}
          </h2>
          <p className="wm-muted wm-mc-actions-copy">
            {active
              ? `Current stage: ${active.stage}`
              : "Select or create a project from Mission Control."}
          </p>
        </div>
      </div>

      <div className="wm-mc-actions-grid">
        <Link to="/app/tools/discovery" className="wm-btn wm-btn-primary">
          Open Guided Project
        </Link>

        <button
          type="button"
          className="wm-btn wm-btn-secondary"
          onClick={() => moveTo("architecture")}
          disabled={!active}
        >
          Mark Architecture
        </button>

        <button
          type="button"
          className="wm-btn wm-btn-secondary"
          onClick={() => moveTo("products")}
          disabled={!active}
        >
          Mark Products
        </button>

        <button
          type="button"
          className="wm-btn wm-btn-secondary"
          onClick={() => moveTo("proposal")}
          disabled={!active}
        >
          Mark Proposal
        </button>
      </div>
    </section>
  );
}
