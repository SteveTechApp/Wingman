import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { writeTemplateSeed, type TemplateSeed, type TierKey } from "@/app/schema/templateSeed";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";

type TemplateView = "visual" | "bom" | "sales";
type TemplateTier = "Bronze" | "Silver" | "Gold";

type TemplateCard = {
  id: string;
  name: string;
  application: string;
  tier: TemplateTier;
  summary: string;
  visual: string[];
  bom: string[];
  sales: string[];
};

const templates: TemplateCard[] = [
  {
    id: "meeting-bronze",
    name: "Small Meeting Room",
    application: "Presentation / UC",
    tier: "Bronze",
    summary: "Entry-level meeting room template with simple switching and minimal infrastructure.",
    visual: ["Single display", "Simple switching", "Short cable runs"],
    bom: ["Presentation switcher", "Display connectivity", "Basic control"],
    sales: ["Fast to quote", "Low cost entry", "Ideal for small rooms"],
  },
  {
    id: "meeting-silver",
    name: "Medium Collaboration Room",
    application: "Presentation / UC",
    tier: "Silver",
    summary: "Balanced room with stronger connectivity and better UX.",
    visual: ["Improved workflow", "Better source flexibility", "Structured cabling"],
    bom: ["Apollo platform", "USB extension", "Infrastructure"],
    sales: ["Strong upsell", "Better UX", "Future-ready"],
  },
  {
    id: "education-gold",
    name: "Training / Learning Space",
    application: "Education",
    tier: "Gold",
    summary: "Scalable design for larger or more complex spaces.",
    visual: ["Instructor-led control", "Long distance transport", "Expandable"],
    bom: ["Matrix / AVoIP", "Transport layer", "Control + audio"],
    sales: ["High value", "Consultant-ready", "Scalable"],
  },
];

function toTierKey(value: TemplateTier): TierKey {
  return value.toLowerCase() as TierKey;
}

function buildRecommendedFamilies(template: TemplateCard): string[] {
  if (template.tier === "Gold") return ["AVoIP", "Matrix"];
  if (template.tier === "Silver") return ["Apollo", "USB Extension"];
  return ["Apollo"];
}

function buildRecommendedTool(template: TemplateCard): string {
  if (template.tier === "Gold") return WM_ROUTES.proposal;
  return WM_ROUTES.roomWizard;
}

function buildTemplateSeed(template: TemplateCard): TemplateSeed {
  return {
    source: "template-workbench",
    verticalMarket: {
      id: template.application.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: template.application,
      summary: `${template.application} template starting point.`,
    },
    roomType: {
      id: template.id,
      name: template.name,
      summary: template.summary,
      useCases: template.visual,
    },
    tier: {
      id: toTierKey(template.tier),
      label: template.tier,
      summary: template.summary,
      positioning: template.sales[0] ?? template.summary,
      performance: template.visual[0] ?? template.summary,
      commercialNote: template.sales.join("; "),
    },
    includedSystems: template.bom,
    uplift: template.sales,
    assumptions: template.visual,
    recommendedFamilies: buildRecommendedFamilies(template),
    recommendedTool: buildRecommendedTool(template),
    solutionSummary: template.summary,
    ioProfile: {
      sourceCount: template.tier === "Gold" ? 4 : template.tier === "Silver" ? 3 : 2,
      displayCount: template.tier === "Gold" ? 2 : 1,
    },
    projectName: `${template.name} Project`,
    createdAt: new Date().toISOString(),
  };
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [activeTemplateId, setActiveTemplateId] = useState(templates[0].id);
  const [view, setView] = useState<TemplateView>("visual");
  const [tierFilter, setTierFilter] = useState<"All" | TemplateTier>("All");

  const visibleTemplates = useMemo(() => {
    return templates.filter((template) => tierFilter === "All" || template.tier === tierFilter);
  }, [tierFilter]);

  const activeTemplate =
    visibleTemplates.find((template) => template.id === activeTemplateId) ?? visibleTemplates[0];

  const items =
    view === "visual"
      ? activeTemplate.visual
      : view === "bom"
        ? activeTemplate.bom
        : activeTemplate.sales;

  function startFromTemplate() {
    const seed = buildTemplateSeed(activeTemplate);
    writeTemplateSeed(seed);
    navigate(WM_ROUTES.projectLauncher);
  }

  const left = (
    <div className="wm-workspace-stack">
      <div className="wm-start-step">
        Pick the closest room pattern first, then move into the launcher with the template already attached.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Filter by tier</h3>
          <p className="wm-workspace-card__copy">Use a smaller list so the user only compares a few realistic starts.</p>
        </div>

        <div className="wm-workspace-tag-row">
          {["All", "Bronze", "Silver", "Gold"].map((tier) => (
            <button
              key={tier}
              type="button"
              className={`wm-workspace-tab${tierFilter === tier ? " wm-workspace-tab--active" : ""}`}
              onClick={() => setTierFilter(tier as "All" | TemplateTier)}
            >
              {tier}
            </button>
          ))}
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Template browser</h3>
          <p className="wm-workspace-card__copy">Select one template, then keep the supporting detail in tabs on the right.</p>
        </div>

        <div className="wm-workspace-list">
          {visibleTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className={`wm-workspace-list-item${template.id === activeTemplate.id ? " wm-workspace-list-item--active" : ""}`}
              onClick={() => setActiveTemplateId(template.id)}
            >
              <span className="wm-workspace-list-item__eyebrow">{template.tier}</span>
              <span className="wm-workspace-list-item__title">{template.name}</span>
              <span className="wm-workspace-list-item__copy">{template.application}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const right = (
    <div className="wm-workspace-stack">
      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <span className="wm-workspace-list-item__eyebrow">{activeTemplate.tier}</span>
          <h3 className="wm-workspace-card__title">{activeTemplate.name}</h3>
          <p className="wm-workspace-card__copy">{activeTemplate.summary}</p>
        </div>

        <div className="wm-workspace-tab-row">
          <button
            type="button"
            className={`wm-workspace-tab${view === "visual" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setView("visual")}
          >
            Visual
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${view === "bom" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setView("bom")}
          >
            BOM
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${view === "sales" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setView("sales")}
          >
            Sales
          </button>
        </div>

        <div className="wm-workspace-list">
          {items.map((item) => (
            <div key={item} className="wm-workspace-list-item">
              <span className="wm-workspace-list-item__title">{item}</span>
            </div>
          ))}
        </div>

        <div className="wm-workspace-action-row">
          <button type="button" className="wm-btn-primary" onClick={startFromTemplate}>
            Start from this template
          </button>
          <button type="button" className="wm-btn-secondary" onClick={() => navigate(WM_ROUTES.catalog)}>
            Open catalogue
          </button>
        </div>
      </section>

      <section className="wm-workspace-card">
        <div className="wm-workspace-metric">
          <span>Recommended next tool</span>
          <strong>{buildRecommendedTool(activeTemplate)}</strong>
        </div>
      </section>
    </div>
  );

  return (
    <SplitWorkspaceFrame
      title="Templates"
      subtitle="Keep the browser on the left and the supporting layer on the right so users can compare one template at a time without filling the page."
      leftTitle="Template Browser"
      rightTitle="Template Detail"
      left={left}
      right={right}
      top={
        <button type="button" className="wm-btn-primary" onClick={startFromTemplate}>
          Start from selected template
        </button>
      }
    />
  );
}
