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
    subtitle: "Start every project by understanding the requirement and likely solution path.",
    tools: [
      {
        title: "AV Guide",
        tag: "Start Here",
        to: "/app/tools/discovery",
        desc: "Capture room, source, display, distance, control, USB, audio, and budget inputs.",
        outcome: "Best for qualification and early design direction.",
      },
      {
        title: "Projects",
        tag: "Workspace",
        to: "/app/projects",
        desc: "Open saved opportunities and continue active workspaces.",
        outcome: "Best for resuming live jobs.",
      },
    ],
  },
  {
    title: "Design & Selection",
    subtitle: "Move from room logic into architecture, templates, and product choice.",
    tools: [
      {
        title: "Room Wizard",
        tag: "Design",
        to: "/app/tools/room-wizard",
        desc: "Use room templates to guide architecture decisions.",
        outcome: "Best for room-led system direction.",
      },
      {
        title: "Templates",
        tag: "Accelerate",
        to: "/app/tools/templates",
        desc: "Apply standard room and market templates quickly.",
        outcome: "Best for repeatable designs.",
      },
      {
        title: "Product Catalog",
        tag: "Select",
        to: "/app/tools/catalog",
        desc: "Browse families and shortlist suitable WyreStorm products.",
        outcome: "Best for SKU selection.",
      },
      {
        title: "VideoWall Designer",
        tag: "Video Wall",
        to: "/app/tools/video-wall",
        desc: "Plan LCD and LED wall layouts, processing, and signal flow.",
        outcome: "Best for wall-design conversations.",
      },
    ],
  },
  {
    title: "Output & Positioning",
    subtitle: "Turn the chosen solution into outputs and support the sales conversation.",
    tools: [
      {
        title: "Proposal Builder",
        tag: "Output",
        to: "/app/tools/proposals",
        desc: "Prepare BOM structure and proposal-ready notes.",
        outcome: "Best for customer-facing outputs.",
      },
      {
        title: "Competitor Compare",
        tag: "Compare",
        to: "/app/tools/competitor-compare",
        desc: "Show the nearest WyreStorm equivalent and substitution path.",
        outcome: "Best for objection handling.",
      },
    ],
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <div className="wm-toolboxCard wm-toolboxCard--compact">
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
      subtitle="Choose the right Wingman tool quickly. Each module explains what it does and when to use it."
      actions={
        <div className="wm-toolboxActions">
          <Link to="/app/dashboard" className="wm-toolboxActionLink">
            <button className="wm-btn-secondary">Dashboard</button>
          </Link>
          <Link to="/app/projects/new" className="wm-toolboxActionLink">
            <button className="wm-btn-primary">+ New Project</button>
          </Link>
        </div>
      }
    >
      <PageSection compact>
        <div className="wm-toolboxHero wm-toolboxHero--compact">
          <div className="wm-toolboxHero__main">
            <span className="wm-kicker">Wingman Tool-Box</span>
            <h2>Pick the right tool for the stage you are in</h2>
            <p>
              Guide users from requirement capture into design logic, product selection,
              proposal output, and competitive positioning.
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
          compact
        >
          <div className="wm-toolboxGrid wm-toolboxGrid--compact">
            {group.tools.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </PageSection>
      ))}
    </PageFrame>
  );
}