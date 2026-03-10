import * as React from "react";
import { Link } from "react-router-dom";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

type Tool = {
  title: string;
  tag: string;
  to: string;
  desc: string;
  outcome: string;
};

type ToolGroup = {
  title: string;
  subtitle: string;
  tools: Tool[];
};

const groups: ToolGroup[] = [
  {
    title: "Capture & Guide",
    subtitle: "Start every project by understanding the room, customer requirement, and likely solution path.",
    tools: [
      {
        title: "AV Guide",
        tag: "Start Here",
        to: "/app/tools/discovery",
        desc: "Structured requirement capture for rooms, sources, displays, distances, control, USB, audio, and budget.",
        outcome: "Use first for qualification, early design direction, and site conversations.",
      },
      {
        title: "Projects",
        tag: "Workspace",
        to: "/app/projects",
        desc: "Open saved opportunities, continue active workspaces, and keep project stages organised.",
        outcome: "Use to resume jobs and keep the opportunity structured.",
      },
    ],
  },
  {
    title: "Design & Selection",
    subtitle: "Move from room logic into architecture, product family choice, and design acceleration.",
    tools: [
      {
        title: "Room Wizard",
        tag: "Design",
        to: "/app/tools/room-wizard",
        desc: "Use market and room templates to guide less technical users toward a valid AV design path.",
        outcome: "Use for architecture direction and room-led system logic.",
      },
      {
        title: "Templates",
        tag: "Accelerate",
        to: "/app/tools/templates",
        desc: "Apply standardised room and market templates to speed up design consistency and repeatable proposals.",
        outcome: "Use when a standard room type needs a faster starting point.",
      },
      {
        title: "Product Catalog",
        tag: "Select",
        to: "/app/tools/catalog",
        desc: "Browse WyreStorm products by family and role, then build a shortlist for the active project.",
        outcome: "Use when moving from architecture into SKU selection.",
      },
      {
        title: "VideoWall Designer",
        tag: "Video Wall",
        to: "/app/tools/video-wall",
        desc: "Design LCD and LED wall concepts, array layouts, processor thinking, and supporting signal flow.",
        outcome: "Use for 2x2, 3x3, large-format, and LED wall solution planning.",
      },
    ],
  },
  {
    title: "Output & Positioning",
    subtitle: "Turn the selected solution into a proposal and support the sales conversation with confidence.",
    tools: [
      {
        title: "Proposal Builder",
        tag: "Output",
        to: "/app/tools/proposals",
        desc: "Review BOM structure, add project notes, and prepare proposal-ready content with clearer commercial framing.",
        outcome: "Use to prepare customer-facing outputs and internal quote support.",
      },
      {
        title: "Competitor Compare",
        tag: "Compare",
        to: "/app/tools/competitor-compare",
        desc: "Position WyreStorm against alternative solutions and explain the closest substitution pathway.",
        outcome: "Use for objection handling and equivalent-product conversations.",
      },
    ],
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <div className="wm-toolboxCard">
      <div className="wm-toolboxCard__top">
        <span className="wm-toolboxCard__tag">{tool.tag}</span>
        <h3>{tool.title}</h3>
      </div>

      <div className="wm-toolboxCard__body">
        <p>{tool.desc}</p>
      </div>

      <div className="wm-toolboxCard__footer">
        <div className="wm-toolboxCard__outcome">{tool.outcome}</div>
        <Link to={tool.to} className="wm-toolboxCard__link">
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
      subtitle="Use Wingman as a practical AV sales and design launcher. Each tool below explains what it does and when to use it."
      actions={
        <div className="wm-toolboxActions">
          <Link to="/app/dashboard" className="wm-toolboxActionLink">
            <button className="wm-btn-secondary">Back to Dashboard</button>
          </Link>
          <Link to="/app/projects/new" className="wm-toolboxActionLink">
            <button className="wm-btn-primary">+ Start New Project</button>
          </Link>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-toolboxHero">
          <div className="wm-toolboxHero__main">
            <span className="wm-kicker">Wingman Tool-Box</span>
            <h2>Choose the right tool for the stage you are in</h2>
            <p>
              Wingman works best when users are guided from requirement capture, into design logic,
              then into product selection, proposal output, and competitive positioning.
            </p>
          </div>

          <div className="wm-toolboxHero__panel">
            <div className="wm-toolboxHero__mini">
              <strong>Recommended flow</strong>
              <span>AV Guide → Room Wizard → Product Catalog → Proposal Builder</span>
            </div>
            <div className="wm-toolboxHero__mini">
              <strong>Specialist tools</strong>
              <span>VideoWall Designer and Competitor Compare support advanced conversations.</span>
            </div>
          </div>
        </div>
      </PageSection>

      {groups.map((group) => (
        <PageSection
          key={group.title}
          title={group.title}
          subtitle={group.subtitle}
        >
          <div className="wm-toolboxGrid">
            {group.tools.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </PageSection>
      ))}
    </PageFrame>
  );
}