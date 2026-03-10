import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  applyProjectTemplate,
  createProject,
  ensureActiveProject,
  getActiveProject,
  setActiveProjectId,
  type DiscoveryProductFamily,
  type ProjectTemplateTier,
} from "@/features/projects/projectStore";

type TierConfig = {
  tier: ProjectTemplateTier;
  summary: string;
  assumptions: string[];
  families: DiscoveryProductFamily[];
};

type ApplicationConfig = {
  id: string;
  name: string;
  description: string;
  tiers: TierConfig[];
};

type MarketConfig = {
  id: string;
  name: string;
  description: string;
  applications: ApplicationConfig[];
};

const MARKETS: MarketConfig[] = [
  {
    id: "corporate",
    name: "Corporate",
    description: "Meeting rooms, boardrooms, collaboration spaces, and divisible training spaces.",
    applications: [
      {
        id: "boardroom",
        name: "Boardroom",
        description: "High-impact meeting space with polished presentation and UC support.",
        tiers: [
          {
            tier: "Bronze",
            summary: "Entry boardroom template focused on dependable presentation switching and simple display connectivity.",
            assumptions: [
              "Single main display",
              "Basic source switching",
              "Simple USB / BYOD expectations",
            ],
            families: ["Apollo", "HDBaseT"],
          },
          {
            tier: "Silver",
            summary: "Balanced boardroom template with stronger switching, USB support, and cleaner UC integration.",
            assumptions: [
              "Main display plus secondary content monitor",
              "More polished table connectivity",
              "Hybrid meeting support expected",
            ],
            families: ["Apollo", "Matrix", "HDBaseT"],
          },
          {
            tier: "Gold",
            summary: "Premium boardroom template with enterprise-grade routing, flexible collaboration, and higher polish.",
            assumptions: [
              "Dual displays or advanced front-of-room experience",
              "Integrated switching and scaling",
              "Higher expectation of control and polish",
            ],
            families: ["Apollo", "Matrix", "AVoIP"],
          },
        ],
      },
      {
        id: "training-room",
        name: "Training Room",
        description: "Instructor-led spaces with more displays, more sources, and repeatable user flows.",
        tiers: [
          {
            tier: "Bronze",
            summary: "Cost-conscious training room with stable source-to-display distribution.",
            assumptions: [
              "Single teaching display",
              "Basic instructor source workflow",
              "Limited reconfiguration",
            ],
            families: ["HDBaseT", "Apollo"],
          },
          {
            tier: "Silver",
            summary: "Mid-tier training room with better distribution, room flexibility, and cleaner instructor workflows.",
            assumptions: [
              "Front display plus confidence or repeater display",
              "Instructor plus guest source support",
              "Moderate USB expectations",
            ],
            families: ["HDBaseT", "Matrix", "Apollo"],
          },
          {
            tier: "Gold",
            summary: "Flexible premium training environment ready for hybrid, overflow, or divisible use cases.",
            assumptions: [
              "Multiple displays",
              "High source flexibility",
              "Potential overflow or divisible mode",
            ],
            families: ["AVoIP", "Matrix", "Apollo"],
          },
        ],
      },
    ],
  },
  {
    id: "education",
    name: "Education",
    description: "Classrooms, lecture capture spaces, teaching labs, and flexible learning environments.",
    applications: [
      {
        id: "classroom",
        name: "Classroom",
        description: "Standard teaching environment with simple daily usability and low friction operation.",
        tiers: [
          {
            tier: "Bronze",
            summary: "Practical classroom template for stable presentation and easy day-to-day use.",
            assumptions: [
              "Single display path",
              "Teacher laptop plus local source",
              "Minimal support overhead",
            ],
            families: ["Apollo", "HDBaseT"],
          },
          {
            tier: "Silver",
            summary: "More capable classroom template with improved switching, USB extension, and better room flexibility.",
            assumptions: [
              "Teacher plus guest source workflows",
              "Interactive display or USB peripheral integration",
              "Higher support for mixed teaching styles",
            ],
            families: ["Apollo", "USB Extension", "HDBaseT"],
          },
          {
            tier: "Gold",
            summary: "Premium classroom / hybrid learning template for richer delivery and future flexibility.",
            assumptions: [
              "Multiple devices or content zones",
              "Hybrid delivery expectations",
              "Higher quality room polish",
            ],
            families: ["Apollo", "AVoIP", "USB Extension"],
          },
        ],
      },
      {
        id: "lecture-space",
        name: "Lecture Space",
        description: "Higher-scale teaching environment with presenter confidence and larger audience coverage.",
        tiers: [
          {
            tier: "Bronze",
            summary: "Entry lecture space focused on core presentation stability and simple signal transport.",
            assumptions: [
              "Front-of-room display system",
              "Basic source handoff",
              "Simple scaling requirements",
            ],
            families: ["HDBaseT", "Matrix"],
          },
          {
            tier: "Silver",
            summary: "Lecture template with stronger distribution, presenter confidence, and cleaner source routing.",
            assumptions: [
              "Main display plus overflow or confidence output",
              "Multiple lecturer sources",
              "Better UX needed for support teams",
            ],
            families: ["Matrix", "HDBaseT", "Apollo"],
          },
          {
            tier: "Gold",
            summary: "Large-format lecture environment for premium teaching, overflow, or hybrid learning scenarios.",
            assumptions: [
              "Large audience coverage",
              "Multiple outputs or zones",
              "High expectation of seamless switching",
            ],
            families: ["AVoIP", "Matrix", "Video Wall"],
          },
        ],
      },
    ],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    description: "Bars, lounges, event spaces, meeting suites, and digital signage-led customer environments.",
    applications: [
      {
        id: "meeting-suite",
        name: "Meeting Suite",
        description: "Hospitality meeting room focused on clean guest usability and quick room reset.",
        tiers: [
          {
            tier: "Bronze",
            summary: "Simple hospitality meeting template designed for straightforward guest presentation use.",
            assumptions: [
              "Single display",
              "Guest presentation first",
              "Minimal training required",
            ],
            families: ["Apollo", "HDBaseT"],
          },
          {
            tier: "Silver",
            summary: "Improved guest meeting suite with stronger connectivity and better room flexibility.",
            assumptions: [
              "Multiple guest devices likely",
              "Cleaner room reset required",
              "Moderate USB / BYOD support",
            ],
            families: ["Apollo", "Matrix", "HDBaseT"],
          },
          {
            tier: "Gold",
            summary: "Premium meeting suite focused on high-end guest experience and polished collaboration.",
            assumptions: [
              "Higher-end UX expectations",
              "Better switching and scaling polish",
              "More integrated collaboration flow",
            ],
            families: ["Apollo", "Matrix", "AVoIP"],
          },
        ],
      },
      {
        id: "sports-bar",
        name: "Sports Bar / Multi-display Venue",
        description: "Multi-screen environment with signal distribution, zoning, and viewing flexibility.",
        tiers: [
          {
            tier: "Bronze",
            summary: "Entry multi-screen venue design for dependable signal distribution to several displays.",
            assumptions: [
              "Few content sources",
              "Several displays",
              "Simple distribution priority",
            ],
            families: ["Matrix", "HDBaseT"],
          },
          {
            tier: "Silver",
            summary: "Mid-tier venue design with stronger display zoning and more flexible source routing.",
            assumptions: [
              "More zones and more display groups",
              "Need for operational flexibility",
              "Cleaner source-to-zone assignment",
            ],
            families: ["Matrix", "AVoIP", "HDBaseT"],
          },
          {
            tier: "Gold",
            summary: "Premium multi-display venue with high zoning flexibility and advanced display network capability.",
            assumptions: [
              "Many displays or varied zones",
              "High flexibility across content types",
              "Scalable architecture expected",
            ],
            families: ["AVoIP", "Matrix", "Video Wall"],
          },
        ],
      },
    ],
  },
  {
    id: "retail",
    name: "Retail",
    description: "Stores, showrooms, digital signage, and customer engagement environments.",
    applications: [
      {
        id: "showroom",
        name: "Showroom",
        description: "Product or brand display environment requiring compelling presentation and repeatability.",
        tiers: [
          {
            tier: "Bronze",
            summary: "Simple showroom template for dependable branded content playback.",
            assumptions: [
              "Single or limited displays",
              "Simple source strategy",
              "Operational simplicity important",
            ],
            families: ["HDBaseT", "Matrix"],
          },
          {
            tier: "Silver",
            summary: "More capable showroom template with stronger display control and flexible content routing.",
            assumptions: [
              "Multiple display zones",
              "Need for more flexible source routing",
              "Improved polish expected",
            ],
            families: ["Matrix", "AVoIP", "HDBaseT"],
          },
          {
            tier: "Gold",
            summary: "Premium retail / showroom template for immersive customer engagement and display flexibility.",
            assumptions: [
              "Many displays or larger format visual impact",
              "Higher-end visual experience",
              "Scalable architecture preferred",
            ],
            families: ["AVoIP", "Matrix", "Video Wall"],
          },
        ],
      },
    ],
  },
];

function findMarket(id: string): MarketConfig {
  return MARKETS.find((market) => market.id === id) ?? MARKETS[0];
}

function findApplication(market: MarketConfig, id: string): ApplicationConfig {
  return market.applications.find((app) => app.id === id) ?? market.applications[0];
}

function findTier(application: ApplicationConfig, tier: ProjectTemplateTier): TierConfig {
  return application.tiers.find((item) => item.tier === tier) ?? application.tiers[0];
}

export default function TemplatesPage() {
  const nav = useNavigate();
  const activeProject = getActiveProject();

  const [marketId, setMarketId] = React.useState<string>(MARKETS[0].id);
  const market = React.useMemo(() => findMarket(marketId), [marketId]);

  const [applicationId, setApplicationId] = React.useState<string>(market.applications[0].id);
  React.useEffect(() => {
    if (!market.applications.some((app) => app.id === applicationId)) {
      setApplicationId(market.applications[0].id);
    }
  }, [applicationId, market]);

  const application = React.useMemo(() => findApplication(market, applicationId), [applicationId, market]);

  const [tier, setTier] = React.useState<ProjectTemplateTier>("Silver");
  const selectedTier = React.useMemo(() => findTier(application, tier), [application, tier]);

  const createFromTemplate = () => {
    const project = createProject({
      name: `${market.name} ${application.name} - ${selectedTier.tier}`,
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: application.name,
      stage: "Discovery",
      status: "Draft",
      notes: selectedTier.summary,
      template: {
        market: market.name,
        application: application.name,
        tier: selectedTier.tier,
        summary: selectedTier.summary,
        recommendedFamilies: selectedTier.families,
        assumptions: selectedTier.assumptions,
        createdAt: new Date().toISOString(),
      },
      discovery: {
        customer: activeProject?.customer || "Sample customer",
        site: activeProject?.site || "",
        roomName: application.name,
        applicationType: application.name,
        notes: selectedTier.summary,
        recommendedFamilies: selectedTier.families,
        createdAt: new Date().toISOString(),
      },
      proposal: {
        selectedTier: selectedTier.tier,
      },
    });

    setActiveProjectId(project.id);
    nav(`/app/projects?projectId=${encodeURIComponent(project.id)}`);
  };

  const applyToActiveProject = () => {
    const active = ensureActiveProject({
      customer: activeProject?.customer || "Sample customer",
      site: activeProject?.site || "",
      roomName: activeProject?.roomName || application.name,
    });

    applyProjectTemplate(active.id, {
      market: market.name,
      application: application.name,
      tier: selectedTier.tier,
      summary: selectedTier.summary,
      recommendedFamilies: selectedTier.families,
      assumptions: selectedTier.assumptions,
      createdAt: new Date().toISOString(),
    });

    setActiveProjectId(active.id);
    nav(`/app/projects?projectId=${encodeURIComponent(active.id)}`);
  };

  return (
    <div className="wm-dashboard wm-templates-page">
      <section className="wm-dashboard__hero">
        <div>
          <div className="wm-dashboard__eyebrow">Templates</div>
          <h1 className="wm-dashboard__title">Vertical market template builder</h1>
          <p className="wm-dashboard__subtitle">
            Choose a market, application, and Bronze / Silver / Gold starting point to generate a guided project direction.
          </p>

          <div className="wm-dashboard__meta">
            <span className="wm-chip">Market: {market.name}</span>
            <span className="wm-chip">Application: {application.name}</span>
            <span className="wm-chip">Tier: {selectedTier.tier}</span>
          </div>
        </div>

        <div className="wm-dashboard__heroactions">
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/dashboard")}>
            Dashboard
          </button>
          <button type="button" className="wm-btn wm-btn--ghost" onClick={() => nav("/app/projects")}>
            Projects
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={createFromTemplate}>
            Create Project From Template
          </button>
        </div>
      </section>

      <section className="wm-page-grid-sidebar">
        <div className="wm-card">
          <div className="wm-card__title">Template builder</div>
          <div className="wm-card__subtitle">Build a structured starting point for a sales opportunity.</div>

          <div className="wm-form-grid">
            <label className="wm-field-wrap">
              <span className="wm-label">Vertical market</span>
              <select className="wm-field" value={marketId} onChange={(e) => setMarketId(e.target.value)}>
                {MARKETS.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label className="wm-field-wrap">
              <span className="wm-label">Application</span>
              <select className="wm-field" value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                {market.applications.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="wm-field-wrap" style={{ marginTop: 12 }}>
            <span className="wm-label">Tier selection</span>
            <div className="wm-tier-picker">
              {application.tiers.map((item) => (
                <button
                  key={item.tier}
                  type="button"
                  className={tier === item.tier ? "wm-tier-btn is-active" : "wm-tier-btn"}
                  onClick={() => setTier(item.tier)}
                >
                  {item.tier}
                </button>
              ))}
            </div>
          </div>

          <div className="wm-inline-actions">
            <button type="button" className="wm-btn wm-btn--primary" onClick={applyToActiveProject}>
              Apply To Active Project
            </button>
            <button type="button" className="wm-btn wm-btn--ghost" onClick={createFromTemplate}>
              Create New Project
            </button>
          </div>
        </div>

        <div className="wm-section-stack">
          <div className="wm-card">
            <div className="wm-card__title">{market.name} — {application.name}</div>
            <div className="wm-card__subtitle">{application.description}</div>

            <div className="wm-summary-list">
              <div className="wm-summary-row"><span>Tier</span><strong>{selectedTier.tier}</strong></div>
              <div className="wm-summary-row"><span>Market</span><strong>{market.name}</strong></div>
              <div className="wm-summary-row"><span>Application</span><strong>{application.name}</strong></div>
              <div className="wm-summary-row"><span>Recommended families</span><strong>{selectedTier.families.join(", ")}</strong></div>
            </div>
          </div>

          <div className="wm-page-grid-2">
            <div className="wm-card">
              <div className="wm-card__title">Template summary</div>
              <div className="wm-card__subtitle">{selectedTier.summary}</div>

              <div className="wm-inline-actions">
                {selectedTier.families.map((family) => (
                  <span key={family} className="wm-chip">{family}</span>
                ))}
              </div>
            </div>

            <div className="wm-card">
              <div className="wm-card__title">Assumptions</div>
              <div className="wm-card__subtitle">These assumptions will be written into the project notes and discovery starting point.</div>

              <div className="wm-summary-list">
                {selectedTier.assumptions.map((item) => (
                  <div className="wm-summary-row" key={item}>
                    <span>Assumption</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="wm-card">
            <div className="wm-card__title">Active project target</div>
            <div className="wm-card__subtitle">
              {activeProject
                ? `Current active project: ${activeProject.name}`
                : "No active project selected. Applying will create or use a live project record."}
            </div>

            <div className="wm-summary-list">
              <div className="wm-summary-row"><span>Customer</span><strong>{activeProject?.customer || "Sample customer"}</strong></div>
              <div className="wm-summary-row"><span>Site</span><strong>{activeProject?.site || "Not set"}</strong></div>
              <div className="wm-summary-row"><span>Current stage</span><strong>{activeProject?.stage || "Discovery"}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}