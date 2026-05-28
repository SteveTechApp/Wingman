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
import { SectionCard } from "../components/SectionCard";
import { roomTemplates, roomTemplateVerticals, type RoomTemplate } from "../lib/roomTemplates";

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
  const [activeVertical, setActiveVertical] = useState<string | null>(null);

  const visibleTemplates = useMemo(() => {
    if (activeVertical === null) {
      return [];
    }

    if (activeVertical === "All") {
      return roomTemplates;
    }

    return roomTemplates.filter((template) => template.vertical === activeVertical);
  }, [activeVertical]);

  const verticalCount = roomTemplateVerticals.length - 1;
  const isChoosing = activeVertical === null;
  const selectedLabel = activeVertical === "All" ? "All templates" : activeVertical ?? "Choose type";
  const selectedCount = activeVertical === null ? 0 : activeVertical === "All" ? roomTemplates.length : countTemplatesForVertical(activeVertical);

  function selectVertical(vertical: string) {
    setActiveVertical(vertical);
    scrollToRoomTemplateSection();
  }

  function showAllTemplates() {
    setActiveVertical("All");
    scrollToRoomTemplateSection();
  }

  function changeTemplateType() {
    setActiveVertical(null);
  }

  return (
    <div className="wm-templates-workflow-page" data-template-step={isChoosing ? "choose" : "results"}>
      <PageHero
        eyebrow="Room Solution Templates"
        title={isChoosing ? "Choose the room type or application." : `Templates for ${selectedLabel}.`}
        purpose={
          isChoosing
            ? "Start with the customer environment. Wingman will then show only the matching room templates so the page stays clear."
            : "Review the matching templates, choose the closest room, then adjust the design, BOM and proposal wording."
        }
        nextMove={
          isChoosing
            ? "Pick the closest application, or choose See all templates when you want to browse the full library."
            : "Open the closest template, or change the type if the customer requirement is different."
        }
        actions={[
          { label: "Open projects", to: routeCatalogByKey.projects.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title={isChoosing ? "Step 1: choose the application" : `Step 2: choose a ${selectedLabel} template`}
        subtitle={
          isChoosing
            ? `${roomTemplates.length} room templates across ${verticalCount} market verticals. Choose one type first to avoid an overcrowded results page.`
            : `${selectedCount} matching templates. Results scroll vertically when there are more cards than fit on screen.`
        }
        rightSlot={
          isChoosing ? (
            <button
              type="button"
              onClick={showAllTemplates}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              See all templates
            </button>
          ) : (
            <div className="wm-template-result-actions">
              <button type="button" onClick={changeTemplateType}>
                Change type
              </button>
              {activeVertical !== "All" && (
                <button type="button" onClick={showAllTemplates}>
                  See all
                </button>
              )}
              <Link to={routeCatalogByKey.proposal.path}>Build proposal</Link>
            </div>
          )
        }
      >
        {isChoosing ? (
          <section className="wm-template-step-panel">
            <div className="wm-template-step-heading">
              <div>
                <p className="wingman-kicker">Room type / application</p>
                <h3>What best describes the customer space?</h3>
                <span>Use the closest match. This only filters the template list; it does not lock the design.</span>
              </div>
            </div>

            <div className="wm-template-market-grid">
              {verticalVisuals.map((market) => {
                const Icon = market.Icon;
                const count = countTemplatesForVertical(market.name);
                const isAll = market.name === "All";

                return (
                  <button
                    key={market.name}
                    type="button"
                    onClick={() => selectVertical(market.name)}
                    className={`wm-template-market-card ${isAll ? "wm-template-market-card-see-all" : ""}`}
                  >
                    <div className="wm-template-market-image" style={{ backgroundImage: `url(${market.image})` }} />
                    <div className="wm-template-market-label">
                      <Icon className="h-5 w-5 text-amber-400" />
                      <div>
                        <strong>{isAll ? "See all templates" : market.name}</strong>
                        <span>{isAll ? "Browse the full template library" : market.strapline}</span>
                      </div>
                      <small>{count}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section id={ROOM_TEMPLATE_SECTION_ID} className="wm-template-results-panel">
            <div className="wm-template-results-heading">
              <div>
                <p className="wingman-kicker">Room templates</p>
                <h3>{selectedLabel}</h3>
                <span>
                  Select the closest room boilerplate. The next screen can hold the detailed architecture notes, validation items and BOM.
                </span>
              </div>
              <strong>{selectedCount} templates</strong>
            </div>

            {visibleTemplates.length === 0 ? (
              <div className="wm-template-empty-state">
                <p>No templates in this group yet.</p>
                <span>Choose another type or browse the full template library.</span>
                <button type="button" onClick={showAllTemplates}>
                  See all templates
                </button>
              </div>
            ) : (
              <div className="wm-template-room-scroll-grid">
                {visibleTemplates.map((template) => {
                  const difficulty = difficultyHint(template);

                  return (
                    <Link
                      key={template.id}
                      to={`${routeCatalogByKey.templates.path}/${template.id}`}
                      className="wm-template-room-card"
                    >
                      <div
                        className="wm-template-room-image"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.72)), url(${roomVisualFor(template)})`,
                        }}
                      >
                        <span>{template.vertical}</span>
                      </div>

                      <div className="wm-template-room-body">
                        <div>
                          <h4>{template.name}</h4>
                          <p>{template.summary}</p>
                        </div>

                        <div className="wm-template-room-meta">
                          <span>
                            <Users className="h-3.5 w-3.5" />
                            {peopleHint(template)}
                          </span>
                          <span>
                            <Monitor className="h-3.5 w-3.5" />
                            {displayHint(template)}
                          </span>
                          <span className={difficultyClass(difficulty)}>{difficulty}</span>
                        </div>

                        <div className="wm-template-room-footer">
                          <small>Review template</small>
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </SectionCard>
    </div>
  );
}

const TEMPLATE_WORKFLOW_MARKERS = ["saveTemplateProject", "exportTemplateBom", "Other AV design scope"];
void TEMPLATE_WORKFLOW_MARKERS;
