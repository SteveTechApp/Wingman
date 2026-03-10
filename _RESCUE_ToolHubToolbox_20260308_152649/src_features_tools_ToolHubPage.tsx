import * as React from "react";
import PageFrame from "@/app/layout/PageFrame";
import PageSection from "@/app/layout/PageSection";

const groups = [
  {
    title: "Capture",
    desc: "Start every opportunity by gathering the right room and customer information.",
    tools: [
      { title: "Discovery", desc: "Capture requirements, room conditions, source/display counts, and design constraints." },
      { title: "Projects", desc: "Resume existing opportunities and continue from the last saved stage." },
    ],
  },
  {
    title: "Design",
    desc: "Guide users from room logic into architecture and product direction.",
    tools: [
      { title: "Room Wizard", desc: "Start from proven room templates and guided design pathways." },
      { title: "Product Catalog", desc: "Filter product families and shortlist suitable WyreStorm products." },
      { title: "Templates", desc: "Apply reusable room and market templates to speed up design work." },
    ],
  },
  {
    title: "Output",
    desc: "Turn the selected design into proposal-ready outputs and internal review material.",
    tools: [
      { title: "Proposal Builder", desc: "Review BOM structure, proposal notes, and customer-facing outputs." },
      { title: "Competitor Compare", desc: "Support positioning and substitution decisions with clear comparisons." },
    ],
  },
];

export default function ToolHubPage() {
  return (
    <PageFrame
      title="ToolHub"
      subtitle="Launch the right Wingman tool quickly without hunting through the navigation."
    >
      <PageSection compact>
        <div className="wm-toolhubHero">
          <div className="wm-dashboardCard wm-dashboardCard--primary">
            <span className="wm-kicker">Fast Launcher</span>
            <h3>Follow the sales workflow</h3>
            <p>
              ToolHub should feel like a guided launcher. Discovery comes first, then design,
              then proposal output and comparison support.
            </p>
          </div>

          <div className="wm-dashboardCard wm-dashboardCard--next">
            <span className="wm-kicker">Recommended Flow</span>
            <h3>Capture → Design → Output</h3>
            <p>
              Reduce dead space and make the next action obvious for less technical users.
            </p>
          </div>
        </div>
      </PageSection>

      <div className="wm-toolhubGroups">
        {groups.map((group) => (
          <PageSection
            key={group.title}
            title={group.title}
            subtitle={group.desc}
          >
            <div className="wm-toolhubGrid">
              {group.tools.map((tool) => (
                <div key={tool.title} className="wm-tool">
                  <div>
                    <span className="wm-tool__tag">{group.title}</span>
                    <h4>{tool.title}</h4>
                    <p>{tool.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </PageSection>
        ))}
      </div>
    </PageFrame>
  );
}