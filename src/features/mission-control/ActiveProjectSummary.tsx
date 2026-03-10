import * as React from "react";
import {
  getActiveWorkflowProject,
} from "@/workflow/workflowStore";

function recommendation(active: ReturnType<typeof getActiveWorkflowProject>): string {
  if (!active) return "Create or select a project from Mission Control.";
  switch (active.stage) {
    case "discovery":
      return "Run Discovery Wizard and confirm sources, displays, signal distance, USB, control, and audio needs.";
    case "architecture":
      return "Select the right signal transport model and define system architecture before final product choice.";
    case "products":
      return "Map architecture to WyreStorm products and accessories.";
    case "proposal":
      return "Build the commercial output and customer-facing proposal.";
    case "closed":
      return "Project complete. Review and reuse as a future template if suitable.";
    default:
      return "Continue the project workflow.";
  }
}

export default function ActiveProjectSummary() {
  const [, setTick] = React.useState(0);
  const active = getActiveWorkflowProject();

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 700);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="wm-mc-summary wm-card">
      <div className="wm-mc-summary-head">
        <div>
          <div className="wm-mc-kicker">Active project</div>
          <h2 className="wm-subtitle wm-mc-summary-title">
            {active ? active.name : "No active project selected"}
          </h2>
          <p className="wm-muted wm-mc-summary-copy">
            {recommendation(active)}
          </p>
        </div>
      </div>

      {active ? (
        <>
          <div className="wm-mc-summary-grid">
            <div className="wm-kpi-card">
              <div className="wm-kpi-label">Customer</div>
              <div className="wm-mc-summary-value">{active.customer}</div>
            </div>
            <div className="wm-kpi-card">
              <div className="wm-kpi-label">Room type</div>
              <div className="wm-mc-summary-value">{active.roomType}</div>
            </div>
            <div className="wm-kpi-card">
              <div className="wm-kpi-label">Current stage</div>
              <div className="wm-mc-summary-value is-capitalised">{active.stage}</div>
            </div>
            <div className="wm-kpi-card">
              <div className="wm-kpi-label">Health</div>
              <div className="wm-mc-summary-value">{active.health}</div>
            </div>
          </div>

          <div className="wm-mc-tech-strip">
            <span className="wm-badge">{active.sources ?? 0} sources</span>
            <span className="wm-badge">{active.displays ?? 0} displays</span>
            <span className="wm-badge">{active.distanceM ?? 0}m</span>
            {active.usb ? <span className="wm-badge">USB</span> : null}
            {active.control ? <span className="wm-badge">Control</span> : null}
            {active.audio ? <span className="wm-badge">Audio</span> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
