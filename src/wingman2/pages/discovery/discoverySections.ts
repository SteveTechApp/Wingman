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
  { id: "site", title: "Site & construction", description: "Room dimensions, surfaces and infrastructure" },
  { id: "sources", title: "Sources", description: "Devices, user connections and source positions" },
  { id: "outputs", title: "Displays & outputs", description: "Screens, projectors, walls and viewing needs" },
  { id: "routing", title: "Video routing", description: "Distribution, switching and picture requirements" },
  { id: "audio", title: "Audio", description: "Microphones, speakers, zones and processing" },
  { id: "conferencing", title: "Conferencing & USB", description: "Meeting host, cameras, capture and USB paths" },
  { id: "control", title: "Control", description: "How people operate the room" },
  { id: "locations", title: "Locations & cabling", description: "Device positions, routes and cable lengths" },
  { id: "equipment", title: "Equipment schedule", description: "Selected products, placeholders and quantities" },
  { id: "review", title: "Review & validation", description: "Assumptions and items to confirm" },
] as const;

export type DiscoverySectionId = (typeof DISCOVERY_SECTIONS)[number]["id"];

export function discoverySectionFor(question: DiscoveryQuestion): DiscoverySectionId {
  const id = question.id;
  if (id === "opportunity" || id === "scale") return "brief";
  if (/^source|wireless-presentation/.test(id)) return "sources";
  if (/^(display|signal-standard|video-wall|multiview)/.test(id)) return "outputs";
  if (["network-path", "avoip-profile"].includes(id)) return "routing";
  if (/^(audio|room-acoustics|uc-microphone|uc-audio)/.test(id)) return "audio";
  if (["uc-purpose", "uc-platform", "mtr-av-integration", "uc-camera", "uc-camera-count", "uc-multi-camera-path", "uc-camera-routing", "usb"].includes(id)) return "conferencing";
  if (id === "control") return "control";
  if (id === "locations-connections") return "locations";
  return "site";
}

export function discoverySectionTitle(id: DiscoverySectionId): string {
  return DISCOVERY_SECTIONS.find((section) => section.id === id)?.title ?? "Site & construction";
}
