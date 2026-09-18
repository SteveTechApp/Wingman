import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import type { TemplateCapability } from "./templateApplicationProfiles";

export function byOthersSku(label: string): string { return `BY-OTHERS-${label.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`; }
export function byOthersRow(prefix: string, suffix: string, description: string, role: string, notes: string): TemplateBomRow {
  return { id: `${prefix}-${suffix}`, sku: byOthersSku(`${prefix}-${suffix}`), description, role, qty: 1, type: "Validate", status: "validate", evidence: "Placeholder row for non-WyreStorm equipment required to complete the customer-ready system design.", notes };
}

type Scope = [string, string, string, string];
const COMMON: Scope[] = [
  ["rack-power-cabling", "Rack, furniture, power distribution and equipment mounting", "Rack, furniture and power by others", "Confirm rack/furniture layout, power, earthing, thermal design and service access."],
  ["ccts", "CCTS allowance: cables, connectors, termination, testing and sundries", "CCTS and consumables by others", "Complete the cable schedule, containment, labels, fire stopping, certification and consumables."],
  ["labour", "Installation labour, access equipment, coordination and making good", "Installation labour by others", "Enter engineering days, access, lifting equipment, supervision and making-good responsibility."],
  ["commissioning-training", "Configuration, programming, commissioning, testing, training and handover", "Commissioning and training by others", "Allow for configuration, system testing, customer training, acceptance records and handover."],
  ["design-project-management", "Project management, coordination, CAD/Visio drawings and as-built documentation", "Design and project delivery by others", "Allow for survey, coordination, schematics, cable schedules, change control and as-built issue."],
];
const SCOPES: Record<TemplateCapability, Scope[]> = {
  video: [["displays", "Display, projector, LED or video-wall output devices", "Visual outputs by others", "Select output technology, quantity, size, resolution, brightness, orientation and connection."], ["display-mounting", "Wall, ceiling, floor, furniture or recessed display mounting", "Output mounting by others", "Select mounting, structure, brackets, service access, ventilation and making good."]],
  audio: [["audio-io-dsp", "Audio input/output interfaces, DSP, AEC and room audio processing", "Audio I/O and processing by others", "Define audio I/O, DSP channels, echo cancellation, mixing, zoning and tuning."], ["speakers-amplification", "Loudspeakers, subwoofers, amplification and speaker cabling", "Audio reproduction by others", "Select coverage, zoning, amplifier power, mounting and acoustic treatment."]],
  microphones: [["microphones", "Ceiling, table, lectern, wireless or camera microphones", "Audio capture by others", "Select pickup coverage, quantity, placement, charging, mute behaviour and DSP inputs."]],
  uc: [["camera-uc-compute", "Room cameras, camera mounting, USB bridge and UC compute/licensing", "Video conferencing equipment by others", "Confirm camera coverage, room compute, licences, USB topology and display behaviour."]],
  control: [["control-user-interface", "Touch panel, keypad, control processor, programming or user interface", "Room control by others or validate WyreStorm control", "Confirm control ownership, operator workflows, interfaces and programming."]],
  network: [["network-infrastructure", "Managed network switch, VLAN, PoE, fibre, optics and network configuration", "Network infrastructure by others", "Confirm switch, VLAN/multicast plan, PoE budget, uplinks and commissioning."]],
  recording: [["recording-storage", "Recording, streaming, media storage and retention platform", "Recording platform by others", "Confirm feeds, storage, retention, permissions and streaming destinations."]],
  signage: [["signage-platform", "Signage players, content management, scheduling and monitoring", "Signage platform by others", "Confirm players, content workflow, schedules, monitoring and recovery."]],
  resilience: [["resilience", "Redundant power, failover paths, recovery procedures and operational spares", "Operational resilience by others", "Validate UPS runtime, redundant links and power, failover, recovery procedures and spares."]],
  accessibility: [["accessibility", "Assistive listening, captioning and accessible user interfaces", "Accessibility systems by others", "Confirm hearing assistance, captioning, controls, legibility and applicable standards."]],
};

export function designScopeRows(prefix: string, capabilities: readonly TemplateCapability[], extras: TemplateBomRow[] = []): TemplateBomRow[] {
  return [...new Set(capabilities)].flatMap((capability) => SCOPES[capability]).concat(COMMON).map(([suffix, description, role, notes]) => byOthersRow(prefix, suffix, description, role, notes)).concat(extras);
}

/** @deprecated Standard scope is added after the application's capabilities are known. */
export function completeDesignPlaceholders(_prefix: string, extras: TemplateBomRow[] = []): TemplateBomRow[] { return extras; }
const has = (value: string, terms: string[]) => terms.some((term) => value.includes(term));
function capabilities(template: RoomTemplate): TemplateCapability[] {
  if (template.applicationProfile?.capabilities.length) return template.applicationProfile.capabilities;
  const text = `${template.application} ${template.architecture} ${template.bom.map((r) => `${r.role} ${r.description}`).join(" ")}`.toLowerCase();
  const values = new Set<TemplateCapability>(["video"]);
  const rules: [TemplateCapability, RegExp][] = [["audio", /audio|speaker|amplifier|dsp|dante|sound/], ["microphones", /microphone|camera|uc |conferen|teams|zoom|remote attendance|hybrid meeting/], ["uc", /uc |conferen|teams|zoom|byod|collaboration|telemedicine/], ["control", /control|controller|matrix|preset|touch/], ["network", /networkhd|av-over-ip|managed network|vlan|network switch/], ["recording", /record|capture|stream|broadcast|transcription/], ["signage", /signage|menu|fids|wayfinding|patient calling|rate board|queue/], ["resilience", /control room|command|operations centre|incident|emergency|failover|redundan/], ["accessibility", /assistive|accessibility|hearing loop|caption/]];
  rules.forEach(([capability, pattern]) => { if (pattern.test(text)) values.add(capability); });
  return [...values];
}
const TERMS: Record<string, string[]> = {
  displays: ["display", "projector", "led wall", "video wall", "visual output"], "display-mounting": ["display mount", "projector mount", "output mounting"], "audio-io-dsp": ["audio i/o", "dsp", "aec", "audio processing"], microphones: ["microphone", "audio capture"], "speakers-amplification": ["speaker", "loudspeaker", "amplifier"], "control-user-interface": ["control processor", "touch panel", "room control by others", "control user interface"], "network-infrastructure": ["network switch", "network infrastructure", "av network", "vlan"], "recording-storage": ["recording platform", "media storage", "retention"], "signage-platform": ["signage player", "content management", "signage platform"], resilience: ["redundant", "failover", "ups runtime", "recovery procedures", "operational spares"], accessibility: ["assistive listening", "captioning", "accessible user"], "rack-power-cabling": ["rack", "power distribution", "furniture and power"], ccts: ["ccts", "cables, connectors", "cable schedule"], labour: ["installation labour"], "commissioning-training": ["commissioning and training", "customer training"], "design-project-management": ["project management", "cad/visio", "as-built"], "camera-uc-compute": ["uc compute", "video conferencing equipment", "camera bridge"],
};

export function withRequiredRoomElements(template: RoomTemplate): RoomTemplate {
  const context = [template.name, template.application, template.summary, template.architecture, ...template.assumptions, ...template.validationItems].join(" ").toLowerCase();
  const wyreControl = template.bom.some((r) => !r.sku.startsWith("BY-OTHERS") && /(?:^|-)ctl(?:-|$)|syn-touch|control processor/i.test(`${r.sku} ${r.description} ${r.role}`));
  const noControl = has(context, ["no control required", "control not required", "none required for control"]);
  const base = template.bom.filter((r) => !(r.sku.startsWith("BY-OTHERS") && has(`${r.description} ${r.role}`.toLowerCase(), TERMS["control-user-interface"]) && (wyreControl || noControl)));
  const existing = base.filter((r) => r.sku.startsWith("BY-OTHERS")).map((r) => `${r.sku} ${r.description} ${r.role} ${r.notes}`.toLowerCase()).join(" | ");
  const prefix = template.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const additions = designScopeRows(prefix, capabilities(template)).filter((r) => { const suffix = r.id.slice(prefix.length + 1); return !(suffix === "control-user-interface" && (wyreControl || noControl)) && !has(existing, TERMS[suffix] ?? [r.description.toLowerCase()]); }).map((r) => ({ ...r, notes: `${r.notes} Template basis: ${template.assumptions.join("; ") || template.application}.` }));
  return additions.length || base.length !== template.bom.length ? { ...template, bom: [...base, ...additions] } : template;
}
