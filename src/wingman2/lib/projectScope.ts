import type { TemplateBomRow } from "./roomTemplates";

export const PROJECT_SCOPE_SECTIONS = [
  { id: "inputs", title: "Input sources", description: "Computers, players, cameras and presentation connections." },
  { id: "distribution", title: "Distribution and switching", description: "Source selection, transmitters, receivers and AV networks." },
  { id: "displays", title: "Displays and projection", description: "Screens, projectors and the audience's viewing destinations." },
  { id: "audio", title: "Audio", description: "Microphones, loudspeakers, processing, amplification and acoustics." },
  { id: "control", title: "Control and operation", description: "User controls, room automation, software and system monitoring." },
  { id: "mounts", title: "Brackets and mounting", description: "Display, projector and equipment fixings, structure and access." },
  { id: "cabling", title: "Cabling and materials", description: "Cable runs, connectors, containment, terminations and consumables." },
  { id: "rack", title: "Rack, power and infrastructure", description: "Enclosures, furniture, power distribution, ventilation and resilience." },
  { id: "engineering", title: "Installation and engineering services", description: "Survey, design, first and second fix, rack build, programming and handover." },
  { id: "maintenance", title: "Optional maintenance and support", description: "Agree service visits, response times, remote access and support ownership." },
  { id: "additional", title: "Additional project scope", description: "Specialist equipment and services specific to this project." },
] as const;
export type ProjectScopeSectionId = typeof PROJECT_SCOPE_SECTIONS[number]["id"];
export function isProjectScopeSection(value: unknown): value is ProjectScopeSectionId {
  return PROJECT_SCOPE_SECTIONS.some(section => section.id === value);
}
export function projectScopeSection(row: TemplateBomRow): ProjectScopeSectionId {
  if (isProjectScopeSection(row.scopeSection)) return row.scopeSection;
  const sku = row.sku.toUpperCase();
  const text = `${row.role} ${row.description}`.toLowerCase();
  if (/^BY-OTHERS-DISPLAY-/.test(sku)) return "displays";
  if (/^BY-OTHERS-SOURCE-/.test(sku)) return "inputs";
  if (/maintenance|support contract|service visits/.test(text)) return "maintenance";
  if (/^BY-OTHERS-(LABOUR|COMMISSIONING|DESIGN|SERVICE-)/.test(sku) || /first fix|second fix|rack build|installation labour|commissioning|programming|as-built|project management|site survey/.test(text)) return "engineering";
  if (/^BY-OTHERS-(MOUNTS|UC-MOUNT)/.test(sku) || /bracket|structural fixing|mounting assembly/.test(text)) return "mounts";
  if (/^BY-OTHERS-(SIGNAL-CABLING|USB-PATH)/.test(sku) || /ccts|patch cables|cable containment|cabling and consumables/.test(text)) return "cabling";
  if (/^BY-OTHERS-(POWER-RACK|UPS-RECOVERY|SPARES)/.test(sku) || /pdu|power distribution|equipment rack|ventilation|ups|recovery procedures/.test(text)) return "rack";
  if (/^BY-OTHERS-(ROOM-CONTROL|SCHEDULING|MONITORING|LIGHTING|UC-HOST)/.test(sku) || /^NHD-CTL/.test(sku) || /control system|operator touch|room automation|recording software|licence|content management/.test(text)) return "control";
  if (/^BY-OTHERS-AUDIO|^AMP-|^APOD-/.test(sku) || /speaker|microphone|audio|acoustic|assistive listening/.test(text)) return "audio";
  if (/^BY-OTHERS-(SOURCE-|UC-CAMERA|PRODUCTION-CAMERAS)/.test(sku) || /camera|source position|source device|workstation|player|laptop/.test(text) && !/transmitter|encoder|extension|switch|bridge/.test(text)) return "inputs";
  if (/^BY-OTHERS-DISPLAY-/.test(sku) || /projector and|projection screen/.test(text)) return "displays";
  if (/^NHD-|^MX-|^SW-|^RX|^EX-|^APO-|^CAM-/.test(sku) || /switch|routing|receiver|transmitter|encoder|decoder|av fabric|av network|av switch|camera bridge/.test(text)) return "distribution";
  return "additional";
}
export function groupProjectScope(rows: TemplateBomRow[]) {
  return PROJECT_SCOPE_SECTIONS.map(section => ({ ...section, rows: rows.filter(row => projectScopeSection(row) === section.id) }));
}
/**
 * The sections a rep works through in the room schedule: every authored
 * section, plus "additional" once it holds a row of its own. The schedule tabs
 * and the section on screen read this one list, so a tab cannot name a section
 * the panel will not show.
 */
export function projectScopeScheduleSections(rows: TemplateBomRow[]) {
  return groupProjectScope(rows).filter(group => group.id !== "additional" || group.rows.length > 0);
}
export function orderedProjectScopeRows(rows: TemplateBomRow[]) {
  return groupProjectScope(rows).flatMap(section => section.rows);
}

const services = [
  ["first-fix", "First fix engineering", "Containment and cable installation before finishes; coordinate access, segregation, fire stopping and cable test records. Agree engineer numbers, days and out-of-hours work."],
  ["second-fix", "Second fix engineering", "Install and terminate devices, displays and connections after finishes. Include mounting, labels, electrical coordination and installation checks; agree engineers and days."],
  ["rack-build", "Rack build and bench testing", "Assemble the approved rack layout, power and patching; label connections, load configurations and bench-test before delivery. Rack hardware and site installation are separate scope."],
  ["survey", "Site survey and engineering coordination", "Measure rooms, routes, structure, mains, acoustics and access. Confirm supply boundaries and coordinate builder/electrical works before design freeze."],
  ["drawings", "System design, drawings and as-built records", "Prepare schematics, cable schedule, rack elevations, equipment positions and responsibility matrix; update approved drawings and configuration records at handover."],
  ["programming", "Control programming and configuration", "Configure routing, DSP, endpoints, user controls and applicable networks; agree interface pages and operating sequences. Software licences and specialist platform work are separate where required."],
  ["commissioning", "Commissioning and acceptance testing", "Exercise all source/output paths, supported signal formats, audio, USB, control and recovery. Verify room performance against agreed criteria and issue signed test records."],
  ["training", "Operator training and handover", "Train the nominated users and support team; provide operating guides, configuration backups and agreed ownership of accounts and service records."],
  ["management", "Project management and delivery coordination", "Coordinate approvals, programme, suppliers, site attendance and change control; agree attendance, travel, milestones and handover responsibilities."],
] as const;

/** Replace only the original combined boilerplate allowances; retain authored/custom service lines. */
export function completeProjectServiceRows(rows: TemplateBomRow[], prefix: string): TemplateBomRow[] {
  const combined = new Set(["BY-OTHERS-LABOUR", "BY-OTHERS-COMMISSIONING", "BY-OTHERS-DESIGN"]);
  const boilerplateDescriptions: Record<string, string> = {
    "BY-OTHERS-LABOUR": "Installation labour, access equipment and making good",
    "BY-OTHERS-COMMISSIONING": "Programming, commissioning, acceptance testing and training",
    "BY-OTHERS-DESIGN": "Survey, project management, CAD/Visio and as-built documentation",
  };
  const boilerplateNotes: Record<string, string> = {
    "BY-OTHERS-LABOUR": "Measured labour allowance: survey cable routes and access restrictions, quantify engineering days, lifting, furniture/ceiling works and out-of-hours attendance.",
    "BY-OTHERS-COMMISSIONING": "System allowance: exercise every source/output route, audio/USB path, start/stop sequence and recovery mode; record results and train the operators.",
    "BY-OTHERS-DESIGN": "System allowance: issue room elevations, source/output schedule, schematics, rack/power drawings, cable schedule and responsibility matrix before installation.",
  };
  const original = rows.filter(row => combined.has(row.sku));
  const standard = original.length === 3 && original.every(row => row.qty === 1 && row.status === "validate" && !row.model && !row.manufacturer && !row.sourceUrl && row.description === boilerplateDescriptions[row.sku] && row.notes === boilerplateNotes[row.sku]);
  const result = rows.filter(row => !standard || !combined.has(row.sku)).map(row => ({ ...row }));
  const add = (key: string, description: string, notes: string, optional = false) => {
    const sku = `BY-OTHERS-SERVICE-${key.toUpperCase()}`;
    if (result.some(row => row.sku === sku)) return;
    result.push({ id: `${prefix}-service-${key}`, sku, description, role: optional ? "Maintenance service allowance" : "Engineering service allowance", qty: 1,
      type: optional ? "Optional" : "Validate", status: optional ? "excluded" : "validate", owner: "integrator",
      scopeSection: optional ? "maintenance" : "engineering", unit: "allowance",
      evidence: "Delivery scope allowance; agree provider, effort, rates and acceptance criteria before quotation.",
      notes: `${notes} Quantity 1 means one scoped allowance, not one engineer or one day. Replace with agreed effort and unit before pricing.` });
  };
  if (standard || !original.length) for (const [key, description, notes] of services) add(key, description, notes);
  add("maintenance", "Optional maintenance and support agreement", "Agree term, planned visits, response hours, remote/on-site support, backups, exclusions, spares and renewal pricing. No service-level commitment is assumed.", true);
  return result;
}
