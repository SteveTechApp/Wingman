import { useMemo, useState } from "react";
import { Building2, ClipboardList, HelpCircle, LayoutTemplate, Monitor, Network, PanelTop, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import {
  WingmanActionBar,
  WingmanCard,
  WingmanFilterBar,
  WingmanPageFrame,
  WingmanPageHero,
  WingmanPanel
} from "../components/layout";
import { WingmanSelectionCard, type WingmanSelectionAccent } from "../components/ui/WingmanSelectionCard";
import { WingmanSelectionGrid } from "../components/ui/WingmanSelectionGrid";
import { roomTemplates, roomTemplateVerticals, type RoomTemplate } from "../lib/roomTemplates";

type MarketId = string;

const marketDescriptions: Record<string, string> = {
  All: "Browse every template.",
  Corporate: "Meeting, boardroom and UC spaces.",
  Education: "Classrooms, lecture theatres and capture.",
  Retail: "Signage, feature walls and zones.",
  Hospitality: "Ballrooms, venues and sports bars.",
  Healthcare: "Simulation, review and clinical AV.",
  Government: "Civic and public-sector rooms.",
  Venue: "Entertainment, stadium and public display spaces.",
  Transport: "Operational, signage and passenger information spaces.",
};

const MARKETS = roomTemplateVerticals.map((vertical) => ({
  id: vertical,
  label: vertical === "All" ? "All markets" : vertical,
  description: marketDescriptions[vertical] ?? `${vertical} room templates.`,
}));

function marketLabel(id: MarketId) {
  return MARKETS.find((market) => market.id === id)?.label ?? "All markets";
}

function templateFeatureCues(template: RoomTemplate) {
  const cues = template.designNotes.map((note) => note.label).filter(Boolean);

  if (cues.length >= 4) {
    return cues.slice(0, 4);
  }

  const bomCues = template.bom
    .filter((row) => row.type === "Required")
    .map((row) => row.role || row.description)
    .filter(Boolean);

  return [...cues, ...bomCues].slice(0, 4);
}

function requiredBomCount(template: RoomTemplate) {
  return template.bom.filter((row) => row.type === "Required").length;
}

function marketIcon(id: MarketId): LucideIcon {
  if (id === "Corporate") return Users;
  if (id === "Education") return ClipboardList;
  if (id === "Retail") return LayoutTemplate;
  if (id === "Hospitality") return Building2;
  if (id === "Healthcare" || id === "Government") return Building2;
  if (id === "Venue") return PanelTop;
  if (id === "Transport") return Network;
  if (id === "All") return LayoutTemplate;
  return HelpCircle;
}

function marketAccent(id: MarketId): WingmanSelectionAccent {
  if (id === "Corporate") return "cyan";
  if (id === "Education") return "blue";
  if (id === "Retail") return "teal";
  if (id === "Hospitality" || id === "Venue") return "amber";
  if (id === "Healthcare" || id === "Government") return "green";
  if (id === "Transport") return "purple";
  return "cyan";
}

function templateIcon(template: RoomTemplate): LucideIcon {
  const text = `${template.name} ${template.application} ${template.architecture}`.toLowerCase();
  if (text.includes("wall") || text.includes("led")) return PanelTop;
  if (text.includes("meeting") || text.includes("boardroom") || text.includes("huddle")) return Users;
  if (text.includes("class") || text.includes("lecture") || text.includes("teaching")) return ClipboardList;
  if (text.includes("signage") || text.includes("display")) return Monitor;
  if (text.includes("control") || text.includes("security")) return Network;
  return LayoutTemplate;
}

function templateAccent(template: RoomTemplate): WingmanSelectionAccent {
  if (template.vertical === "Retail") return "teal";
  if (template.vertical === "Education") return "blue";
  if (template.vertical === "Hospitality" || template.vertical === "Venue") return "amber";
  if (template.vertical === "Government" || template.vertical === "Healthcare") return "green";
  return "cyan";
}

export function TemplatesPage() {
  const [market, setMarket] = useState<MarketId>("All");
  const [selectedTemplateId, setSelectedTemplateId] = useState(roomTemplates[0]?.id ?? "");

  const visibleTemplates = useMemo(() => {
    if (market === "All") {
      return roomTemplates;
    }

    return roomTemplates.filter((template) => template.vertical === market);
  }, [market]);

  const selectedTemplate = useMemo(() => {
    const visibleMatch = visibleTemplates.find((template) => template.id === selectedTemplateId);

    if (visibleMatch) {
      return visibleMatch;
    }

    return visibleTemplates[0] ?? roomTemplates[0] ?? null;
  }, [selectedTemplateId, visibleTemplates]);

  function selectMarket(nextMarket: MarketId) {
    setMarket(nextMarket);

    const firstTemplate = nextMarket === "All"
      ? roomTemplates[0]
      : roomTemplates.find((template) => template.vertical === nextMarket);

    setSelectedTemplateId(firstTemplate?.id ?? "");
  }

  return (
    <WingmanPageFrame mode="wide" className="wm-page-migrated wm-page-migrated--templates wm-templates-rebuilt">
      <WingmanPageHero
        eyebrow="Room solution templates"
        title="Select a room design template."
        subtitle="Start from a known room type, then move the selected design into Discovery, Finder or Proposal."
        actions={
          <WingmanActionBar>
            <a href="/wingman/projects" role="button">Open projects</a>
            <a href="/wingman/proposal" role="button">Open proposal</a>
          </WingmanActionBar>
        }
      />

      <WingmanPanel
        title="Start with the customer environment"
        subtitle="Choose the closest market first. Templates stay grouped so the page does not become a wall of options."
      >
        <WingmanSelectionGrid columns={4} className="wm-template-market-grid">
          {MARKETS.map((item) => (
            <WingmanSelectionCard
              key={item.id}
              title={item.label}
              description={item.description}
              icon={marketIcon(item.id)}
              accent={marketAccent(item.id)}
              selected={item.id === market}
              onClick={() => selectMarket(item.id)}
            />
          ))}
        </WingmanSelectionGrid>
      </WingmanPanel>

      <div className="wm-template-workspace">
        <WingmanPanel
          title="Pick a room type to review"
          subtitle={`${visibleTemplates.length} template${visibleTemplates.length === 1 ? "" : "s"} available for ${marketLabel(market)}.`}
        >
          <WingmanFilterBar title="Template shortlist">
            <span>{marketLabel(market)}</span>
            <span>{visibleTemplates.length} available</span>
          </WingmanFilterBar>

          <WingmanSelectionGrid columns={3} className="wm-template-card-grid">
            {visibleTemplates.map((template) => (
              <WingmanSelectionCard
                key={template.id}
                title={template.name}
                description={template.summary}
                eyebrow={template.vertical}
                icon={templateIcon(template)}
                accent={templateAccent(template)}
                selected={template.id === selectedTemplate?.id}
                onClick={() => setSelectedTemplateId(template.id)}
                metaBadges={[template.scale, `${requiredBomCount(template)} required rows`]}
              />
            ))}
          </WingmanSelectionGrid>
        </WingmanPanel>

        {selectedTemplate ? (
          <WingmanPanel
            title={selectedTemplate.name}
            subtitle={selectedTemplate.customerNarrative}
            actions={
              <WingmanActionBar>
                <Link to={`${routeCatalogByKey.templates.path}/${selectedTemplate.id}`} role="button">Review template</Link>
                <Link to="/wingman/discovery" role="button">Open Discovery</Link>
                <Link to={routeCatalogByKey.finder.path} role="button">Open Finder</Link>
              </WingmanActionBar>
            }
          >
            <div className="wm-template-review-grid">
              <WingmanCard
                meta="Room type"
                title={selectedTemplate.vertical}
                subtitle={selectedTemplate.application}
              />

              <WingmanCard
                meta="Scale"
                title={selectedTemplate.scale}
                subtitle={selectedTemplate.architecture}
              />

              <WingmanCard
                meta="Feature cues"
                title="Check these first"
              >
                <div className="wm-template-feature-list">
                  {templateFeatureCues(selectedTemplate).map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
              </WingmanCard>

              <WingmanCard
                meta="Next action"
                title="Review and refine"
                subtitle="Open the template review to adjust the BOM, export the room package, or save it as a project."
              />
            </div>
          </WingmanPanel>
        ) : null}
      </div>
    </WingmanPageFrame>
  );
}

export default TemplatesPage;
