import * as React from "react";
import { Link } from "react-router-dom";
import WorkflowPipeline from "./WorkflowPipeline";
import WorkflowActionBar from "./WorkflowActionBar";
import ActiveProjectSummary from "./ActiveProjectSummary";
import ProposalReadinessPanel from "./ProposalReadinessPanel";
import {
  createWorkflowProject,
  ensureWorkflowSeed,
  getWorkflowProjects,
  resetWorkflowProjects,
} from "@/workflow/workflowStore";

export default function MissionControlPage() {
  const [tick, setTick] = React.useState(0);
  const projects = React.useMemo(() => {
    ensureWorkflowSeed();
    return getWorkflowProjects();
  }, [tick]);

  const totals = React.useMemo(() => {
    const live = projects.filter((p) => p.stage !== "closed");
    const proposal = projects.filter((p) => p.stage === "proposal").length;
    const discovery = projects.filter((p) => p.stage === "discovery").length;
    const architecture = projects.filter((p) => p.stage === "architecture").length;
    const products = projects.filter((p) => p.stage === "products").length;
    const proposalReadiness = live.length === 0 ? 0 : Math.round((proposal / live.length) * 100);

    return {
      live: live.length,
      discovery,
      architecture,
      products,
      proposal,
      proposalReadiness,
    };
  }, [projects]);

  const handleCreate = () => {
    createWorkflowProject({
      name: "New Project",
      customer: "Sample customer",
      roomType: "General AV space",
      stage: "discovery",
    });
    setTick((v) => v + 1);
  };

  const handleReset = () => {
    resetWorkflowProjects();
    setTick((v) => v + 1);
  };

  return (
    <div className="wm-mc-page">
      <section className="wm-mc-hero">
        <div className="wm-mc-hero-copy">
          <div className="wm-mc-kicker">Mission Control</div>
          <h1 className="wm-title wm-mc-title">Run every AV opportunity through a structured workflow.</h1>
          <p className="wm-mc-subtitle">
            Guide projects from discovery to architecture, product selection, and proposal output
            without losing commercial control.
          </p>

          <div className="wm-mc-actions">
            <button type="button" className="wm-btn wm-btn-primary" onClick={handleCreate}>
              Start New Project
            </button>
            <Link to="/app/tools/discovery" className="wm-btn wm-btn-secondary">
              Run Discovery Wizard
            </Link>
            <Link to="/app/tools" className="wm-btn wm-btn-secondary">
              Open Tool Hub
            </Link>
            <button type="button" className="wm-btn wm-btn-secondary" onClick={handleReset}>
              Reset Demo Data
            </button>
          </div>
        </div>

        <div className="wm-mc-health wm-card">
          <div className="wm-mc-health-title">Pipeline health</div>
          <p className="wm-muted wm-mc-health-copy">
            Keep the sales process aligned to the correct AV design order.
          </p>

          <div className="wm-mc-stats">
            <div className="wm-kpi">
              <div className="wm-kpi-label">Live projects</div>
              <div className="wm-kpi-value">{totals.live}</div>
            </div>
            <div className="wm-kpi">
              <div className="wm-kpi-label">In discovery</div>
              <div className="wm-kpi-value">{totals.discovery}</div>
            </div>
            <div className="wm-kpi">
              <div className="wm-kpi-label">In architecture</div>
              <div className="wm-kpi-value">{totals.architecture}</div>
            </div>
            <div className="wm-kpi">
              <div className="wm-kpi-label">In products</div>
              <div className="wm-kpi-value">{totals.products}</div>
            </div>
            <div className="wm-kpi">
              <div className="wm-kpi-label">At proposal</div>
              <div className="wm-kpi-value">{totals.proposal}</div>
            </div>
            <div className="wm-kpi">
              <div className="wm-kpi-label">Proposal readiness</div>
              <div className="wm-kpi-value">{totals.proposalReadiness}%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="wm-mc-workspace">
        <div className="wm-mc-main-column">
          <WorkflowActionBar />

          <section className="wm-mc-panel wm-card">
            <div className="wm-mc-panel-head">
              <div>
                <h2 className="wm-subtitle">Workflow pipeline</h2>
                <p className="wm-muted wm-mc-panel-copy">
                  Drag project cards between stages or use the active project controls above.
                </p>
              </div>
            </div>

            <WorkflowPipeline />
          </section>
        </div>

        <aside className="wm-mc-side-column">
          <ActiveProjectSummary />
          <ProposalReadinessPanel />
        </aside>
      </section>
    </div>
  );
}