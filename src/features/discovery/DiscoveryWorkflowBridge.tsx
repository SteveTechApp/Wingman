import * as React from "react";
import {
  getActiveWorkflowProject,
  readDiscoverySeed,
  saveActiveProjectFromDiscoverySeed,
} from "@/workflow/workflowStore";

export default function DiscoveryWorkflowBridge() {
  const [, setTick] = React.useState(0);
  const [status, setStatus] = React.useState<string>("");

  const active = getActiveWorkflowProject();
  const record = readDiscoverySeed();

  React.useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 800);
    return () => window.clearInterval(id);
  }, []);

  const saveToProject = (advanceToArchitecture: boolean) => {
    saveActiveProjectFromDiscoverySeed({ advanceToArchitecture });
    setStatus(
      advanceToArchitecture
        ? "Discovery saved. Active project moved to Architecture."
        : "Discovery saved to the active project."
    );
    setTick((v) => v + 1);
  };

  return (
    <section className="wm-discovery-bridge wm-card">
      <div className="wm-discovery-bridge-head">
        <div>
          <div className="wm-mc-kicker">Mission Control link</div>
          <h3 className="wm-subtitle wm-discovery-bridge-title">
            {active ? active.name : "No active project selected"}
          </h3>
          <p className="wm-muted wm-discovery-bridge-copy">
            {active
              ? "Save the current Discovery Wizard fields into the active Mission Control project."
              : "Go to Mission Control, create or select a project, then return here."}
          </p>
        </div>
      </div>

      <div className="wm-discovery-bridge-meta">
        <span className="wm-badge">
          {record?.sourceCount ? `${record.sourceCount} sources` : "No source count yet"}
        </span>
        <span className="wm-badge">
          {record?.displayCount ? `${record.displayCount} displays` : "No display count yet"}
        </span>
        <span className="wm-badge">
          {record?.cableDistanceM ? `${record.cableDistanceM}m` : "No distance yet"}
        </span>
      </div>

      <div className="wm-discovery-bridge-actions">
        <button
          type="button"
          className="wm-btn wm-btn-secondary"
          disabled={!active || !record}
          onClick={() => saveToProject(false)}
        >
          Save to Active Project
        </button>

        <button
          type="button"
          className="wm-btn wm-btn-primary"
          disabled={!active || !record}
          onClick={() => saveToProject(true)}
        >
          Save + Move to Architecture
        </button>
      </div>

      {status ? <div className="wm-discovery-bridge-status">{status}</div> : null}
    </section>
  );
}

