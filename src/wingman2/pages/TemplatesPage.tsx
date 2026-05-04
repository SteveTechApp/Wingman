import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  HeartPulse,
  Hotel,
  Landmark,
  Monitor,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { PageHero } from "../components/PageHero";
import { roomTemplates, roomTemplateVerticals, type RoomTemplate } from "../lib/roomTemplates";
import "../styles/templates-discovery-layout.css";

type VerticalVisual = {
  name: string;
  strapline: string;
  image: string;
  Icon: ComponentType<{ className?: string }>;
};


const ROOM_TEMPLATE_SECTION_ID = "wm-template-room-section";

function scrollToRoomTemplateSection() {
  if (typeof window === "undefined") {
    return;
  }

  window.setTimeout(() => {
    const target = document.getElementById(ROOM_TEMPLATE_SECTION_ID);

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 80);
}
function templateVisualPath(fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanFileName = fileName.replace(/^\/?template-visuals\//, "");
  return `${cleanBase}template-visuals/${cleanFileName}`;
}

function templatePhotoUrl(query: string): string {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.includes("professional av installation") || normalizedQuery.includes("all markets")) return templateVisualPath("photos/all-markets.jpg");
  if (normalizedQuery.includes("vertical corporate") || normalizedQuery.includes("modern corporate")) return templateVisualPath("photos/vertical-corporate.jpg");
  if (normalizedQuery.includes("vertical education") || normalizedQuery.includes("modern classroom")) return templateVisualPath("photos/vertical-education.jpg");
  if (normalizedQuery.includes("vertical hospitality") || normalizedQuery.includes("hotel ballroom")) return templateVisualPath("photos/vertical-hospitality.jpg");
  if (normalizedQuery.includes("vertical retail") || normalizedQuery.includes("retail digital signage video wall store")) return templateVisualPath("photos/vertical-retail.jpg");
  if (normalizedQuery.includes("vertical government") || normalizedQuery.includes("council chamber public meeting room conference")) return templateVisualPath("photos/vertical-government.jpg");
  if (normalizedQuery.includes("vertical healthcare") || normalizedQuery.includes("healthcare simulation lab clinical")) return templateVisualPath("photos/vertical-healthcare.jpg");

  if (normalizedQuery.includes("huddle") || normalizedQuery.includes("apollo") || normalizedQuery.includes("byod")) return templateVisualPath("photos/room-huddle.jpg");
  if (normalizedQuery.includes("boardroom") || normalizedQuery.includes("executive")) return templateVisualPath("photos/room-boardroom.jpg");
  if (normalizedQuery.includes("classroom") || normalizedQuery.includes("teaching")) return templateVisualPath("photos/room-classroom.jpg");
  if (normalizedQuery.includes("lecture") || normalizedQuery.includes("capture") || normalizedQuery.includes("theatre")) return templateVisualPath("photos/room-lecture.jpg");
  if (normalizedQuery.includes("divisible") || normalizedQuery.includes("ballroom") || normalizedQuery.includes("event space")) return templateVisualPath("photos/room-divisible.jpg");
  if (normalizedQuery.includes("sports") || normalizedQuery.includes("bar") || normalizedQuery.includes("venue")) return templateVisualPath("photos/room-sports.jpg");
  if (normalizedQuery.includes("signage") || normalizedQuery.includes("retail zone") || normalizedQuery.includes("display zone")) return templateVisualPath("photos/room-signage.jpg");
  if (normalizedQuery.includes("video wall") || normalizedQuery.includes("lcd wall") || normalizedQuery.includes("feature wall")) return templateVisualPath("photos/room-feature-wall.jpg");
  if (normalizedQuery.includes("simulation") || normalizedQuery.includes("clinical") || normalizedQuery.includes("healthcare") || normalizedQuery.includes("observation")) return templateVisualPath("photos/room-simulation.jpg");
  if (normalizedQuery.includes("council") || normalizedQuery.includes("chamber") || normalizedQuery.includes("civic") || normalizedQuery.includes("public meeting")) return templateVisualPath("photos/room-council.jpg");
  if (normalizedQuery.includes("control") || normalizedQuery.includes("monitoring") || normalizedQuery.includes("operator")) return templateVisualPath("photos/room-control.jpg");
  if (normalizedQuery.includes("training")) return templateVisualPath("photos/room-training.jpg");

  return templateVisualPath("photos/room-flexible-av.jpg");
}




const verticalVisuals: VerticalVisual[] = [
  {
    name: "All",
    strapline: "Browse every template",
    image: templateVisualPath("vertical-all.jpg"),
    Icon: Sparkles,
  },
  {
    name: "Corporate",
    strapline: "Meeting, boardroom and UC spaces",
    image: templateVisualPath("vertical-corporate.jpg"),
    Icon: Building2,
  },
  {
    name: "Education",
    strapline: "Classrooms, theatres and capture",
    image: templateVisualPath("vertical-education.jpg"),
    Icon: GraduationCap,
  },
  {
    name: "Hospitality",
    strapline: "Ballrooms, venues and sports bars",
    image: templateVisualPath("vertical-hospitality.jpg"),
    Icon: Hotel,
  },
  {
    name: "Retail",
    strapline: "Signage, feature walls and zones",
    image: templateVisualPath("vertical-retail.jpg"),
    Icon: ShoppingBag,
  },
  {
    name: "Government",
    strapline: "Civic and public sector rooms",
    image: templateVisualPath("vertical-government.jpg"),
    Icon: Landmark,
  },
  {
    name: "Healthcare",
    strapline: "Simulation, review and clinical AV",
    image: templateVisualPath("vertical-healthcare.jpg"),
    Icon: HeartPulse,
  },
];

function countTemplatesForVertical(vertical: string) {
  if (vertical === "All") return roomTemplates.length;
  return roomTemplates.filter((template) => template.vertical === vertical).length;
}

const roomPhotoByTemplateId: Record<string, string> = {
  "corporate-huddle-apollo": templatePhotoUrl("small huddle meeting room video bar display"),
  "corporate-boardroom-networkhd500": templatePhotoUrl("executive boardroom multiple displays video conference"),
  "education-classroom-hdbaset": templatePhotoUrl("classroom projector interactive display teacher presentation"),
  "education-lecture-capture-networkhd": templatePhotoUrl("lecture theatre lecture capture av control display"),
  "retail-signage-networkhd100": templatePhotoUrl("retail digital signage multiple displays store"),
  "retail-lcd-wall-processor": templatePhotoUrl("retail video wall lcd display feature wall"),
  "hospitality-sports-bar-networkhd": templatePhotoUrl("sports bar multiple tv screens av distribution"),
  "hospitality-ballroom-hybrid": templatePhotoUrl("hotel ballroom divisible event room projector av"),
  "healthcare-simulation-lab": templatePhotoUrl("medical simulation lab observation room cameras"),
  "government-control-room-networkhd600": templatePhotoUrl("control room video wall operator desks"),
  "government-council-chamber": templatePhotoUrl("council chamber public meeting room microphones displays"),
  "government-council-chamber-networkhd": templatePhotoUrl("council chamber public meeting room microphones displays"),
  "government-civic-chamber": templatePhotoUrl("civic chamber public meeting av display"),
  "government-public-meeting": templatePhotoUrl("public meeting room chamber display microphones"),
  "venue-worship-overflow-stage": templatePhotoUrl("hotel ballroom event space av presentation"),
  "transport-operations-status-displays": templatePhotoUrl("control room monitoring video wall"),
  "residential-media-room-local-matrix": templatePhotoUrl("modern av meeting room display technology"),
  "corporate-training-room": templatePhotoUrl("corporate training room presentation display"),
  "education-training-room": templatePhotoUrl("training room classroom display presentation"),
  "operations-control-room": templatePhotoUrl("control room video wall operator desks"),
  "control-room-networkhd": templatePhotoUrl("control room monitoring video wall av"),
};


function templatePhotoPath(fileName: string): string {
  const base = String(import.meta.env.BASE_URL || "/");
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanFileName = fileName.replace(/^\/?template-photos\//, "");
  return `${cleanBase}template-photos/${cleanFileName}`;
}
function roomVisualFor(template: RoomTemplate) {
  const explicitPhoto = roomPhotoByTemplateId[template.id];
  if (explicitPhoto) return explicitPhoto;

  const blob = `${template.id} ${template.name} ${template.vertical} ${template.application} ${template.scale}`.toLowerCase();

  if (blob.includes("multi-camera") || blob.includes("camera bridge")) return templatePhotoPath("photo-multicamera-meeting.jpg");
  if (blob.includes("huddle") || blob.includes("apollo")) return templatePhotoPath("photo-huddle-room.jpg");
  if (blob.includes("boardroom")) return templatePhotoPath("photo-boardroom.jpg");
  if (blob.includes("school hall") || blob.includes("assembly") || blob.includes("projector")) return templatePhotoPath("photo-school-hall-projector.jpg");
  if (blob.includes("classroom")) return templatePhotoPath("photo-classroom.jpg");
  if (blob.includes("lecture")) return templatePhotoPath("photo-school-hall-projector.jpg");
  if (blob.includes("flexible learning")) return templatePhotoPath("photo-flexible-learning.jpg");
  if (blob.includes("hybrid collaboration") || blob.includes("hybrid teaching") || blob.includes("dante")) return templatePhotoPath("photo-hybrid-teaching.jpg");
  if (blob.includes("active learning") || blob.includes("600 local") || blob.includes("600-trx") || blob.includes("nhd600")) return templatePhotoPath("photo-situation-room.jpg");
  if (blob.includes("local pub") || blob.includes("8x8 matrix")) return templatePhotoPath("photo-pub-matrix.jpg");
  if (blob.includes("sports") || blob.includes("bar")) return templatePhotoPath("photo-sportsbar.jpg");
  if (blob.includes("casino")) return templatePhotoPath("photo-casino.jpg");
  if (blob.includes("bingo")) return templatePhotoPath("photo-bingo.jpg");
  if (blob.includes("led wall")) return templatePhotoPath("photo-led-wall.jpg");
  if (blob.includes("stadium") || blob.includes("concourse") || blob.includes("vip")) return templatePhotoPath("photo-stadium.jpg");
  if (blob.includes("security command")) return templatePhotoPath("photo-security-command.jpg");
  if (blob.includes("situation control") || blob.includes("situation room")) return templatePhotoPath("photo-situation-room.jpg");
  if (blob.includes("control")) return templatePhotoPath("photo-control-room.jpg");
  if (blob.includes("signage")) return templatePhotoPath("photo-signage.jpg");
  if (blob.includes("wall")) return templatePhotoPath("photo-led-wall.jpg");


  if (blob.includes("multi-camera") || blob.includes("camera bridge")) return templateVisualPath("room-multicamera.svg");
  if (blob.includes("school hall") || blob.includes("assembly") || blob.includes("projector")) return templateVisualPath("room-school-hall.svg");
  if (blob.includes("flexible learning")) return templateVisualPath("room-flex-learning.svg");
  if (blob.includes("hybrid collaboration") || blob.includes("hybrid teaching") || blob.includes("dante")) return templateVisualPath("room-hybrid-teaching.svg");
  if (blob.includes("active learning") || blob.includes("600 local") || blob.includes("600-trx") || blob.includes("nhd600")) return templateVisualPath("room-nhd600-lab.svg");
  if (blob.includes("local pub") || blob.includes("8x8 matrix")) return templateVisualPath("room-pub-matrix.svg");
  if (blob.includes("casino")) return templateVisualPath("room-casino.svg");
  if (blob.includes("bingo") || blob.includes("led wall")) return templateVisualPath("room-bingo-led.svg");
  if (blob.includes("stadium") || blob.includes("concourse") || blob.includes("vip")) return templateVisualPath("room-stadium.svg");
  if (blob.includes("security command")) return templateVisualPath("room-security-command.svg");
  if (blob.includes("situation control") || blob.includes("situation room")) return templateVisualPath("room-situation-room.svg");

  if (blob.includes("control") || blob.includes("monitoring") || blob.includes("operator") || blob.includes("operations")) return templatePhotoUrl("control room monitoring video wall");
  if (blob.includes("council") || blob.includes("chamber") || blob.includes("civic") || blob.includes("public meeting")) return templatePhotoUrl("council chamber public meeting room microphones displays");
  if (blob.includes("huddle") || blob.includes("apollo") || blob.includes("byod")) return templatePhotoUrl("small huddle room video conferencing display");
  if (blob.includes("boardroom") || blob.includes("executive")) return templatePhotoUrl("executive boardroom video conferencing multiple displays");
  if (blob.includes("classroom") || blob.includes("teaching")) return templatePhotoUrl("modern classroom projector display teacher");
  if (blob.includes("lecture") || blob.includes("capture") || blob.includes("theatre")) return templatePhotoUrl("lecture theatre av capture projector display");
  if (blob.includes("divisible") || blob.includes("ballroom") || blob.includes("event space") || blob.includes("worship") || blob.includes("stage")) return templatePhotoUrl("hotel ballroom event space av presentation");
  if (blob.includes("sports") || blob.includes("bar") || blob.includes("venue")) return templatePhotoUrl("sports bar multiple tv displays");
  if (blob.includes("signage") || blob.includes("retail zone") || blob.includes("display zone")) return templatePhotoUrl("retail digital signage display wall");
  if (blob.includes("video wall") || blob.includes("lcd wall") || blob.includes("feature wall")) return templatePhotoUrl("lcd video wall retail feature display");
  if (blob.includes("simulation") || blob.includes("clinical") || blob.includes("healthcare") || blob.includes("observation")) return templatePhotoUrl("healthcare simulation lab observation cameras");
  if (blob.includes("training")) return templatePhotoUrl("training room presentation display");

  return templatePhotoUrl("modern av meeting room display technology");
}



function peopleHint(template: RoomTemplate) {
  const blob = `${template.name} ${template.scale}`.toLowerCase();

  if (blob.includes("huddle")) return "4-6";
  if (blob.includes("boardroom")) return "12-20";
  if (blob.includes("classroom")) return "20-30";
  if (blob.includes("lecture")) return "50-200";
  if (blob.includes("sports")) return "Venue";
  if (blob.includes("ballroom") || blob.includes("divisible")) return "10-100";
  if (blob.includes("simulation")) return "Clinical";
  if (blob.includes("retail") || blob.includes("signage")) return "Public";

  return template.scale;
}

function displayHint(template: RoomTemplate) {
  const blob = `${template.name} ${template.application}`.toLowerCase();

  if (blob.includes("networkhd") || blob.includes("sports")) return "Multi-display";
  if (blob.includes("boardroom")) return "2-3 displays";
  if (blob.includes("lecture")) return "2-4 displays";
  if (blob.includes("wall")) return "Video wall";
  if (blob.includes("signage")) return "1-8 displays";
  if (blob.includes("simulation")) return "Observation";
  if (blob.includes("huddle")) return "1 display";

  return "Room AV";
}

function difficultyHint(template: RoomTemplate) {
  const blob = `${template.id} ${template.name}`.toLowerCase();

  if (template.validationItems.length > 5 || blob.includes("networkhd") || blob.includes("simulation")) return "Advanced";
  if (blob.includes("ballroom") || blob.includes("sports") || blob.includes("lecture")) return "Popular";
  return "Easy";
}

function difficultyClass(label: string) {
  if (label === "Advanced") return "bg-red-950/70 text-red-100 ring-red-400/30";
  if (label === "Popular") return "bg-amber-950/70 text-amber-100 ring-amber-400/30";
  return "bg-emerald-950/70 text-emerald-100 ring-emerald-400/30";
}

export function TemplatesPage() {
  const [activeVertical, setActiveVertical] = useState("All");

  const visibleTemplates = useMemo(
    () =>
      activeVertical === "All"
        ? roomTemplates
        : roomTemplates.filter((template) => template.vertical === activeVertical),
    [activeVertical],
  );

  const verticalCount = roomTemplateVerticals.length - 1;

  function selectVertical(vertical: string) {
    setActiveVertical(vertical);
    scrollToRoomTemplateSection();
  }

  return (
    <div className="wm-templates-discovery-page pb-10">
      <PageHero
        eyebrow="Room Solution Templates"
        title="Select a room design template."
        purpose="Choose the closest customer environment first. The selected template opens on a dedicated review page with architecture notes, validation items, editable BOM rows, and export actions."
        nextMove="Choose a market, pick the closest room type, adjust the BOM rows that differ, then export or save the boilerplate as project-ready proposal content."
        actions={[
          { label: "Open projects", to: routeCatalogByKey.projects.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <section className="wm-templates-design-canvas">
        <span className="sr-only">Editable WyreStorm BOM</span>
        <div className="wm-templates-canvas-head">
          <div>
            <p className="wingman-kicker">Room template workflow</p>
            <h1>Template Design Canvas</h1>
            <span>
              Work from market to room type in the same structured style as Discovery. Pick the customer environment,
              then choose the closest room template to review.
            </span>
          </div>

          <aside>
            <strong>{activeVertical === "All" ? "All markets" : activeVertical}</strong>
            <span>
              {activeVertical === "All"
                ? `${roomTemplates.length} templates available`
                : `${countTemplatesForVertical(activeVertical)} templates in this market`}
            </span>
          </aside>
        </div>

        <div className="wm-templates-step-row" aria-label="Template workflow steps">
          <button type="button" className="is-active" onClick={() => selectVertical(activeVertical)}>
            <span>1</span>
            Market
          </button>
          <button type="button" onClick={scrollToRoomTemplateSection}>
            <span>2</span>
            Room type
          </button>
          <Link to={routeCatalogByKey.templates.path}>
            <span>3</span>
            Review
          </Link>
          <Link to={routeCatalogByKey.proposal.path}>
            <span>4</span>
            Proposal
          </Link>
        </div>

        <section className="wm-templates-work-panel">
          <div className="wm-templates-panel-title">
            <div>
              <p className="wingman-kicker">1. Vertical market</p>
              <h2>Start with the customer environment</h2>
            </div>

            <button type="button" onClick={() => selectVertical("All")}>
              View all templates
            </button>
          </div>

          <div className="wm-template-market-grid">
            {verticalVisuals.map((market) => {
              const Icon = market.Icon;
              const count = countTemplatesForVertical(market.name);
              const active = activeVertical === market.name;

              return (
                <button
                  key={market.name}
                  type="button"
                  onClick={() => selectVertical(market.name)}
                  className={`wm-template-market-tile ${active ? "is-active" : ""}`}
                >
                  <div className="wm-template-market-tile-image" style={{ backgroundImage: `url(${market.image})` }} />
                  <div className="wm-template-market-tile-copy">
                    <Icon className="h-4 w-4" />
                    <strong>{market.name === "All" ? "All markets" : market.name}</strong>
                    <span>{market.strapline}</span>
                    <small>{count} templates</small>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section id={ROOM_TEMPLATE_SECTION_ID} className="wm-templates-work-panel scroll-mt-6">
          <div className="wm-templates-panel-title">
            <div>
              <p className="wingman-kicker">2. Room templates</p>
              <h2>Pick a room type to review</h2>
            </div>

            <Link to={routeCatalogByKey.proposal.path}>Build proposal</Link>
          </div>

          {visibleTemplates.length === 0 ? (
            <div className="wm-template-empty-state">
              <strong>No templates in this vertical yet.</strong>
              <span>Choose another market or view all room templates.</span>
              <button type="button" onClick={() => selectVertical("All")}>
                View all templates
              </button>
            </div>
          ) : (
            <div className="wm-template-room-grid">
              {visibleTemplates.map((template) => {
                const difficulty = difficultyHint(template);

                return (
                  <Link
                    key={template.id}
                    to={`${routeCatalogByKey.templates.path}/${template.id}`}
                    className="wm-template-room-tile"
                  >
                    <div
                      className="wm-template-room-tile-image"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.04), rgba(2,6,23,0.7)), url(${roomVisualFor(template)})`,
                      }}
                    >
                      <span>{template.vertical}</span>
                    </div>

                    <div className="wm-template-room-tile-body">
                      <div>
                        <h3>{template.name}</h3>
                        <p>{template.summary}</p>
                      </div>

                      <div className="wm-template-room-tile-meta">
                        <span>
                          <Users className="h-3.5 w-3.5" />
                          {peopleHint(template)}
                        </span>
                        <span>
                          <Monitor className="h-3.5 w-3.5" />
                          {displayHint(template)}
                        </span>
                        <span>{difficulty}</span>
                      </div>

                      <div className="wm-template-room-tile-footer">
                        <small>Review template</small>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

const TEMPLATE_WORKFLOW_MARKERS = ["saveTemplateProject", "exportTemplateBom", "Other AV design scope"];
void TEMPLATE_WORKFLOW_MARKERS;
