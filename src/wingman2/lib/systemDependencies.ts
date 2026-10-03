/**
 * System-dependency model for Compare.
 *
 * Many WyreStorm products are one component of a multi-part system, not a
 * one-box solution, and a comparison that ignores that will present a single
 * SKU as a drop-in replacement for a competitor's complete system. Examples:
 *  - An AV-over-IP encoder needs at least one matching decoder, a suitable
 *    managed network, and a NetworkHD controller before it does anything.
 *  - A standalone HDBaseT transmitter (e.g. an in-wall plate like SW-120-TX3)
 *    needs a matching receiver to break HDMI/USB back out - unless it is fed
 *    into a display or projector that already has a compatible HDBaseT input.
 *  - A wireless casting dongle needs a compatible base/receiver device.
 *
 * This derives a structured requirement summary from the product's domain/role
 * (the clear architectural cases) and harvests any additional companion
 * requirements stated in the governed free-text `dependencies` (the
 * authoritative, per-SKU source). `standalone` is true only when nothing else
 * is required for the product to function.
 */

export type SystemRequirements = {
  standalone: boolean;
  requires: string[];
};

export type SystemDependencyInput = {
  domain?: string | null;
  role?: string | null;
  sku?: string | null;
  transport?: string | null;
  dependencies?: string[] | null;
};

function lc(value: unknown): string {
  return String(value ?? "").toLowerCase();
}

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function deriveSystemRequirements(input: SystemDependencyInput): SystemRequirements {
  const domain = lc(input.domain);
  const role = lc(input.role);
  const sku = lc(input.sku);
  const transport = lc(input.transport);
  const deps = (input.dependencies ?? []).filter(Boolean);
  const depsBlob = deps.map(lc).join(" ");

  const requires: string[] = [];

  // A "set" / "kit" bundles both ends (TX + RX) and so is a self-contained
  // point-to-point link - it does not need a separate WyreStorm counterpart.
  const bundledPair = /\b(set|kit)\b/.test(role) || /includes?\b.*\breceiver|bundle|in the box/.test(depsBlob);

  const isEncoder = /\bencoder\b|\btransmitter\b|(?:^|[^a-z])tx(?:[^a-z]|$)/.test(role) || /-tx\b/.test(sku);
  const isDecoder = /\bdecoder\b|\breceiver\b|(?:^|[^a-z])rx(?:[^a-z]|$)/.test(role) || /-rx\b/.test(sku);
  const isTransceiver = /\btransceiver\b|(?:^|[^a-z])trx(?:[^a-z]|$)/.test(role) || /-trx\b/.test(sku);

  const isAvoip = domain.includes("avoip") || /\b(avoip|networkhd|sdvoe|nhd-)\b/.test(`${depsBlob} ${sku}`);
  const isHdbaset = domain.includes("hdbaset") || /hdbaset|hdbt/.test(`${role} ${transport}`);

  if (isAvoip && !bundledPair) {
    if (isTransceiver) {
      requires.push("a second transceiver (or a matching encoder/decoder) as the far end");
    } else if (isEncoder) {
      requires.push("at least one matching AV-over-IP decoder");
    } else if (isDecoder) {
      requires.push("at least one matching AV-over-IP encoder/source");
    }
    requires.push("a suitable managed AV network switch (correct speed, multicast/IGMP configured)");
    requires.push("a NetworkHD system controller (e.g. NHD-CTL-PRO-V2) and a control system");
  } else if (isHdbaset && !bundledPair) {
    if (isEncoder) {
      requires.push("a matching HDBaseT receiver to break out HDMI/USB - unless the display/projector has a compatible HDBaseT input");
    } else if (isDecoder) {
      requires.push("a matching HDBaseT transmitter, matrix HDBaseT output, or in-wall plate as the source end");
    }
  }

  if (/wireless.*(dongle|casting)|casting dongle|apo-dg/.test(`${role} ${sku}`)) {
    requires.push("a compatible WyreStorm receiver/base device (it is not a standalone caster)");
  }

  // Harvest any explicit companion requirement stated in the governed free-text
  // dependencies (the authoritative per-SKU source), e.g. "Requires a NetworkHD
  // controller" or "Requires a matching HDBaseT 3.0 receiver".
  for (const dep of deps) {
    if (/\b(require|requires|needs|mandatory|pairs? with|paired|matching|companion)\b/i.test(dep) &&
        /\b(decoder|encoder|receiver|transmitter|controller|network|switch|base|host|matrix|display|amplifier|dsp|license)\b/i.test(dep)) {
      requires.push(dep);
    }
  }

  const merged = uniqueTrimmed(requires);
  return { standalone: merged.length === 0, requires: merged };
}
