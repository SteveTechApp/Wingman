import * as React from "react";
import { Link } from "react-router-dom";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import LiveProjectStrip from "@/app/widgets/LiveProjectStrip";

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

type ToolCardProps = {
  tag: string;
  title: string;
  desc: string;
  to: string;
};

function ToolCard({ tag, title, desc, to }: ToolCardProps) {
  return (
    <div className="wm-panelTool">
      <div className="wm-panelTool__rail">
        <span className="wm-panelTool__index">•</span>
        <span className="wm-panelTool__tag">{tag}</span>
      </div>

      <div className="wm-panelTool__main">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>

      <div className="wm-panelTool__footer">
        <Link to={to} className="wm-panelTool__link">
          Open Tool →
        </Link>
      </div>
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
        <LiveProjectStrip />
        <div className="wm-dashboard__stats">
          <Stat label="Active Project" value="None" meta="Open a project or start a new opportunity." />
          <Stat label="Displays" value="0" meta="No display endpoints captured yet." />
          <Stat label="SKUs" value="0" meta="No products attached to this workspace." />
          <Stat label="Proposal" value="None" meta="Proposal has not been started." />
        </div>

        <PageSection compact>
          <div className="wm-instrumentHero">
            <div className="wm-instrumentHero__main">
              <span className="wm-kicker">Wingman Control Panel</span>
              <h2>No active project</h2>
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

            <div className="wm-instrumentHero__status">
              <div className="wm-statusTile">
                <strong>Next Step</strong>
                <span>Complete Discovery before selecting architecture or recommending products.</span>
              </div>
              <div className="wm-statusTile">
                <strong>Recommended Flow</strong>
                <span>AV Guide → Room Wizard → Product Catalog → Proposal Builder</span>
              </div>
            </div>
          </div>
        </PageSection>

        <PageSection
          title="Workflow Progress"
          subtitle="Wingman works best when the opportunity follows a simple guided flow."
          compact
          right={<span className="wm-sectionCode">LIVE WORKFLOW</span>}
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
          subtitle="Jump directly into the next module without hunting through navigation."
          compact
          right={<Link to="/app/tools">Open Tool-Box →</Link>}
        >
          <div className="wm-panelGroup">
            <ToolCard
              tag="Start Here"
              title="AV Guide"
              desc="Capture room dimensions, signal flow, display counts, control, USB, and infrastructure constraints."
              to="/app/tools/discovery"
            />
            <ToolCard
              tag="Design"
              title="Room Wizard"
              desc="Start from repeatable room baselines and guided application templates."
              to="/app/tools/room-wizard"
            />
            <ToolCard
              tag="Select"
              title="Product Catalog"
              desc="Review available WyreStorm hardware and shortlist appropriate products."
              to="/app/tools/catalog"
            />
            <ToolCard
              tag="Output"
              title="Proposal Builder"
              desc="Prepare structured outputs and proposal-ready project summaries."
              to="/app/tools/proposals"
            />
          </div>
        </PageSection>
      </div>
    </PageFrame>
  );
}