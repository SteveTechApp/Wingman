import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const TOOLS = [
  { title: "Discovery", tag: "Capture", desc: "Gather room and customer requirements before recommending hardware." },
  { title: "Room Wizard", tag: "Design", desc: "Start from proven room templates and guided design pathways." },
  { title: "Product Catalog", tag: "Select", desc: "Filter product families and build a shortlist." },
  { title: "Proposal Builder", tag: "Output", desc: "Create BOM and proposal-ready project outputs." },
  { title: "Competitor Compare", tag: "Support", desc: "Position WyreStorm against alternative options." },
  { title: "Templates", tag: "Accelerate", desc: "Apply standard room and market templates to projects." },
];

export default function ToolHubPage() {
  return (
    <PageFrame
      title="ToolHub"
      subtitle="Launch the right Wingman tool quickly without hunting through the navigation."
    >
      <PageSection compact>
        <div className="wm-hero">
          <div className="wm-heroCard">
            <span className="wm-kicker">Fast Launcher</span>
            <h3>Keep the workflow obvious</h3>
            <p>
              ToolHub should feel like a guided launcher. The user should understand what to open next at a glance.
            </p>
          </div>

          <div className="wm-heroCard">
            <span className="wm-kicker">Recommended Flow</span>
            <h3>Discovery → Design → Proposal</h3>
            <p>
              Lead with the likely next tool rather than treating every tool as equally important.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Core Tools"
        subtitle="Group tools around the normal AV sales and design workflow."
      >
        <div className="wm-grid-auto">
          {TOOLS.map((tool) => (
            <div key={tool.title} className="wm-panel">
              <div className="wm-tagRow" style={{ marginBottom: 10 }}>
                <span className="wm-tag">{tool.tag}</span>
              </div>
              <h4>{tool.title}</h4>
              <p>{tool.desc}</p>
            </div>
          ))}
        </div>
      </PageSection>
    </PageFrame>
  );
}