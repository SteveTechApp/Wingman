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
  index: string;
};

type ToolGroup = {
  title: string;
  subtitle: string;
  code: string;
  tools: Tool[];
};

const groups: ToolGroup[] = [
  {
    title: "Capture & Guide",
    subtitle: "Start every project by understanding the requirement and likely solution path.",
    code: "STAGE 01",
    tools: [
      {
        index: "01",
        title: "AV Guide",
        tag: "Start Here",
        to: "/app/tools/discovery",
        desc: "Capture room, source, display, distance, control, USB, audio, and budget inputs.",
        outcome: "Use first for qualification and early design direction.",
      },
      {
        index: "02",
        title: "Projects",
        tag: "Workspace",
        to: "/app/projects",
        desc: "Open saved opportunities and continue active workspaces.",
        outcome: "Use for resuming live jobs and structured progression.",
      },
    ],
  },
  {
    title: "Design & Selection",
    subtitle: "Move from room logic into architecture, templates, and product choice.",
    code: "STAGE 02",
    tools: [
      {
        index: "03",
        title: "Room Wizard",
        tag: "Design",
        to: "/app/tools/room-wizard",
        desc: "Use room templates to guide architecture decisions.",
        outcome: "Use for room-led system direction.",
      },
      {
        index: "04",
        title: "Templates",
        tag: "Accelerate",
        to: "/app/tools/templates",
        desc: "Apply standard room and market templates quickly.",
        outcome: "Use for repeatable designs and quicker starts.",
      },
      {
        index: "05",
        title: "Product Catalog",
        tag: "Select",
        to: "/app/tools/catalog",
        desc: "Browse families and shortlist suitable WyreStorm products.",
        outcome: "Use for SKU selection and solution narrowing.",
      },
      {
        index: "06",
        title: "VideoWall Designer",
        tag: "Video Wall",
        to: "/app/tools/video-wall",
        desc: "Plan LCD and LED wall layouts, processing, and signal flow.",
        outcome: "Use for wall design and display array planning.",
      },
    ],
  },
  {
    title: "Output & Positioning",
    subtitle: "Turn the chosen solution into outputs and support the sales conversation.",
    code: "STAGE 03",
    tools: [
      {
        index: "07",
        title: "Proposal Builder",
        tag: "Output",
        to: "/app/tools/proposals",
        desc: "Prepare BOM structure and proposal-ready notes.",
        outcome: "Use for proposal production and output framing.",
      },
      {
        index: "08",
        title: "Competitor Compare",
        tag: "Compare",
        to: "/app/tools/competitor-compare",
        desc: "Show the nearest WyreStorm equivalent and substitution path.",
        outcome: "Use for objection handling and positioning support.",
      },
    ],
  },
];

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <div className="wm-panelTool">
      <div className="wm-panelTool__rail">
        <span className="wm-panelTool__index">{tool.index}</span>
        <span className="wm-panelTool__tag">{tool.tag}</span>
      </div>

      <div className="wm-panelTool__main">
        <h3>{tool.title}</h3>
        <p>{tool.desc}</p>
      </div>

      <div className="wm-panelTool__footer">
        <div className="wm-panelTool__outcome">{tool.outcome}</div>
        <Link to={tool.to} className="wm-panelTool__link">
          Launch Module →
        </Link>
      </div>
    </div>
  );
}

export default function ToolHubPage() {
  return (
    <PageFrame
      title="Tool-Box"
      subtitle="Mission-control style launcher for AV sales, design guidance, product selection, proposal output, and competitive positioning."
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
        <div className="wm-instrumentHero">
          <div className="wm-instrumentHero__main">
            <span className="wm-kicker">Wingman Instrument Panel</span>
            <h2>Navigate the AV workflow like a control surface</h2>
            <p>
              Start with AV Guide, move through design and product selection,
              then finish with proposal output and competitive positioning.
            </p>

            <div className="wm-instrumentHero__chips">
              <span>AV Guide</span>
              <span>Room Wizard</span>
              <span>Catalog</span>
              <span>Proposal</span>
              <span>Compare</span>
            </div>
          </div>

          <div className="wm-instrumentHero__status">
            <div className="wm-statusTile">
              <strong>Primary Flow</strong>
              <span>Capture → Design → Output</span>
            </div>
            <div className="wm-statusTile">
              <strong>Specialist Mode</strong>
              <span>VideoWall Designer + Competitor Compare</span>
            </div>
            <div className="wm-statusTile">
              <strong>Best Starting Point</strong>
              <span>AV Guide</span>
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
          right={<span className="wm-sectionCode">{group.code}</span>}
        >
          <div className="wm-panelGroup">
            {group.tools.map((tool) => (
              <ToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </PageSection>
      ))}
    </PageFrame>
  );
}