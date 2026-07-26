import type { TemplateBomRow } from "./roomTemplates";

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
      "Displays, mounts, brackets and display accessories",
      "Display hardware by others",
      "Replace with the selected display model, wall/ceiling/furniture mount, VESA details, screen size, brightness and orientation requirements.",
    ),
    byOthersRow(
      prefix,
      "audio-dsp-mics",
      "DSP, microphones, speakers, amplifier channels and audio accessories",
      "Room audio by others",
      "Replace with the selected DSP, microphones, loudspeakers, amplifier, induction loop, conferencing audio or venue PA equipment.",
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
      "Rack, power distribution, UPS, patching, containment and installation cabling",
      "Infrastructure and installation by others",
      "Replace with rack layout, cable schedule, power/UPS, containment, installation labour and site-specific accessories.",
    ),
    ...extras,
  ];
}
