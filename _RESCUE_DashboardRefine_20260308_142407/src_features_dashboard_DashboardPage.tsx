import * as React from "react";
import { Link } from "react-router-dom";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

function Stat({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="wm-stat wm-stat--compact">
      <span className="wm-stat__label">{label}</span>
      <span className="wm-stat__value">{value}</span>
      <span className="wm-stat__meta">{meta}</span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PageFrame
      title="Dashboard"
      subtitle="Resume the active opportunity, review progress, and launch the next best Wingman tool."
      actions={
        <>
          <Link to="/app/projects">
            <button className="wm-btn-secondary">Projects</button>
          </Link>
          <Link to="/app/projects/new">
            <button className="wm-btn-primary">+ Start New Project</button>
          </Link>
        </>
      }
    >
      <div className="wm-dashboard">
        <div className="wm-dashboard__stats">
          <Stat label="Active Project" value="None" meta="Open a project or start a new opportunity." />
          <Stat label="Displays" value="0" meta="No display endpoints captured yet." />
          <Stat label="SKUs" value="0" meta="No products attached to this workspace." />
          <Stat label="Proposal" value="None" meta="Proposal has not been started." />
        </div>

        <PageSection compact>
          <div className="wm-dashboard__hero">
            <div className="wm-dashboardCard wm-dashboardCard--primary">
              <span className="wm-kicker">Project Summary</span>
              <h3>No active project</h3>
              <p>
                Start a new workspace to capture customer requirements, define room constraints,
                and build a guided WyreStorm system design from discovery through proposal.
              </p>

              <div className="wm-buttonRow">
                <Link to="/app/projects/new">
                  <button className="wm-btn-primary">Start Blank Project</button>
                </Link>
                <Link to="/app/projects">
                  <button className="wm-btn-secondary">Open Saved Projects</button>
                </Link>
              </div>
            </div>

            <div className="wm-dashboardCard wm-dashboardCard--next">
              <span className="wm-kicker">Next Step</span>
              <h3>Complete Discovery</h3>
              <p>
                Capture room, sources, displays, distances, control needs, and budget band
                before selecting architecture or recommending products.
              </p>

              <div className="wm-buttonRow">
                <Link to="/app/tools/discovery">
                  <button className="wm-btn-primary">Continue Discovery</button>
                </Link>
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Workflow Progress"
          subtitle="Wingman works best when the opportunity follows a simple guided flow."
        >
          <div className="wm-dashboard__workflow">
            <div className="wm-step wm-step--active">
              <div className="wm-step__num">1</div>
              <h4>Discovery</h4>
              <p>Capture project requirements, room details, and customer objectives.</p>
            </div>

            <div className="wm-step">
              <div className="wm-step__num">2</div>
              <h4>System Design</h4>
              <p>Select architecture, room template, and suitable WyreStorm product families.</p>
            </div>

            <div className="wm-step">
              <div className="wm-step__num">3</div>
              <h4>Proposal</h4>
              <p>Prepare BOM structure, pricing support, and customer-facing outputs.</p>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Core Tools"
          subtitle="Use the key tools below to progress the project without browsing multiple menus."
          right={<Link to="/app/tools">Open ToolHub →</Link>}
        >
          <div className="wm-dashboard__tools">
            <div className="wm-tool">
              <div>
                <span className="wm-tool__tag">Primary</span>
                <h4>Discovery</h4>
                <p>Capture room dimensions, signal flow, display counts, and infrastructure constraints.</p>
              </div>
              <Link to="/app/tools/discovery">Open Discovery</Link>
            </div>

            <div className="wm-tool">
              <div>
                <span className="wm-tool__tag">Design</span>
                <h4>Room Wizard</h4>
                <p>Start from repeatable room baselines and guided application templates.</p>
              </div>
              <Link to="/app/tools/room-wizard">Open Room Wizard</Link>
            </div>

            <div className="wm-tool">
              <div>
                <span className="wm-tool__tag">Catalog</span>
                <h4>Product Catalog</h4>
                <p>Review available WyreStorm hardware and shortlist appropriate products.</p>
              </div>
              <Link to="/app/tools/catalog">Open Catalog</Link>
            </div>

            <div className="wm-tool">
              <div>
                <span className="wm-tool__tag">Proposal</span>
                <h4>Proposal Builder</h4>
                <p>Prepare structured outputs and proposal-ready project summaries.</p>
              </div>
              <Link to="/app/tools/proposals">Open Proposal Builder</Link>
            </div>

            <div className="wm-tool">
              <div>
                <span className="wm-tool__tag">Compare</span>
                <h4>Competitor Compare</h4>
                <p>Position WyreStorm against alternative brands and substitute pathways.</p>
              </div>
              <Link to="/app/tools/competitor-compare">Open Compare</Link>
            </div>

            <div className="wm-tool">
              <div>
                <span className="wm-tool__tag">Workspace</span>
                <h4>Projects</h4>
                <p>Open saved workspaces, review progress, and continue active opportunities.</p>
              </div>
              <Link to="/app/projects">Open Projects</Link>
            </div>
          </div>
        </PageSection>
      </div>
    </PageFrame>
  );
}