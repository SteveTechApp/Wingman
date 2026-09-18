import { roomTemplates, type RoomTemplate, type TemplateBomRow } from "./roomTemplates";
import { normalizeTemplateMarket } from "./templateMarkets";

export type TemplateArchitectureFamily = "Local UC" | "HDBaseT" | "Matrix" | "AV over IP" | "Video wall" | "Hybrid";
export type TemplateCapability = "video" | "audio" | "microphones" | "uc" | "control" | "network" | "recording" | "signage" | "resilience" | "accessibility";
export type TemplateReviewStatus = "reviewed" | "needs-review";
export type TemplateApplicationProfile = { templateId: string; canonicalMarket: string; architectureFamily: TemplateArchitectureFamily; imageKey: string; userJourney: string; sizingBasis: string[]; capabilities: TemplateCapability[]; environmentConstraints: string[]; inclusions: string[]; exclusions: string[]; reviewStatus: TemplateReviewStatus; reviewNotes: string[] };
export type TemplateDesignFacts = { requiredSkuCount: number; sourceEndpointCount: number; outputEndpointCount: number; architectureFamily: TemplateArchitectureFamily };

const images = {
  boardroom: "photo-boardroom.jpg", huddle: "photo-huddle-room.jpg", multicamera: "photo-multicamera-meeting.jpg",
  classroom: "photo-classroom.jpg", flexible: "photo-flexible-learning.jpg", hybrid: "photo-hybrid-teaching.jpg",
  hall: "photo-school-hall-projector.jpg", signage: "photo-signage.jpg", wall: "photo-led-wall.jpg",
  sportsbar: "photo-sportsbar.jpg", pub: "photo-pub-matrix.jpg", casino: "photo-casino.jpg", bingo: "photo-bingo.jpg",
  stadium: "photo-stadium.jpg", control: "photo-control-room.jpg", security: "photo-security-command.jpg", situation: "photo-situation-room.jpg",
} as const;

/** Reviewed, exact application-image assignment. Published templates never use keyword matching. */
export const TEMPLATE_IMAGE_KEYS: Readonly<Record<string, string>> = Object.freeze({
  "corporate-huddle-apollo": images.huddle,
  "corporate-boardroom-networkhd500": images.boardroom,
  "education-classroom-hdbaset": images.classroom,
  "education-lecture-capture-networkhd": images.flexible,
  "retail-signage-networkhd100": images.signage,
  "retail-lcd-wall-processor": images.wall,
  "hospitality-sports-bar-networkhd": images.sportsbar,
  "hospitality-ballroom-hybrid": images.boardroom,
  "healthcare-simulation-lab": images.situation,
  "government-control-room-networkhd600": images.control,
  "venue-worship-overflow-networkhd500": images.hall,
  "transport-operations-signage": images.signage,
  "residential-media-matrix": images.boardroom,
  "corporate-multi-camera-meeting-bridge": images.multicamera,
  "education-school-hall-hdbaset-projector": images.hall,
  "education-flexible-learning-networkhd500": images.flexible,
  "education-hybrid-collaboration-nhd500-dante": images.hybrid,
  "education-active-learning-nhd600-local-inputs": images.flexible,
  "hospitality-large-sportsbar-nhd500": images.sportsbar,
  "hospitality-local-pub-8x8-matrix": images.pub,
  "hospitality-large-casino-nhd500": images.casino,
  "hospitality-bingo-club-nhd100-led-wall": images.bingo,
  "hospitality-stadium-concourse-vip-nhd500": images.stadium,
  "government-security-command-nhd100-bridge": images.security,
  "government-situation-control-room-nhd600": images.situation,
  "corporate-teams-room-medium-apollo": images.boardroom,
  "corporate-experience-centre-networkhd600": images.wall,
  "corporate-agile-collaboration-zone-networkhd500": images.boardroom,
  "education-primary-classroom-interactive-panel": images.classroom,
  "education-university-lecture-theatre-networkhd500": images.flexible,
  "education-stem-science-lab-networkhd100": images.hybrid,
  "control-room-security-operations-networkhd600": images.security,
  "control-room-network-operations-centre-networkhd600": images.control,
  "control-room-traffic-management-networkhd500": images.control,
  "government-council-chamber-hybrid-streaming": images.boardroom,
  "healthcare-mdt-imaging-review-networkhd500": images.situation,
  "healthcare-clinic-waiting-patient-calling-networkhd100": images.signage,
  "leisure-gym-fitness-club-networkhd100": images.sportsbar,
  "hospitality-private-cinema-screening-room-matrix": images.boardroom,
  "transport-airport-lounge-fids-networkhd500": images.signage,
  "broadcast-podcast-content-studio-ndi-networkhd500": images.wall,
  "retail-bank-branch-networkhd100": images.signage,
  "worship-large-auditorium-imag-networkhd600": images.hall,
  "corporate-reception-townhall-networkhd100": images.signage,
  "corporate-training-suite-matrix-uc": images.boardroom,
  "education-library-learning-commons-networkhd100": images.hybrid,
  "education-esports-media-lab-networkhd500": images.hybrid,
  "hospitality-hotel-meeting-room-apollo-hdbaset": images.boardroom,
  "hospitality-restaurant-bar-matrix": images.pub,
  "retail-qsr-menu-boards-networkhd100": images.signage,
  "retail-car-showroom-customer-experience-networkhd500": images.wall,
  "government-courtroom-hearing-room-matrix": images.boardroom,
  "government-emergency-briefing-room-networkhd500": images.situation,
  "healthcare-telemedicine-consult-room-apollo": images.huddle,
  "healthcare-theatre-observation-networkhd500": images.situation,
});

function imageFor(template: RoomTemplate): string {
  const imageKey = TEMPLATE_IMAGE_KEYS[template.id];
  if (!imageKey) throw new Error(`Published template "${template.id}" does not have a reviewed image assignment.`);
  return imageKey;
}

function architectureFor(template: RoomTemplate): TemplateArchitectureFamily {
  const text = `${template.name} ${template.architecture}`.toLowerCase();
  if (/video wall|led wall|lcd wall/.test(text)) return "Video wall";
  if (/av-over-ip|networkhd/.test(text)) return "AV over IP";
  if (/hybrid matrix|matrix/.test(text)) return "Matrix";
  if (/hdbaset/.test(text)) return "HDBaseT";
  if (/apollo|local uc|video bar/.test(text)) return "Local UC";
  return "Hybrid";
}

function capabilitiesFor(template: RoomTemplate): TemplateCapability[] {
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
  return template.bom.filter((row) => row.sku !== "BY-OTHERS" && !/^CUSTOM(?:-|$)/.test(row.sku));
}

function sizingBasisFor(template: RoomTemplate): string[] {
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
    userJourney: template.customerNarrative,
    sizingBasis: sizingBasisFor(template),
    capabilities: capabilitiesFor(template),
    environmentConstraints: [...template.validationItems],
    inclusions: governedRows(template).filter((row) => row.type === "Required").map((row) => `${row.qty} × ${row.sku}: ${row.role}`),
    exclusions: template.bom.filter((row) => row.sku === "BY-OTHERS").map((row) => row.description),
    reviewStatus: "reviewed",
    reviewNotes: [`Reviewed for ${template.scale}: ${template.application}`, `The authored ${architectureFamily} architecture and BOM quantities form the published baseline.`],
  };
}

/** Reviewed registry materialised from each template's authored application, architecture and BOM. */
export const TEMPLATE_APPLICATION_PROFILES: Readonly<Record<string, TemplateApplicationProfile>> = Object.freeze(Object.fromEntries(roomTemplates.map((template) => [template.id, buildPublishedProfile(template)])));

function customProfile(template: RoomTemplate): TemplateApplicationProfile {
  return { ...buildPublishedProfile(template, images.boardroom), canonicalMarket: normalizeTemplateMarket(template.vertical) || "Custom", reviewStatus: "needs-review", reviewNotes: ["Custom template requires technical review before publication."] };
}

export function getTemplateApplicationProfile(template: RoomTemplate): TemplateApplicationProfile {
  if (template.applicationProfile) return template.applicationProfile;
  const profile = TEMPLATE_APPLICATION_PROFILES[template.id];
  if (profile) return profile;
  if (template.customTemplate) return customProfile(template);
  throw new Error(`Published template "${template.id}" does not have a governed application profile.`);
}

function quantityForRoles(rows: TemplateBomRow[], pattern: RegExp) {
  return rows.filter((row) => pattern.test(`${row.role} ${row.description}`)).reduce((sum, row) => sum + row.qty, 0);
}

export function templateDesignFacts(template: RoomTemplate): TemplateDesignFacts {
  const rows = governedRows(template);
  return { requiredSkuCount: rows.filter((row) => row.type === "Required").length, sourceEndpointCount: quantityForRoles(rows, /source|encoder|transmitter|input/i), outputEndpointCount: quantityForRoles(rows, /display|decoder|receiver|output|projector/i), architectureFamily: getTemplateApplicationProfile(template).architectureFamily };
}
