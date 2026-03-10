import * as React from "react";
import { Link } from "react-router-dom";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";
import LiveProjectStrip from "@/app/widgets/LiveProjectStrip";
import { loadProjectState } from "@/core/workflow/projectState";
import { buildDashboardIntelligence } from "./dashboardIntelligence";

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
  const [state, setState] = React.useState(() => loadProjectState());

  React.useEffect(() => {
    const onFocus = () => setState(loadProjectState());
    window.addEventListener("focus", onFocus);

    const timer = window.setInterval(() => {
      setState(loadProjectState());
    }, 1200);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, []);

  const intel = React.useMemo(() => buildDashboardIntelligence(state), [state]);

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
          <Stat
            label="AV Guide"
            value={intel.completenessScore + "%"}
            meta="Current completeness of captured requirements."
          />
          <Stat
            label="Primary Family"
            value={intel.primaryFamily}
            meta="Most likely WyreStorm starting family from captured inputs."
          />
          <Stat
            label="BOM"
            value={String(intel.bomCount)}
            meta="Current number of items saved in the active project."
          />
          <Stat
            label="Stage"
            value={state.stage || "Discovery"}
            meta="Current workflow stage recorded in project state."
          />
        </div>

        <PageSection compact>
          <div className="wm-instrumentHero">
            <div className="wm-instrumentHero__main">
              <span className="wm-kicker">Wingman Control Panel</span>
              <h2>{state.name || "New Wingman Project"}</h2>
              <p>{intel.statusSummary}</p>

              <div className="wm-buttonRow">
                <Link to={intel.nextActionPath}>
                  <button className="wm-btn-primary">{intel.nextActionLabel}</button>
                </Link>
                <Link to="/app/tools">
                  <button className="wm-btn-secondary">Open Tool-Box</button>
                </Link>
              </div>
            </div>

            <div className="wm-instrumentHero__status">
              <div className="wm-statusTile">
                <strong>Best Next Action</strong>
                <span>{intel.nextActionLabel}</span>
              </div>
              <div className="wm-statusTile">
                <strong>Recommended Family</strong>
                <span>{intel.primaryFamily}</span>
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
            <div className={"wm-step" + (state.stage === "Discovery" ? " wm-step--active" : "")}>
              <div className="wm-step__num">1</div>
              <h4>AV Guide</h4>
              <p>Capture project requirements, room details, and customer objectives.</p>
            </div>

            <div className={"wm-step" + (state.stage === "Design" ? " wm-step--active" : "")}>
              <div className="wm-step__num">2</div>
              <h4>System Design</h4>
              <p>Select architecture, room template, product family, and shortlist items.</p>
            </div>

            <div className={"wm-step" + (state.stage === "Proposal" ? " wm-step--active" : "")}>
              <div className="wm-step__num">3</div>
              <h4>Proposal</h4>
              <p>Prepare BOM structure, assumptions, and customer-facing output.</p>
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