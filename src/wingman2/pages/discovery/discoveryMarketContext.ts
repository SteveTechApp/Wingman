import type { DiscoveryAnswers } from "./discoveryTypes";

export type DiscoveryEnvironment = {
  id: string;
  label: string;
  cue: string;
  suggestedApplication?: string;
};

export type DiscoveryMarket = {
  id: string;
  label: string;
  environments: readonly DiscoveryEnvironment[];
};

const space = (id: string, label: string, cue: string, suggestedApplication?: string): DiscoveryEnvironment =>
  ({ id, label, cue, suggestedApplication });

export const DISCOVERY_MARKETS: readonly DiscoveryMarket[] = [
  { id: "corporate", label: "Corporate & enterprise", environments: [
    space("meeting", "Meeting or boardroom", "Check collaboration, laptop access and room control.", "meeting-room"),
    space("town-hall", "Town hall or auditorium", "Check presentation, overflow and live-stream destinations.", "av-over-ip"),
    space("operations", "Operations or security centre", "Check operator sources, shared displays and availability.", "av-over-ip"),
    space("campus", "Multi-floor or campus distribution", "Check source sharing, network ownership and local control.", "av-over-ip"),
  ] },
  { id: "education", label: "Education & higher education", environments: [
    space("classroom", "Classroom or teaching space", "Check lectern sources, student visibility and room audio.", "classroom"),
    space("lecture", "Lecture theatre", "Check capture, overflow, confidence displays and accessibility.", "classroom"),
    space("simulation", "Simulation or specialist lab", "Check multiple workstations, live feeds and observation.", "av-over-ip"),
    space("campus", "Campus-wide distribution", "Check shared sources, AV VLAN and IT ownership.", "av-over-ip"),
  ] },
  { id: "government", label: "Government & public sector", environments: [
    space("chamber", "Council or committee chamber", "Check speaker visibility, public feeds and recording.", "meeting-room"),
    space("courtroom", "Courtroom or hearing room", "Check evidence sources, controlled display and recording.", "av-over-ip"),
    space("briefing", "Public briefing or training room", "Check presentation, hybrid participation and overflow.", "meeting-room"),
    space("control", "Security or operations centre", "Check operator routing, shared displays and resilience.", "av-over-ip"),
  ] },
  { id: "emergency", label: "Emergency services / blue light", environments: [
    space("incident", "Incident command room", "Check live feeds, decision displays and fallback workflows.", "av-over-ip"),
    space("dispatch", "Dispatch or control centre", "Check operator workstations, shared views and availability.", "av-over-ip"),
    space("training", "Training or simulation suite", "Check replay, instructor routing and observation.", "av-over-ip"),
    space("station", "Station briefing room", "Check rapid briefing, local sources and simple control.", "meeting-room"),
  ] },
  { id: "energy", label: "Energy, oil & gas", environments: [
    space("control", "Plant or grid control room", "Check live operational sources, operator views and uptime.", "av-over-ip"),
    space("remote", "Remote-site monitoring", "Check feed transport, network boundaries and availability.", "av-over-ip"),
    space("engineering", "Engineering collaboration room", "Check high-detail sources, sharing and conferencing.", "meeting-room"),
    space("training", "Safety or technical training", "Check instructor sources, replay and participant views.", "classroom"),
  ] },
  { id: "manufacturing", label: "Manufacturing & logistics", environments: [
    space("production", "Production-floor visualisation", "Check operational data, viewing distance and zones.", "av-over-ip"),
    space("operations", "Operations or control centre", "Check workstation routing and shared situational views.", "av-over-ip"),
    space("quality", "Quality or engineering room", "Check inspection sources and detailed display needs.", "meeting-room"),
    space("warehouse", "Warehouse information displays", "Check content zones, schedules and source ownership.", "hospitality"),
  ] },
  { id: "healthcare", label: "Healthcare", environments: [
    space("teaching", "Clinical teaching or simulation", "Check demonstration sources, observation and recording.", "classroom"),
    space("consultation", "Consultation or meeting room", "Check collaboration, privacy and device ownership.", "meeting-room"),
    space("coordination", "Coordination or command room", "Check shared operational views and availability.", "av-over-ip"),
    space("public", "Waiting-area information", "Check content zones and scheduling.", "hospitality"),
  ] },
  { id: "hospitality", label: "Hospitality & leisure", environments: [
    space("sports", "Bar or sports venue", "Check simultaneous feeds, zones and staff control.", "hospitality"),
    space("hotel", "Hotel or conference venue", "Check room changes, event sources and distribution.", "hospitality"),
    space("guest", "Guest or public areas", "Check signage, entertainment and audio zones.", "hospitality"),
  ] },
  { id: "retail", label: "Retail", environments: [
    space("store", "Store displays and signage", "Check content scheduling and display zones.", "hospitality"),
    space("experience", "Experience or demonstration area", "Check interactive sources and staff control.", "video-wall"),
    space("estate", "Multi-site retail estate", "Check content ownership and local versus central control.", "av-over-ip"),
  ] },
  { id: "transport", label: "Transport & infrastructure", environments: [
    space("operations", "Transport operations centre", "Check live feeds, operator views and resilience.", "av-over-ip"),
    space("passenger", "Passenger information area", "Check content zones and live updates.", "hospitality"),
    space("training", "Training or briefing room", "Check presentation, simulation and recording.", "classroom"),
  ] },
  { id: "venues", label: "Venues, sport & worship", environments: [
    space("arena", "Arena or stadium", "Check many display zones and live sources.", "av-over-ip"),
    space("auditorium", "Auditorium or worship space", "Check live presentation, overflow and recording.", "av-over-ip"),
    space("event", "Event or performance space", "Check changing sources, operator control and displays.", "video-wall"),
  ] },
  { id: "broadcast", label: "Broadcast & media", environments: [
    space("studio", "Studio or production suite", "Check live source routing and monitoring.", "av-over-ip"),
    space("gallery", "Production gallery", "Check operator views, multiview and latency.", "av-over-ip"),
    space("newsroom", "Newsroom display environment", "Check live feeds and content control.", "video-wall"),
  ] },
  { id: "residential", label: "Residential", environments: [
    space("living", "Living or entertainment room", "Check source sharing and simple control.", "meeting-room"),
    space("whole-home", "Whole-home distribution", "Check zones, source sharing and infrastructure.", "av-over-ip"),
  ] },
  { id: "other", label: "Other / not sure", environments: [
    space("other", "Describe the environment", "Capture the customer's words; Wingman will work from the technical needs."),
  ] },
];

export function getDiscoveryMarket(id: string): DiscoveryMarket | undefined {
  return DISCOVERY_MARKETS.find((market) => market.id === id);
}

export function getDiscoveryEnvironment(marketId: string, environmentId: string): DiscoveryEnvironment | undefined {
  return getDiscoveryMarket(marketId)?.environments.find((environment) => environment.id === environmentId);
}

export const DISCOVERY_TEMPLATE_MARKET: Record<string, string> = {
  corporate: "Corporate", education: "Education", government: "Government",
  emergency: "Emergency Services", energy: "Energy / Oil & Gas", manufacturing: "Manufacturing / Logistics",
  healthcare: "Healthcare", hospitality: "Hospitality", retail: "Retail",
  transport: "Transportation", venues: "Sports & Leisure", broadcast: "Broadcast / Media",
  residential: "Residential",
};

export const RELATED_TEMPLATE_MARKETS: Record<string, readonly string[]> = {
  emergency: ["Government", "Control Rooms"],
  energy: ["Control Rooms"],
  manufacturing: ["Control Rooms", "Corporate"],
  venues: ["Sports & Leisure", "House of Worship"],
};

const MARKET_PHOTOS: Record<string, string> = {
  corporate: "photo-boardroom.jpg", education: "discovery-classroom-v2.jpg",
  government: "photo-security-command.jpg", emergency: "photo-situation-room.jpg",
  energy: "discovery-energy-market-v1.png", manufacturing: "discovery-manufacturing-market-v1.png",
  healthcare: "photo-multicamera-meeting.jpg", hospitality: "discovery-hospitality-v2.jpg",
  retail: "discovery-retail-market-v1.png", transport: "discovery-transport-market-v1.png",
  venues: "photo-stadium.jpg", broadcast: "photo-led-wall.jpg",
  residential: "photo-huddle-room.jpg", other: "discovery-not-sure-v2.jpg",
};

export function photoForDiscoveryMarket(marketId: string): string {
  return `/template-photos/${MARKET_PHOTOS[marketId] ?? MARKET_PHOTOS.other}`;
}

export function photoForDiscoveryEnvironment(marketId: string, environmentId: string): string {
  const environment = getDiscoveryEnvironment(marketId, environmentId);
  const label = environment?.label.toLowerCase() ?? "";
  if (/meeting|boardroom|consultation|engineering|quality/.test(label)) return "/template-photos/photo-boardroom.jpg";
  if (/classroom|teaching|training|simulation/.test(label)) return "/template-photos/discovery-classroom-v2.jpg";
  if (/lecture|auditorium|town hall|briefing/.test(label)) return "/template-photos/photo-school-hall-projector.jpg";
  if (/campus|whole-home|multi-site/.test(label)) return "/template-photos/discovery-distributed-video-v2.jpg";
  if (marketId === "retail") return photoForDiscoveryMarket("retail");
  if (marketId === "transport") return photoForDiscoveryMarket("transport");
  if (/store|passenger|waiting|warehouse|information/.test(label)) return "/template-photos/discovery-distributed-video-v2.jpg";
  if (/arena|stadium|sports/.test(label)) return "/template-photos/photo-stadium.jpg";
  if (/studio|gallery|newsroom|performance/.test(label)) return "/template-photos/photo-led-wall.jpg";
  return photoForDiscoveryMarket(marketId);
}

export function changeDiscoveryApplication(answers: DiscoveryAnswers, opportunity: string): DiscoveryAnswers {
  return {
    market: answers.market ?? "",
    environment: answers.environment ?? "",
    "environment-detail": answers["environment-detail"] ?? "",
    opportunity,
  };
}
