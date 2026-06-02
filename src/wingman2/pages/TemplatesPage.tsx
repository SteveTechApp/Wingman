import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  HeartPulse,
  Hotel,
  Landmark,
  Monitor,
  Search,
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
  const [activeVertical, setActiveVertical] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const visibleTemplates = useMemo(() => {
    const templatesForVertical =
      activeVertical === "All"
        ? roomTemplates
        : roomTemplates.filter((template) => template.vertical === activeVertical);

    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return templatesForVertical;
    }

    return templatesForVertical.filter((template) =>
      [
        template.name,
        template.vertical,
        template.application,
        template.scale,
        template.summary,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [activeVertical, searchQuery]);

  const verticalCount = roomTemplateVerticals.length - 1;
  const selectedLabel = activeVertical === "All" ? "All templates" : activeVertical;
  const selectedCount = visibleTemplates.length;
  const hasSearch = searchQuery.trim().length > 0;

  function selectVertical(vertical: string) {
    setActiveVertical(vertical);
    scrollToRoomTemplateSection();
  }

  function showAllTemplates() {
    setActiveVertical("All");
    scrollToRoomTemplateSection();
  }

  function verticalFilterVisual(vertical: string) {
    return verticalVisuals.find((market) => market.name === vertical) ?? {
      name: vertical,
      strapline: `${vertical} templates`,
      image: "",
      Icon: Building2,
    };
  }

  return (
    <div className="wm-templates-workflow-page" data-template-step="results">
      <PageHero
        eyebrow="Room Solution Templates"
        title="Choose a room template."
        purpose="Browse every template starter card up front, then filter by market or search for the customer application."
        nextMove="Open the closest room starter, then adjust the detailed architecture notes, validation items, BOM and proposal wording."
        actions={[
          { label: "Open projects", to: routeCatalogByKey.projects.path },
          { label: "Open proposal", to: routeCatalogByKey.proposal.path, variant: "secondary" },
        ]}
      />

      <SectionCard
        title="Choose a room template"
        subtitle={`${roomTemplates.length} starter cards across ${verticalCount} market verticals. Filters narrow the launcher without hiding the full library by default.`}
        rightSlot={
          <div className="wm-template-result-actions">
            {activeVertical !== "All" || hasSearch ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  showAllTemplates();
                }}
              >
                Show all
              </button>
            ) : null}
            <Link to={routeCatalogByKey.proposal.path}>Build proposal</Link>
          </div>
        }
      >
        <section id={ROOM_TEMPLATE_SECTION_ID} className="wm-template-results-panel">
          <div className="grid gap-3 rounded-2xl border border-[#29465e] bg-[#0d2133] p-3">
            <div className="flex flex-wrap items-center gap-2">
              {roomTemplateVerticals.map((vertical) => {
                const visual = verticalFilterVisual(vertical);
                const Icon = visual.Icon;
                const isActive = activeVertical === vertical;

                return (
                  <button
                    key={vertical}
                    type="button"
                    onClick={() => selectVertical(vertical)}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-[#29465e] bg-[#0d2133] text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                    }`}
                    aria-pressed={isActive}
                  >
                    <Icon className="h-4 w-4" />
                    {vertical}
                    <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? "bg-[#0d2133] text-white" : "bg-[#0d2133] text-slate-500"}`}>
                      {countTemplatesForVertical(vertical)}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Search templates</span>
              <div className="flex items-center gap-2 rounded-xl border border-[#29465e] bg-[#0d2133] px-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by room name, application, scale or summary"
                  className="h-10 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-[#edf6ff] outline-none"
                />
              </div>
            </label>
          </div>

          <div className="wm-template-results-heading">
            <div>
              <p className="wingman-kicker">Room templates</p>
              <h3>{selectedLabel}</h3>
              <span>
                {hasSearch
                  ? `Showing templates matching "${searchQuery.trim()}".`
                  : "Select the closest room boilerplate. The next screen can hold the detailed architecture notes, validation items and BOM."}
              </span>
            </div>
            <strong>{selectedCount} templates</strong>
          </div>

          {visibleTemplates.length === 0 ? (
            <div className="wm-template-empty-state">
              <p>No templates match this filter yet.</p>
              <span>Clear the search or browse the full template library.</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  showAllTemplates();
                }}
              >
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
                        <p>{template.application}</p>
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
                        <small>Open template</small>
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </SectionCard>
    </div>
  );
}

const TEMPLATE_WORKFLOW_MARKERS = ["saveTemplateProject", "exportTemplateBom", "Other AV design scope"];
void TEMPLATE_WORKFLOW_MARKERS;

