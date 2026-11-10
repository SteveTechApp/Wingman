import type { TemplateMarket } from "./templateMarkets";

/** A market-specific room application used to start the room brief. */
export type RoomBriefApplication = {
  id: string;
  label: string;
  market: TemplateMarket;
  /** Broad room function consumed by the room decision ladder. */
  purpose: RoomBriefPurposeId;
};

export type RoomBriefPurposeId =
  | "present"
  | "meet"
  | "present-and-meet"
  | "teach"
  | "show-many"
  | "address-crowd"
  | "signage"
  | "campus";

type ApplicationRow = readonly [id: string, label: string, purpose: RoomBriefPurposeId];

const APPLICATIONS: Partial<Record<TemplateMarket, readonly ApplicationRow[]>> = {
  Corporate: [
    ["corporate-huddle-apollo", "Huddle room with a visiting laptop", "present-and-meet"],
    ["corporate-boardroom-networkhd500", "Executive boardroom", "present-and-meet"],
    ["corporate-multi-camera-meeting-bridge", "Multi-camera meeting room", "meet"],
    ["corporate-teams-room-medium-apollo", "Medium video meeting room", "meet"],
    ["corporate-experience-centre-networkhd600", "Experience centre demonstration", "present"],
    ["corporate-agile-collaboration-zone-networkhd500", "Office collaboration pods", "present"],
    ["corporate-reception-townhall-networkhd100", "Reception or town hall", "address-crowd"],
    ["corporate-training-suite-matrix-uc", "Training suite with conferencing and capture", "teach"],
  ],
  Education: [
    ["education-classroom-hdbaset", "Teaching classroom", "teach"],
    ["education-lecture-capture-networkhd", "Lecture theatre with capture", "teach"],
    ["education-school-hall-hdbaset-projector", "School assembly hall", "address-crowd"],
    ["education-flexible-learning-networkhd500", "Flexible learning space", "teach"],
    ["education-hybrid-collaboration-nhd500-dante", "Hybrid seminar room", "present-and-meet"],
    ["education-active-learning-nhd600-local-inputs", "Active learning lab", "teach"],
    ["education-primary-classroom-interactive-panel", "Primary classroom", "teach"],
    ["education-university-lecture-theatre-networkhd500", "University lecture theatre", "teach"],
    ["education-stem-science-lab-networkhd100", "STEM laboratory", "teach"],
    ["education-library-learning-commons-networkhd100", "Library learning commons", "signage"],
    ["education-esports-media-lab-networkhd500", "Esports teaching lab", "teach"],
  ],
  Government: [
    ["government-control-room-networkhd600", "Government control suite", "show-many"],
    ["government-security-command-nhd100-bridge", "Security command room", "show-many"],
    ["government-situation-control-room-nhd600", "Situation room", "show-many"],
    ["government-council-chamber-hybrid-streaming", "Council chamber with public record", "present-and-meet"],
    ["government-courtroom-hearing-room-matrix", "Courtroom evidence presentation", "show-many"],
    ["government-emergency-briefing-room-networkhd500", "Incident briefing room", "show-many"],
  ],
  "Emergency Services": [
    ["emergency-station-briefing-hdbaset", "Station briefing room", "present-and-meet"],
    ["emergency-tactical-coordination-hybrid", "Tactical coordination room", "show-many"],
    ["emergency-dispatch-control-networkhd600", "Dispatch review room", "show-many"],
    ["emergency-shared-status-networkhd100", "Shared status displays", "signage"],
  ],
  "Energy / Oil & Gas": [
    ["energy-operations-dashboard-matrix", "Operations dashboards", "show-many"],
    ["energy-shift-briefing-hdbaset", "Shift briefing", "present"],
    ["energy-training-review-matrix", "Training and simulation review", "teach"],
    ["energy-visitor-information-matrix", "Visitor and safety information", "signage"],
  ],
  "Manufacturing / Logistics": [
    ["manufacturing-production-status-matrix", "Production floor status", "signage"],
    ["manufacturing-shift-training-hdbaset", "Factory shift and safety training", "teach"],
    ["manufacturing-quality-review-matrix", "Quality inspection and drawing review", "show-many"],
    ["logistics-dispatch-information-matrix", "Warehouse dispatch information", "signage"],
  ],
  Healthcare: [
    ["healthcare-simulation-lab", "Clinical simulation and debrief", "teach"],
    ["healthcare-mdt-imaging-review-networkhd500", "Clinical team review", "meet"],
    ["healthcare-clinic-waiting-patient-calling-networkhd100", "Waiting room information and patient calling", "signage"],
    ["healthcare-telemedicine-consult-room-apollo", "Telemedicine consultation", "meet"],
    ["healthcare-theatre-observation-networkhd500", "Procedure observation and training", "show-many"],
  ],
  Hospitality: [
    ["hospitality-sports-bar-networkhd", "Sports bar screens", "show-many"],
    ["hospitality-ballroom-hybrid", "Divisible ballroom", "address-crowd"],
    ["hospitality-large-sportsbar-nhd500", "Large sports bar screens", "show-many"],
    ["hospitality-local-pub-8x8-matrix", "Pub screens by zone", "show-many"],
    ["hospitality-large-casino-nhd500", "Casino floor screens", "show-many"],
    ["hospitality-bingo-club-nhd100-led-wall", "Bingo hall programme and displays", "address-crowd"],
    ["hospitality-stadium-concourse-vip-nhd500", "Stadium, concourse and VIP displays", "address-crowd"],
    ["hospitality-private-cinema-screening-room-matrix", "Private screening room", "present"],
    ["hospitality-hotel-meeting-room-apollo-hdbaset", "Hotel meeting room", "present-and-meet"],
    ["hospitality-restaurant-bar-matrix", "Restaurant and bar screens", "signage"],
  ],
  Retail: [
    ["retail-signage-networkhd100", "In-store information across zones", "signage"],
    ["retail-lcd-wall-processor", "Retail feature wall", "signage"],
    ["retail-bank-branch-networkhd100", "Bank rates and queue information", "signage"],
    ["retail-qsr-menu-boards-networkhd100", "Restaurant menu boards", "signage"],
    ["retail-car-showroom-customer-experience-networkhd500", "Car showroom demonstrations", "show-many"],
  ],
  "Sports & Leisure": [
    ["leisure-gym-fitness-club-networkhd100", "Fitness club programme zones", "show-many"],
    ["sports-coaching-analysis-matrix", "Team coaching and performance review", "show-many"],
    ["sports-esports-review-matrix", "Esports spectator and replay screens", "show-many"],
  ],
  "House of Worship": [
    ["venue-worship-overflow-networkhd500", "Worship venue with overflow", "address-crowd"],
    ["worship-large-auditorium-imag-networkhd600", "Worship auditorium and production", "address-crowd"],
    ["worship-small-sanctuary-hdbaset", "Small worship space", "address-crowd"],
  ],
  Transportation: [
    ["transport-operations-signage", "Transport operations status", "show-many"],
    ["transport-airport-lounge-fids-networkhd500", "Airport gate and boarding information", "signage"],
    ["transport-passenger-information-matrix", "Station passenger information", "signage"],
  ],
  "Broadcast / Media": [
    ["broadcast-podcast-content-studio-ndi-networkhd500", "Podcast production studio", "show-many"],
    ["broadcast-interview-production-studio", "Interview and recording studio", "show-many"],
    ["broadcast-edit-review-matrix", "Edit review and client playback", "show-many"],
  ],
  Residential: [
    ["residential-media-matrix", "Home media room", "present"],
    ["residential-multiroom-entertainment-matrix", "Entertainment across several rooms", "campus"],
    ["residential-home-office-byod", "Home office video meeting", "meet"],
  ],
  "Control Rooms": [
    ["control-room-security-operations-networkhd600", "Security operations centre", "show-many"],
    ["control-room-network-operations-centre-networkhd600", "Utility network operations", "show-many"],
    ["control-room-traffic-management-networkhd500", "Traffic management displays", "show-many"],
  ],
};

export const ROOM_BRIEF_MARKET_APPLICATIONS: readonly RoomBriefApplication[] = Object.entries(APPLICATIONS)
  .flatMap(([market, rows]) => (rows ?? []).map(([id, label, purpose]) => ({ id, label, purpose, market })))
  .map(({ market, ...application }) => ({ ...application, market: market as TemplateMarket }));

export function roomBriefApplicationsForMarket(market: string): readonly RoomBriefApplication[] {
  return ROOM_BRIEF_MARKET_APPLICATIONS.filter((application) => application.market === market);
}

export function roomBriefApplicationById(id: string | undefined): RoomBriefApplication | undefined {
  return id ? ROOM_BRIEF_MARKET_APPLICATIONS.find((application) => application.id === id) : undefined;
}
