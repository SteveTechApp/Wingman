import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import GlowGuide from "@/ui2/page/GlowGuide";

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

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [activeTemplateId, setActiveTemplateId] = useState(templates[0].id);
  const [view, setView] = useState<TemplateView>("visual");
  const [tierFilter, setTierFilter] = useState<"All" | TemplateTier>("All");

  const visibleTemplates = useMemo(() => {
    return templates.filter((t) => tierFilter === "All" || t.tier === tierFilter);
  }, [tierFilter]);

  const activeTemplate =
    visibleTemplates.find((t) => t.id === activeTemplateId) ?? visibleTemplates[0];

  const items =
    view === "visual"
      ? activeTemplate.visual
      : view === "bom"
      ? activeTemplate.bom
      : activeTemplate.sales;

  return (
    <div className="wm-fit-page wmu-adopt">
      <section className="wm-surface-card wm-target-hero">
        <div>
          <div className="wm-page-kicker">Templates</div>
          <div className="wm-page-title">Start from a structured room pattern</div>
          <div className="wm-page-copy">
            Keep this page lightweight. Select a template, then explore one layer of detail at a time.
          </div>
        </div>

        <GlowGuide
          title="Current priority"
          activeIndex={1}
          steps={[
            { title: "Choose template", copy: "Pick the closest room type." },
            { title: "Select detail view", copy: "Visual, BOM or sales." },
            { title: "Continue workflow", copy: "Move into catalogue or proposal." },
          ]}
        />
      </section>

      <section className="wm-target-grid">
        <aside className="wm-surface-card wm-target-panel">
          <div className="wm-section-title">Template browser</div>
          <div className="wm-section-copy">Filter by tier and select a room.</div>

          <div className="wm-toolbar-row">
            {["All", "Bronze", "Silver", "Gold"].map((t) => (
              <button
                key={t}
                type="button"
                className={`wm-chip${tierFilter === t ? " wm-chip--active" : ""}`}
                onClick={() => setTierFilter(t as "All" | TemplateTier)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="wm-target-list">
            {visibleTemplates.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`wm-target-list__item${t.id === activeTemplate.id ? " wm-target-list__item--active" : ""}`}
                onClick={() => setActiveTemplateId(t.id)}
              >
                <div className="wm-target-list__title">{t.name}</div>
                <div className="wm-target-list__meta">{t.application}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="wm-surface-card wm-target-panel">
          <div className="wm-toolbar-row wm-toolbar-row--between">
            <div>
              <div className="wm-section-title">Detail view</div>
              <div className="wm-section-copy">Switch between information layers.</div>
            </div>

            <div className="wm-toolbar-row">
              <button type="button" className={`wm-chip${view === "visual" ? " wm-chip--active" : ""}`} onClick={() => setView("visual")}>
                Visual
              </button>
              <button type="button" className={`wm-chip${view === "bom" ? " wm-chip--active" : ""}`} onClick={() => setView("bom")}>
                BOM
              </button>
              <button type="button" className={`wm-chip${view === "sales" ? " wm-chip--active" : ""}`} onClick={() => setView("sales")}>
                Sales
              </button>
            </div>
          </div>

          <div className="wm-product-card">
            <div className="wm-product-card__title">{activeTemplate.name}</div>
            <div className="wm-product-card__copy">{activeTemplate.summary}</div>
          </div>

          <div className="wm-target-list">
            {items.map((item) => (
              <div key={item} className="wm-target-list__card">
                {item}
              </div>
            ))}
          </div>

          <div className="wm-toolbar-row wm-toolbar-row--end">
            <button type="button" className="wm-btn-secondary" onClick={() => navigate(WM_ROUTES.catalog)}>
              Open catalogue
            </button>
            <button type="button" className="wm-btn-primary" onClick={() => navigate(WM_ROUTES.proposal)}>
              Continue
            </button>
          </div>
        </section>
      </section>
    </div>
  );
}