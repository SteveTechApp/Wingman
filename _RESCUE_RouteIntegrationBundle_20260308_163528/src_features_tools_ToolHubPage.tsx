import * as React from "react";
import { Link } from "react-router-dom";
import PageFrame from "@/app/layout/PageFrame";

type ToolItem = {
  title: string;
  tag: string;
  to: string;
  desc: string;
  outcome: string;
  code: string;
  className: string;
};

const tools: ToolItem[] = [
  {
    code: "01",
    title: "AV Guide",
    tag: "Start Here",
    to: "/app/tools/AV Guide",
    desc: "Capture room, source, display, distance, control, USB, audio, and budget inputs.",
    outcome: "Use first for qualification and early design direction.",
    className: "wm-tbCard wm-tbCard--start",
  },
  {
    code: "02",
    title: "Projects",
    tag: "Workspace",
    to: "/app/projects",
    desc: "Resume active jobs, open saved workspaces, and keep opportunity stages organised.",
    outcome: "Use to continue live work and manage progression.",
    className: "wm-tbCard wm-tbCard--workspace",
  },
  {
    code: "03",
    title: "Room Wizard",
    tag: "Design",
    to: "/app/tools/room-wizard",
    desc: "Guide architecture direction from room type and use case.",
    outcome: "Use for system direction.",
    className: "wm-tbCard",
  },
  {
    code: "04",
    title: "Templates",
    tag: "Accelerate",
    to: "/app/tools/templates",
    desc: "Apply standard room and market templates quickly.",
    outcome: "Use for repeatable designs.",
    className: "wm-tbCard",
  },
  {
    code: "05",
    title: "Product Catalog",
    tag: "Select",
    to: "/app/tools/catalog",
    desc: "Browse families and shortlist suitable WyreStorm products.",
    outcome: "Use for SKU selection.",
    className: "wm-tbCard",
  },
  {
    code: "06",
    title: "VideoWall Designer",
    tag: "Video Wall",
    to: "/app/tools/video-wall",
    desc: "Plan LCD and LED wall layouts, processing, scaling, and supporting signal flow.",
    outcome: "Use for wall design and specialist display conversations.",
    className: "wm-tbCard wm-tbCard--wide",
  },
  {
    code: "07",
    title: "Proposal Builder",
    tag: "Output",
    to: "/app/tools/proposals",
    desc: "Prepare BOM structure and proposal-ready notes.",
    outcome: "Use for customer-facing outputs.",
    className: "wm-tbCard",
  },
  {
    code: "08",
    title: "Competitor Compare",
    tag: "Compare",
    to: "/app/tools/competitor-compare",
    desc: "Show the nearest WyreStorm equivalent and substitution path.",
    outcome: "Use for objection handling.",
    className: "wm-tbCard",
  },
];

function ToolCard({ item }: { item: ToolItem }) {
  return (
    <div className={item.className}>
      <div className="wm-tbCard__head">
        <span className="wm-tbCard__code">{item.code}</span>
        <span className="wm-tbCard__tag">{item.tag}</span>
      </div>

      <div className="wm-tbCard__body">
        <h3>{item.title}</h3>
        <p>{item.desc}</p>
      </div>

      <div className="wm-tbCard__foot">
        <div className="wm-tbCard__outcome">{item.outcome}</div>
        <Link to={item.to} className="wm-tbCard__link">
          Open Tool →
        </Link>
      </div>
    </div>
  );
}

export default function ToolHubPage() {
  return (
    <PageFrame
      title="Tool-Box"
      subtitle="Use Wingman as a practical AV sales and design control panel. Each module explains what it does and when to use it."
      actions={
        <div className="wm-tbActions">
          <Link to="/app/dashboard" className="wm-tbActionLink">
            <button className="wm-btn-secondary">Dashboard</button>
          </Link>
          <Link to="/app/projects/new" className="wm-tbActionLink">
            <button className="wm-btn-primary">+ New Project</button>
          </Link>
        </div>
      }
    >
      <div className="wm-toolboxLayout">
        <section className="wm-tbHero">
          <div className="wm-tbHero__main">
            <span className="wm-kicker">Wingman Control Panel</span>
            <h2>Choose the right tool for the stage you are in</h2>
            <p>
              Start with AV Guide, move into design and product selection,
              then finish with proposal output and competitive positioning.
            </p>
          </div>

          <div className="wm-tbHero__flow">
            <div className="wm-tbFlow__label">Recommended flow</div>
            <div className="wm-tbFlow__rail">
              <span>AV Guide</span>
              <span>Room Wizard</span>
              <span>Catalog</span>
              <span>Proposal</span>
            </div>
            <div className="wm-tbFlow__note">
              Specialist tools: VideoWall Designer and Competitor Compare.
            </div>
          </div>
        </section>

        <section className="wm-tbGrid">
          {tools.map((item) => (
            <ToolCard key={item.title} item={item} />
          ))}
        </section>
      </div>
    </PageFrame>
  );
}