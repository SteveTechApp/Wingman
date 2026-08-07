import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";

/**
 * Shared "by others" BOM placeholder helpers.
 *
 * A room template BOM pre-designs the WyreStorm SKUs and surrounds them with
 * generic, replaceable third-party line items (display, audio, control, network,
 * infrastructure) so the template is a complete, cohesive starting point. The
 * customer replaces each BY-OTHERS row with their chosen model. These SKUs are
 * deliberately not WyreStorm part numbers and are exempted from the template SKU
 * lifecycle and signal-path guards.
 *
 * This module has no runtime dependency on roomTemplates.ts (the TemplateBomRow
 * import is type-only), so both roomTemplates.ts and roomTemplatesExtra.ts can
 * import it without an initialization cycle.
 */

export function byOthersSku(label: string): string {
  return `BY-OTHERS-${label.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function byOthersRow(prefix: string, suffix: string, description: string, role: string, notes: string): TemplateBomRow {
  return {
    id: `${prefix}-${suffix}`,
    sku: byOthersSku(`${prefix}-${suffix}`),
    description,
    role,
    qty: 1,
    type: "Validate",
    status: "validate",
    evidence: "Placeholder row for non-WyreStorm equipment required to complete the customer-ready system design.",
    notes,
  };
}

export function completeDesignPlaceholders(prefix: string, extras: TemplateBomRow[] = []): TemplateBomRow[] {
  return [
    byOthersRow(
      prefix,
      "displays-mounts",
      "Display, projector, LED or video-wall output devices",
      "Visual outputs by others",
      "Select the output technology, quantity, size, resolution, brightness, orientation, bezel or LED pixel-pitch requirement and input connection.",
    ),
    byOthersRow(
      prefix,
      "display-mounting",
      "Wall, ceiling, floor, furniture or recessed display mounting",
      "Output mounting by others",
      "Select the mounting method for every output, including VESA pattern, structure, brackets, service access, ventilation, trim and making good.",
    ),
    byOthersRow(
      prefix,
      "audio-io-dsp",
      "Audio input/output interfaces, DSP, AEC and room audio processing",
      "Audio I/O and processing by others",
      "Define analogue, USB, Dante or other audio I/O, DSP channel count, echo cancellation, mixing, zoning and assistive-listening requirements. Exclude only where the selected integrated room device demonstrably fulfils the requirement.",
    ),
    byOthersRow(
      prefix,
      "microphones",
      "Ceiling, table, lectern, wireless or camera microphones",
      "Audio capture by others",
      "Select microphone type, pickup coverage, quantity, placement, wireless frequencies, charging, mute behaviour and DSP inputs. Exclude only where the selected integrated room device demonstrably fulfils the requirement.",
    ),
    byOthersRow(
      prefix,
      "speakers-amplification",
      "Loudspeakers, subwoofers, amplification and speaker cabling",
      "Audio reproduction by others",
      "Select loudspeaker type, coverage, zoning, tap/impedance, amplifier channels and power, mounting, acoustic treatment and tuning responsibility. Exclude only where the selected integrated room device demonstrably fulfils the requirement.",
    ),
    byOthersRow(
      prefix,
      "control-user-interface",
      "Touch panel, keypad, control processor, control programming or user interface",
      "Room control by others or validate WyreStorm control",
      "Confirm who owns control. Replace with third-party control equipment or a confirmed WyreStorm control interface where appropriate.",
    ),
    byOthersRow(
      prefix,
      "network-infrastructure",
      "Managed network switch, VLAN, PoE, fibre, optics and network configuration",
      "Network infrastructure by others",
      "Replace with the approved switch, VLAN plan, PoE budget, multicast configuration, fibre/copper uplinks and commissioning responsibility.",
    ),
    byOthersRow(
      prefix,
      "rack-power-cabling",
      "Rack, furniture, power distribution, UPS, ventilation and equipment mounting",
      "Rack, furniture and power by others",
      "Replace with the rack/furniture layout, RU allowance, shelves, power/UPS, earthing, thermal design, access and service clearances.",
    ),
    byOthersRow(
      prefix,
      "ccts",
      "CCTS allowance: cables, connectors, termination, testing and sundries",
      "CCTS and consumables by others",
      "Complete the cable schedule and allow for signal, network, USB, audio, control and speaker cable; connectors; patch leads; containment; labels; fire stopping; certification and consumables.",
    ),
    byOthersRow(
      prefix,
      "labour",
      "Installation labour, access equipment, coordination and making good",
      "Installation labour by others",
      "Enter engineering and installation days, site access, inductions, lifting/access equipment, out-of-hours work, supervision and making-good responsibility.",
    ),
    byOthersRow(
      prefix,
      "commissioning-training",
      "Configuration, programming, commissioning, testing, training and handover",
      "Commissioning and training by others",
      "Allow for device configuration, control/DSP programming, system testing, tuning, customer training, acceptance records and handover support.",
    ),
    byOthersRow(
      prefix,
      "design-project-management",
      "Project management, coordination, CAD/Visio drawings and as-built documentation",
      "Design and project delivery by others",
      "Allow for survey, design coordination, schematics, elevations, rack layouts, cable schedules, programme/change control, O&M information and as-built issue.",
    ),
    ...extras,
  ];
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

/** Ensures every template presents a complete-room checklist, not only a WyreStorm BOM. */
export function withRequiredRoomElements(template: RoomTemplate): RoomTemplate {
  const context = [template.name, template.application, template.summary, template.architecture, ...template.assumptions, ...template.validationItems].join(" ").toLowerCase();
  const wyreStormControlSelected = template.bom.some((row) => !row.sku.startsWith("BY-OTHERS") && /(?:^|-)ctl(?:-|$)|syn-touch|control processor/i.test(`${row.sku} ${row.description} ${row.role}`));
  const controlNotRequired = includesAny(context, ["no control required", "control not required", "none required for control"]);
  const baseBom = template.bom.filter((row) => !(
    row.sku.startsWith("BY-OTHERS") &&
    includesAny(`${row.description} ${row.role}`.toLowerCase(), ["control processor", "touch panel", "room control by others", "control user interface"]) &&
    (wyreStormControlSelected || controlNotRequired)
  ));
  const existing = baseBom.filter((row) => row.sku.startsWith("BY-OTHERS")).map((row) => `${row.sku} ${row.description} ${row.role}`.toLowerCase()).join(" | ");
  const conferencing = includesAny(context, ["teams", "zoom", "video confer", "videoconfer", "hybrid", "uc room", "camera"]);
  const prefix = template.id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const candidates = completeDesignPlaceholders(prefix);
  if (conferencing) candidates.push(byOthersRow(
    prefix,
    "camera-uc-compute",
    "Room cameras, camera mounting, USB bridge and UC compute/licensing",
    "Video conferencing equipment by others",
    "Confirm camera count and coverage, PTZ/fixed/NDI path, camera bridge, mounting, Teams/Zoom room compute, licences, USB topology and dual-display behaviour. Exclude elements already fulfilled by an integrated room device.",
  ));

  const semanticTerms: Record<string, string[]> = {
    "displays-mounts": ["display", "projector", "projection", "led wall", "video wall", "visual output"],
    "display-mounting": ["display mount", "projector mount", "output mounting", "wall bracket", "ceiling mount"],
    "audio-io-dsp": ["audio i/o", "audio input", "audio output", "dsp", "aec", "audio processing"],
    microphones: ["microphone", "audio capture"],
    "speakers-amplification": ["speaker", "loudspeaker", "amplifier", "audio reproduction"],
    "control-user-interface": ["control processor", "touch panel", "room control by others", "control user interface"],
    "network-infrastructure": ["network switch", "network infrastructure", "av network", "vlan"],
    "rack-power-cabling": ["rack", "ups", "power distribution", "furniture and power"],
    ccts: ["ccts", "cabling and consumables", "cables, connectors", "cable schedule"],
    labour: ["installation labour", "install labour"],
    "commissioning-training": ["commissioning and training", "configuration, programming", "customer training"],
    "design-project-management": ["project management", "cad/visio", "as-built documentation"],
    "camera-uc-compute": ["uc compute", "video conferencing equipment", "camera bridge"],
  };

  const additions = candidates.filter((row) => {
    const suffix = row.id.slice(prefix.length + 1);
    if (suffix === "control-user-interface" && (wyreStormControlSelected || controlNotRequired)) return false;
    return !includesAny(existing, semanticTerms[suffix] ?? [row.description.toLowerCase()]);
  }).map((row) => ({
    ...row,
    notes: `${row.notes} Template basis: ${template.assumptions.join("; ") || template.application}.`,
  }));

  return additions.length || baseBom.length !== template.bom.length ? { ...template, bom: [...baseBom, ...additions] } : template;
}
