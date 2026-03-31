import { Link } from "react-router-dom";

import { WingmanPageFrame, WingmanSection, WingmanStat } from "@/components/layout/WingmanPageFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";

type ToolCard = {
  title: string;
  description: string;
  to: string;
  badge?: string;
};

type ToolSection = {
  eyebrow: string;
  title: string;
  description: string;
  tools: ToolCard[];
};

const sections: ToolSection[] = [
  {
    eyebrow: "Start here",
    title: "Core workflow",
    description: "Lead users through the most common pre-sales and proposal journey in the right order.",
    tools: [
      {
        title: "Discovery Wizard",
        description: "Capture project requirements, distances, signal paths, and system priorities before selecting products.",
        to: WM_ROUTES.discovery,
        badge: "Recommended first",
      },
      {
        title: "Product Catalogue",
        description: "Search WyreStorm products by technology, SKU, feature, or application.",
        to: WM_ROUTES.catalogue,
      },
      {
        title: "Proposal Builder",
        description: "Turn a system concept into a client-facing proposal and project output.",
        to: WM_ROUTES.proposals,
        badge: "Finish here",
      },
      {
        title: "Competitor Compare",
        description: "Position WyreStorm clearly against alternatives and justify the recommendation.",
        to: WM_ROUTES.competitorCompare,
      },
    ],
  },
  {
    eyebrow: "Specialist tools",
    title: "Design and planning",
    description: "Use these when the project needs deeper planning, room logic, or wall design support.",
    tools: [
      {
        title: "AV Navigator",
        description: "Navigate solution paths and explore product families by application and workflow.",
        to: WM_ROUTES.navigator,
      },
      {
        title: "Video Wall",
        description: "Plan LCD and LED wall solutions with the correct control and distribution approach.",
        to: WM_ROUTES.videowall,
      },
      {
        title: "Room Wizard",
        description: "Shape room-based system choices for collaboration, presentation, and shared spaces.",
        to: WM_ROUTES.roomDesigner,
      },
    ],
  },
  {
    eyebrow: "Knowledge and support",
    title: "Intelligence layer",
    description: "Support less technical users with guidance, training, and structured product knowledge.",
    tools: [
      {
        title: "Guru AI",
        description: "Ask Wingman for advice, interpretation, and sales support during solution building.",
        to: WM_ROUTES.guru,
      },
      {
        title: "Product Intelligence",
        description: "Review product insights, positioning, and structured information for faster recommendations.",
        to: "/app/tools/product-intelligence",
      },
      {
        title: "Training",
        description: "Build product and solution knowledge for internal users and channel sales teams.",
        to: WM_ROUTES.training,
      },
      {
        title: "Templates",
        description: "Reuse standard content, structures, and project-ready building blocks.",
        to: WM_ROUTES.templates,
      },
      {
        title: "Import Intake",
        description: "Bring project or survey data into Wingman to accelerate scoping and proposal work.",
        to: WM_ROUTES.importIntake,
      },
    ],
  },
];

function ToolCardItem({ title, description, to, badge }: ToolCard) {
  return (
    <Link to={to} className="wm-tool-card">
      <div className="wm-tool-card__head">
        <h3 className="wm-tool-card__title">{title}</h3>
        {badge ? <span className="wm-tool-card__badge">{badge}</span> : null}
      </div>
      <p className="wm-tool-card__copy">{description}</p>
      <div className="wm-tool-card__cta">Open tool -&gt;</div>
    </Link>
  );
}

export default function ToolHubPage() {
  const toolCount = sections.reduce((total, section) => total + section.tools.length, 0);

  return (
    <div className="wm-page wm-page--frame wm-force-single-screen">
      <WingmanPageFrame
        eyebrow="Wingman Workspace"
        title="The fastest route from customer need to WyreStorm solution."
        description="Start with discovery, move into product selection, validate the recommendation, then finish with a proposal."
        actions={(
          <div className="wm-toolbar">
            <Link to={WM_ROUTES.discovery} className="wm-btn wm-btn-primary">
              Start with Discovery
            </Link>
            <Link to={WM_ROUTES.projects} className="wm-btn">
              Open Projects
            </Link>
            <Link to={WM_ROUTES.proposals} className="wm-btn">
              Jump to Proposal
            </Link>
          </div>
        )}
        stats={(
          <>
            <WingmanStat label="Workflow stages" value="3" meta="Start, design, and deliver in the same workspace." />
            <WingmanStat label="Available tools" value={toolCount} meta="Core, specialist, and support workflows." />
            <WingmanStat label="Recommended path" value="1 to 4" meta="Discovery, catalogue, compare, then proposal." />
          </>
        )}
      >
        <WingmanSection
          title="Suggested flow"
          description="A simple sequence for the most common pre-sales opportunity."
        >
          <div className="wm-flow-grid">
            {[
              ["1", "Discovery Wizard", WM_ROUTES.discovery],
              ["2", "Product Catalogue", WM_ROUTES.catalogue],
              ["3", "Competitor Compare", WM_ROUTES.competitorCompare],
              ["4", "Proposal Builder", WM_ROUTES.proposals],
            ].map(([step, label, to]) => (
              <Link key={to} to={to} className="wm-flow-card">
                <span className="wm-flow-card__step">{step}</span>
                <span className="wm-flow-card__label">{label}</span>
              </Link>
            ))}
          </div>
        </WingmanSection>

        {sections.map((section) => (
          <WingmanSection
            key={section.title}
            title={section.title}
            description={`${section.eyebrow} - ${section.description}`}
          >
            <div className="wm-tool-card-grid">
              {section.tools.map((tool) => (
                <ToolCardItem key={tool.to} {...tool} />
              ))}
            </div>
          </WingmanSection>
        ))}
      </WingmanPageFrame>
    </div>
  );
}
