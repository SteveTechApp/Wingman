import type { DiscoveryQuestion } from "./discoveryTypes";

/**
 * The room, in the order a rep captures it.
 *
 * One list, because two readings of the same room cannot group its questions
 * differently: the expert view draws these as its section rail, and the guided
 * walk prints the same section above each question so a rep always knows which
 * part of the room they are in and how much of it is left.
 *
 * A question is filed by what it is about rather than by its position, so
 * inserting a question files it once — in `discoverySectionFor` — and neither
 * surface needs a second table.
 */
export const DISCOVERY_SECTIONS = [
  { id: "brief", title: "Room brief", description: "Purpose, people and scale" },
  { id: "site", title: "Environment", description: "Access, installation, room construction, power and first-fix cabling" },
  { id: "outputs", title: "Displays & cameras", description: "Screens, projectors, camera views, positions and use" },
  { id: "audio", title: "Audio", description: "Microphones, speakers, zones, signal paths and processing" },
  { id: "routing", title: "Switching & signal distribution", description: "Source and output positions, routes, distances, video formats, USB and network transport" },
  { id: "control", title: "Room & AV control", description: "Room operation, AV control, lighting interfaces and user experience" },
  { id: "lighting", title: "Lighting", description: "Daylight, lighting control, screen visibility and AV integration" },
  { id: "commissioning", title: "Commissioning & handover", description: "Testing, acceptance, training, documentation and ownership" },
  { id: "equipment", title: "Equipment schedule", description: "Selected products, placeholders and quantities" },
  { id: "review", title: "Review & validation", description: "Assumptions and items to confirm" },
] as const;

export type DiscoverySectionId = (typeof DISCOVERY_SECTIONS)[number]["id"];

export function discoverySectionFor(question: Pick<DiscoveryQuestion, "id">): DiscoverySectionId {
  const id = question.id;
  if (id === "opportunity" || id === "scale") return "brief";
  if (/^source|wireless-presentation/.test(id)) return "routing";
  if (/^(display|video-wall|uc-camera|uc-purpose|uc-platform|uc-camera-count|uc-multi-camera-path|uc-camera-routing|mtr-av-integration)/.test(id)) return "outputs";
  if (["network-path", "avoip-profile", "signal-standard", "usb", "locations-connections", "source-device-workflows", "multiview-destination", "multiview-operation"].includes(id)) return "routing";
  if (/^(audio|room-acoustics|uc-microphone|uc-audio)/.test(id)) return "audio";
  if (id === "commissioning") return "commissioning";
  if (id === "control") return "control";
  if (id === "site-lighting-provision" || id === "site-lighting-acoustics") return "lighting";
  return "site";
}

export function discoverySectionTitle(id: DiscoverySectionId): string {
  return DISCOVERY_SECTIONS.find((section) => section.id === id)?.title ?? "Environment";
}
