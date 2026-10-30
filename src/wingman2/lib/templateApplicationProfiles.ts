import { roomTemplates, type RoomTemplate, type TemplateBomRow } from "./roomTemplates";
import { normalizeTemplateMarket } from "./templateMarkets";

export type TemplateArchitectureFamily = "Local UC" | "HDBaseT" | "Matrix" | "AV over IP" | "Video wall" | "Hybrid";
export type TemplateCapability = "video" | "audio" | "microphones" | "uc" | "control" | "network" | "recording" | "signage" | "resilience" | "accessibility";
export type TemplateReviewStatus = "reviewed" | "needs-review";
// The site validation items a profile could restate are rendered from the room
// template itself, and a review note would only repeat `reviewStatus` in prose,
// so neither is carried here: the profile holds what the preview draws.
export type TemplateApplicationProfile = { templateId: string; canonicalMarket: string; architectureFamily: TemplateArchitectureFamily; imageKey: string; userJourney: string; sizingBasis: string[]; capabilities: TemplateCapability[]; inclusions: string[]; exclusions: string[]; reviewStatus: TemplateReviewStatus };
export type TemplateDesignFacts = { requiredSkuCount: number; sourceEndpointCount: number; outputEndpointCount: number; architectureFamily: TemplateArchitectureFamily };

/**
 * One key per photograph, and the key names what its file shows rather than what
 * the template wanted it to show. The table states "one picture serves several
 * rooms" by sharing a key: `audience` dresses the school hall and the overflow
 * congregation instead of a second key hiding that they are one file.
 *
 * Fourteen photographs exist, one file each. Three were once stored twice under a
 * second name; the copies went once the surfaces that named them moved to the
 * surviving file, so a key now names a photograph and nothing else does.
 * `trackedAssetDuplicates.test.ts` asks every tracked data and document file for
 * shared bytes and holds no recorded pairs, so a copy anywhere — not only another
 * photograph — is a red run rather than a quiet addition.
 *
 * What each key depicts, read off the photographs rather than their names:
 *   - `boardroom` is a committee table with delegate microphones and name tents.
 *     It is also what the two production studios borrow: a table where people speak
 *     into microphones is nearer a studio than anything else here, and it claims no
 *     venue the way a lectern and a crest would.
 *   - `huddle` is an office team over a charted whiteboard. No room is in frame,
 *     which is what lets a home office and a review corner borrow it.
 *   - `hearing` is a presenter at a lectern with a seated reader and a crest. The
 *     file is named `multicamera-meeting`, but a hearing room is what it is, so it
 *     is assigned only to the courtroom and the emergency briefing.
 *   - `classroom` and `lesson` are a primary classroom, empty and in use.
 *   - `audience` is a crowd watching a large screen. It fits a school hall, an
 *     auditorium, an overflow congregation, a screening room and a lecture theatre,
 *     because each is seats facing a display. It is also the stand-in for the
 *     fitness floor, for an esports club's spectator screens and for a home media
 *     room, because each of those is people watching a display even where the room
 *     is not one this repository has a photograph of. That is the whole of those
 *     rooms' art gap — the bar the gym used to show is gone.
 *   - `signage` is a lit wordmark on a patterned wall.
 *   - `ledwall` is a visitor photographing a wall-sized light display — the surface
 *     and the visit, with no room and nobody working in it — which is what a feature
 *     wall, a showroom and an experience centre borrow. A studio and a media room do
 *     not: the surface is the only thing that matches, and the room and the activity
 *     are both somebody else's.
 *   - `bar`, `casino`, `bingo` and `stadium` are the venue itself.
 *   - `ops` is a wall of camera feeds over an operations desk.
 *   - `console` is an industrial console under a bank of screens. It stands in for
 *     the rooms whose work happens at a desk in front of screens and which have no
 *     photograph of their own: imaging review, a procedure observation gallery, a
 *     coaching analysis room and an esports lab.
 *
 * The rule the table keeps is that a card never shows a room of another kind: no
 * template points at the bar unless it is a bar, at the crowd unless it is an
 * audience, at a committee table unless it is a meeting room, or at an operations
 * desk unless operators sit at it. Where the repo has no photograph of the room —
 * the ballroom, a science lab, a lecture theatre, a learning commons, an esports
 * lab, a clinical review room, a production studio, a home media room — the nearest
 * same-kind picture stands in and the
 * paragraph above names it, because a gap written down is fixable and a caption
 * that quietly lies is not. New art per key is still the fix, and nothing here can
 * produce a photograph.
 */
const images = {
  boardroom: "photo-boardroom.jpg", huddle: "photo-huddle-room.jpg", hearing: "photo-multicamera-meeting.jpg",
  classroom: "photo-classroom.jpg", lesson: "photo-flexible-learning.jpg", audience: "photo-hybrid-teaching.jpg",
  signage: "photo-signage.jpg", ledwall: "photo-led-wall.jpg", bar: "photo-pub-matrix.jpg",
  casino: "photo-casino.jpg", bingo: "photo-bingo.jpg", stadium: "photo-stadium.jpg",
  ops: "photo-control-room.jpg", console: "photo-situation-room.jpg",
} as const;

/** Reviewed, exact application-image assignment. Published templates never use keyword matching. */
export const TEMPLATE_IMAGE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  "corporate-huddle-apollo": images.huddle,
  "corporate-boardroom-networkhd500": images.boardroom,
  "education-classroom-hdbaset": images.classroom,
  "education-lecture-capture-networkhd": images.audience,
  "retail-signage-networkhd100": images.signage,
  "retail-lcd-wall-processor": images.ledwall,
  "hospitality-sports-bar-networkhd": images.bar,
  "hospitality-ballroom-hybrid": images.audience,
  "healthcare-simulation-lab": images.lesson,
  "government-control-room-networkhd600": images.ops,
  "venue-worship-overflow-networkhd500": images.audience,
  "transport-operations-signage": images.signage,
  "residential-media-matrix": images.audience,
  "corporate-multi-camera-meeting-bridge": images.boardroom,
  "education-school-hall-hdbaset-projector": images.audience,
  "education-flexible-learning-networkhd500": images.lesson,
  "education-hybrid-collaboration-nhd500-dante": images.lesson,
  "education-active-learning-nhd600-local-inputs": images.lesson,
  "hospitality-large-sportsbar-nhd500": images.bar,
  "hospitality-local-pub-8x8-matrix": images.bar,
  "hospitality-large-casino-nhd500": images.casino,
  "hospitality-bingo-club-nhd100-led-wall": images.bingo,
  "hospitality-stadium-concourse-vip-nhd500": images.stadium,
  "government-security-command-nhd100-bridge": images.ops,
  "government-situation-control-room-nhd600": images.console,
  "corporate-teams-room-medium-apollo": images.boardroom,
  "corporate-experience-centre-networkhd600": images.ledwall,
  "corporate-agile-collaboration-zone-networkhd500": images.huddle,
  "education-primary-classroom-interactive-panel": images.classroom,
  "education-university-lecture-theatre-networkhd500": images.audience,
  "education-stem-science-lab-networkhd100": images.lesson,
  "control-room-security-operations-networkhd600": images.ops,
  "control-room-network-operations-centre-networkhd600": images.ops,
  "control-room-traffic-management-networkhd500": images.ops,
  "government-council-chamber-hybrid-streaming": images.boardroom,
  "healthcare-mdt-imaging-review-networkhd500": images.console,
  "healthcare-clinic-waiting-patient-calling-networkhd100": images.signage,
  "leisure-gym-fitness-club-networkhd100": images.audience,
  "hospitality-private-cinema-screening-room-matrix": images.audience,
  "transport-airport-lounge-fids-networkhd500": images.signage,
  "broadcast-podcast-content-studio-ndi-networkhd500": images.boardroom,
  "retail-bank-branch-networkhd100": images.signage,
  "worship-large-auditorium-imag-networkhd600": images.audience,
  "corporate-reception-townhall-networkhd100": images.signage,
  "corporate-training-suite-matrix-uc": images.lesson,
  "education-library-learning-commons-networkhd100": images.lesson,
  "education-esports-media-lab-networkhd500": images.console,
  "hospitality-hotel-meeting-room-apollo-hdbaset": images.boardroom,
  "hospitality-restaurant-bar-matrix": images.bar,
  "retail-qsr-menu-boards-networkhd100": images.signage,
  "retail-car-showroom-customer-experience-networkhd500": images.ledwall,
  "government-courtroom-hearing-room-matrix": images.hearing,
  "government-emergency-briefing-room-networkhd500": images.hearing,
  "healthcare-telemedicine-consult-room-apollo": images.huddle,
  "healthcare-theatre-observation-networkhd500": images.console,
  "emergency-station-briefing-hdbaset": "emergency-station-briefing-v1.png",
  "emergency-tactical-coordination-hybrid": "government-briefing-room-v1.png",
  "emergency-dispatch-control-networkhd600": "security-operations-cctv-v1.png",
  "emergency-shared-status-networkhd100": "emergency-shared-status-v1.png",
  "energy-operations-dashboard-matrix": "discovery-energy-market-v1.png",
  "energy-shift-briefing-hdbaset": "emergency-station-briefing-v1.png",
  "energy-training-review-matrix": images.classroom,
  "energy-visitor-information-matrix": images.signage,
  "manufacturing-production-status-matrix": "discovery-manufacturing-market-v1.png",
  "manufacturing-shift-training-hdbaset": images.classroom,
  "manufacturing-quality-review-matrix": images.boardroom,
  "logistics-dispatch-information-matrix": "discovery-manufacturing-market-v1.png",
  "sports-coaching-analysis-matrix": images.console,
  "sports-esports-review-matrix": images.audience,
  "worship-small-sanctuary-hdbaset": images.audience,
  "transport-passenger-information-matrix": "discovery-transport-market-v1.png",
  "broadcast-interview-production-studio": images.boardroom,
  "broadcast-edit-review-matrix": images.boardroom,
  "residential-multiroom-entertainment-matrix": images.audience,
  "residential-home-office-byod": images.huddle,
});

function imageFor(template: RoomTemplate): string {
  const imageKey = TEMPLATE_IMAGE_KEYS[template.id];
  if (!imageKey) throw new Error(`Published template "${template.id}" does not have a reviewed image assignment.`);
  return imageKey;
}

function architectureFor(template: RoomTemplate): TemplateArchitectureFamily {
  if (template.concept) return template.concept.architectureFamily;
  const text = `${template.name} ${template.architecture}`.toLowerCase();
  if (/video wall|led wall|lcd wall/.test(text)) return "Video wall";
  if (/hybrid matrix/.test(text)) return "Hybrid";
  if (/av-over-ip|networkhd/.test(text)) return "AV over IP";
  if (/hybrid matrix|matrix/.test(text)) return "Matrix";
  if (/hdbaset/.test(text)) return "HDBaseT";
  if (/apollo|local uc|video bar/.test(text)) return "Local UC";
  return "Hybrid";
}

function capabilitiesFor(template: RoomTemplate): TemplateCapability[] {
  if (template.concept) return template.concept.capabilities;
  const text = `${template.application} ${template.architecture} ${template.bom.map((row) => `${row.role} ${row.description}`).join(" ")}`.toLowerCase();
  const values = new Set<TemplateCapability>(["video"]);
  if (/audio|speaker|amplifier|dsp|dante|sound/.test(text)) values.add("audio");
  if (/microphone|camera|uc |conferen|teams|zoom|remote attendance|hybrid meeting/.test(text)) values.add("microphones");
  if (/uc |conferen|teams|zoom|byod|collaboration|telemedicine/.test(text)) values.add("uc");
  if (/control|controller|matrix|preset|touch/.test(text)) values.add("control");
  if (/networkhd|av-over-ip|managed network|vlan|network switch/.test(text)) values.add("network");
  if (/record|capture|stream|broadcast|transcription/.test(text)) values.add("recording");
  if (/signage|menu|fids|wayfinding|patient calling|rate board|queue/.test(text)) values.add("signage");
  if (/control room|command|operations centre|incident|emergency|failover|redundan/.test(text)) values.add("resilience");
  if (/assistive|accessibility|hearing loop|caption/.test(text)) values.add("accessibility");
  return [...values];
}

function governedRows(template: RoomTemplate) {
  return template.bom.filter((row) => !row.sku.startsWith("BY-OTHERS") && !/^CUSTOM(?:-|$)/.test(row.sku));
}

function sizingBasisFor(template: RoomTemplate): string[] {
  if (template.concept) return [template.concept.environment, `Occupancy: ${template.concept.occupancy}.`, `${template.concept.sourceCount} scheduled source positions; ${template.concept.outputCount} routed physical outputs.`, template.concept.rationale];
  const rows = governedRows(template);
  const relevant = rows.filter((row) => /core|controller|matrix|switcher|routing|processor|video bar|source|encoder|transmitter|input|display|decoder|receiver|output|camera/i.test(`${row.role} ${row.description}`));
  const concrete = relevant.filter((row, index) => relevant.findIndex((candidate) => candidate.id === row.id) === index).slice(0, 8);
  return [`Room basis: ${template.scale}.`, ...(concrete.length ? concrete.map((row) => `${row.qty} × ${row.description} (${row.role}).`) : [`${rows.reduce((sum, row) => sum + row.qty, 0)} governed units across ${rows.length} selected SKU roles.`])];
}

function buildPublishedProfile(template: RoomTemplate, imageKey = imageFor(template)): TemplateApplicationProfile {
  const architectureFamily = architectureFor(template);
  return {
    templateId: template.id,
    canonicalMarket: normalizeTemplateMarket(template.vertical),
    architectureFamily,
    imageKey,
    userJourney: template.story ? `${template.story.requirement} ${template.story.situation}` : template.customerNarrative,
    sizingBasis: sizingBasisFor(template),
    capabilities: capabilitiesFor(template),
    inclusions: governedRows(template).filter((row) => row.type === "Required").map((row) => `${row.qty} × ${row.sku}: ${row.role}`),
    exclusions: template.bom.filter((row) => row.sku.startsWith("BY-OTHERS")).map((row) => row.description),
    reviewStatus: "reviewed",
  };
}

// Build after route modules finish loading: production chunks can share catalogue dependencies.
let publishedProfiles: Readonly<Record<string, TemplateApplicationProfile>> | undefined;
export function getTemplateApplicationProfiles(): Readonly<Record<string, TemplateApplicationProfile>> {
  return publishedProfiles ??= Object.freeze(Object.fromEntries(roomTemplates.map((template) => [template.id, buildPublishedProfile(template)])));
}

function customProfile(template: RoomTemplate): TemplateApplicationProfile {
  return { ...buildPublishedProfile(template, images.boardroom), canonicalMarket: normalizeTemplateMarket(template.vertical) || "Custom", reviewStatus: "needs-review" };
}

export function getTemplateApplicationProfile(template: RoomTemplate): TemplateApplicationProfile {
  if (template.applicationProfile) return template.applicationProfile;
  const profile = getTemplateApplicationProfiles()[template.id];
  if (profile) return profile;
  if (template.customTemplate) return customProfile(template);
  throw new Error(`Published template "${template.id}" does not have a governed application profile.`);
}

function quantityForRoles(rows: TemplateBomRow[], pattern: RegExp) {
  return rows.filter((row) => pattern.test(`${row.role} ${row.description}`)).reduce((sum, row) => sum + row.qty, 0);
}

export function templateDesignFacts(template: RoomTemplate): TemplateDesignFacts {
  const rows = governedRows(template);
  if (template.concept) return { requiredSkuCount: rows.filter((row) => row.type === "Required").length, sourceEndpointCount: template.concept.sourceCount, outputEndpointCount: template.concept.outputCount, architectureFamily: template.concept.architectureFamily };
  return { requiredSkuCount: rows.filter((row) => row.type === "Required").length, sourceEndpointCount: quantityForRoles(rows, /source|encoder|transmitter|input/i), outputEndpointCount: quantityForRoles(rows, /display|decoder|receiver|output|projector/i), architectureFamily: getTemplateApplicationProfile(template).architectureFamily };
}
