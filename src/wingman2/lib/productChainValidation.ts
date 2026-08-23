import governedTechnicalProfiles from "../../../data/governance/wyrestorm-technical-profiles.json";
import type { StoredProductSelection } from "../data/projectStore";
import type { DesignAssuranceItem } from "./productAssurance";
import { normaliseProjectTopology } from "./projectTopology";

type UnknownRecord = Record<string, unknown>;

export type ProductChainValidationInput = {
  /** The governed product selections making up the proposed BOM. */
  products: StoredProductSelection[];
  /** The captured project topology, when available. */
  topology?: unknown;
  /** Requirement text used for signal-capability checks (e.g. 4K60 4:4:4). */
  requirementText?: string;
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normaliseSku(value: string): string {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

const technicalBySku = new Map(
  ((record(governedTechnicalProfiles).profiles as UnknownRecord[]) ?? [])
    .map((profile) => [normaliseSku(text(profile.sku)), profile] as const)
    .filter(([sku]) => Boolean(sku)),
);

function skuOf(product: StoredProductSelection): string {
  return normaliseSku(product.sku);
}

/** Raw (non-normalised) SKU for suffix/prefix pattern matching. */
function rawSku(product: StoredProductSelection): string {
  return text(product.sku).toUpperCase();
}

// Role tokens appear as prefixes (RX-700), suffixes (SW-130-TX-UK, with the
// regional marker after the role) or embedded segments (NHD-500-RX). Match any
// whole hyphen-delimited segment so every real form is recognised.
const ROLE_SEGMENT = /(?:^|-)(TX|TRX|TRXF|RX)(?:-|$)/;

function roleToken(sku: string): string | null {
  const match = sku.toUpperCase().match(ROLE_SEGMENT);
  return match?.[1] ?? null;
}

function isTxLike(sku: string): boolean {
  return roleToken(sku) === "TX";
}

function isTrxLike(sku: string): boolean {
  const token = roleToken(sku);
  return token === "TRX" || token === "TRXF";
}

function isRxLike(sku: string): boolean {
  return roleToken(sku) === "RX";
}

function isMatrixLike(sku: string, profile?: UnknownRecord): boolean {
  return /^MX-/.test(sku) && /MATRIX/.test(text(profile?.productClass));
}

function profileOf(sku: string): UnknownRecord | undefined {
  return technicalBySku.get(skuOf({ sku })) ?? technicalBySku.get(sku);
}

function transportText(profile: UnknownRecord | undefined): string {
  return ((Array.isArray(profile?.transport) ? profile.transport : []) as unknown[])
    .map(text)
    .join(" ")
    .toLowerCase();
}

function usbText(profile: UnknownRecord | undefined): string {
  return ((Array.isArray(profile?.usb) ? profile.usb : []) as unknown[])
    .map(text)
    .join(" ")
    .toLowerCase();
}

function networkHdFamily(sku: string): string | null {
  // Expects the raw (hyphenated) SKU form, e.g. NHD-500-TX.
  const match = sku.toUpperCase().match(/^NHD-(1(?:20|24|28|50)|5(?:00|10)|6(?:00|10))/);
  if (!match) return null;
  const series = match[1];
  if (series.startsWith("1")) return "100";
  if (series.startsWith("5")) return "500";
  if (series.startsWith("6")) return "600";
  return null;
}

function connectionHasUsb3(topology: ReturnType<typeof normaliseProjectTopology>): boolean {
  return topology.connections.some((connection) => connection.services.includes("usb-3"));
}

function selectedUsbGenerations(products: StoredProductSelection[]): { sku: string; usb3: boolean }[] {
  return products.map((product) => {
    const profile = profileOf(product.sku);
    const usb = usbText(profile);
    return {
      sku: text(product.sku).toUpperCase(),
      // usbText() is lowercased, so match lowercase forms only.
      usb3: /\busb\s*3\.|\busb 3\b|usb 3\.x|5gbps|10gbps/.test(usb),
    };
  });
}

/**
 * Validates that the products selected for a BOM work together as a signal
 * chain. This is the "what does product A do to product B" layer: a governed
 * profile alone can be perfect, but the BOM can still be broken by mixing
 * NetworkHD generations, pairing a TX with no RX, or sending USB 3.x through
 * a USB 2.0-only path.
 *
 * Results are structured as assurance items (blockers / warnings) so they can
 * be folded into the same release ledger as lifecycle and governed-profile
 * checks, and surface on the proposal's technical release gate.
 */
export function buildProductChainAssurance(input: ProductChainValidationInput): DesignAssuranceItem[] {
  const items: DesignAssuranceItem[] = [];
  const selectedFamilies = new Map<string, string[]>();
  for (const product of input.products) {
    const family = networkHdFamily(rawSku(product));
    if (!family) continue;
    const key = skuOf(product);
    const existing = selectedFamilies.get(family) ?? [];
    if (!existing.includes(key)) existing.push(key);
    selectedFamilies.set(family, existing);
  }

  // NetworkHD generations must not be mixed inside one system: a 600-series
  // endpoint and a 500-series endpoint do not interoperate on the same
  // NetworkHD control plane.
  if (selectedFamilies.size > 1) {
    const summary = Array.from(selectedFamilies.entries())
      .map(([family, familySkus]) => `${family} (${familySkus.join(", ")})`)
      .join(" and ");
    items.push({
      id: "chain-networkhd-generation-mix",
      severity: "blocker",
      domain: "network",
      message: `NetworkHD generations are mixed in this BOM: ${summary}. Endpoints from different NetworkHD families do not share one control plane - treat each generation as its own system and validate the architecture explicitly.`,
    });
  }

  // A standalone HDBaseT transmitter with no receiver, transceiver or matrix
  // output to terminate the path cannot deliver video to a display.
  const hasTrx = input.products.some((product) => isTrxLike(rawSku(product)));
  const hasRx = input.products.some((product) => isRxLike(rawSku(product)));
  const hasMatrixOutput = input.products.some((product) => {
    const profile = profileOf(product.sku);
    const transport = transportText(profile);
    // A matrix with an HDBaseT output terminates a TX path; an HDMI-only
    // matrix ("no HDBaseT outputs") does not. Match the positive evidence and
    // exclude the explicit negation before trusting it.
    const hdbtProven = /hdbaset/.test(transport) && !/no hdbaset|no hdbt|without hdbaset/.test(transport);
    return isMatrixLike(product.sku, profile) || (hdbtProven && /matrix|output/.test(transport));
  });
  const standaloneTx = input.products.filter(
    (product) => isTxLike(rawSku(product)) && !isTrxLike(rawSku(product)),
  );

  for (const tx of standaloneTx) {
    const terminated = hasTrx || hasRx || hasMatrixOutput;
    if (terminated) continue;
    items.push({
      id: `chain-tx-without-rx-${skuOf(tx)}`,
      severity: "blocker",
      domain: "signal",
      sku: text(tx.sku).toUpperCase(),
      message: `${text(tx.sku).toUpperCase()} is a transmitter with no receiver, transceiver or HDBaseT matrix output selected to terminate the path. Add the matching receive side before quoting.`,
    });
  }

  // A receiver with no transmitter and no matrix input path is equally dead.
  if (hasRx && !hasTrx && !standaloneTx.length && !hasMatrixOutput) {
    const rx = input.products.find((product) => isRxLike(rawSku(product)));
    if (rx) {
      items.push({
        id: `chain-rx-without-tx-${skuOf(rx)}`,
        severity: "blocker",
        domain: "signal",
        sku: text(rx.sku).toUpperCase(),
        message: `${text(rx.sku).toUpperCase()} is a receiver with no transmitter or matrix output selected to feed it. Add the matching transmit side before quoting.`,
      });
    }
  }

  // USB 3.x bandwidth cannot survive a USB 2.0-only extender. When the
  // topology requires a USB 3.x service, every governed product on the USB
  // path must prove USB 3.x.
  const topology = normaliseProjectTopology(input.topology);
  const topologyNeedsUsb3 = connectionHasUsb3(topology);
  const usbGenerations = selectedUsbGenerations(input.products);
  const usb3Capable = usbGenerations.some((item) => item.usb3);
  const usb2OnlyExtender = input.products.some((product) => {
    const profile = profileOf(product.sku);
    const usb = usbText(profile);
    const extensionRole = /extender|extension|kvm|usb routing/.test(`${text(profile?.role)} ${text(profile?.productType)} ${transportText(profile)}`);
    // usbText() is lowercased, so match lowercase forms only.
    return extensionRole && /\busb\s*2\.0\b|usb2\.0/.test(usb) && !/\busb\s*3\./.test(usb);
  });

  if ((topologyNeedsUsb3 || usb3Capable) && usb2OnlyExtender) {
    items.push({
      id: "chain-usb3-through-usb2-extender",
      severity: "blocker",
      domain: "usb",
      message: "The design requires USB 3.x bandwidth, but a USB 2.0-only extender/extension product is in the BOM. USB 3.x will fall back to USB 2.0 speeds - select a USB 3.x-rated extension path or confirm the fallback is acceptable.",
    });
  }

  // Signal capability: 4K60 4:4:4 cannot be claimed over an HDBaseT 2.0 /
  // Class B (10.2Gbps) path. The governed transport strings distinguish the
  // classes, so this check is evidence-based rather than a keyword guess.
  const requirementText = (input.requirementText ?? "").toLowerCase();
  const needs444 = /4k60\s*4:4:4|4:4:4\s*4k60|4k60 4:4:4|4:4:4 @ ?4k60|4k60.*444/.test(requirementText);
  if (needs444) {
    const hdbtProfiles = input.products
      .map((product) => ({ sku: text(product.sku).toUpperCase(), profile: profileOf(product.sku) }))
      .filter((item) => /hdbaset/.test(transportText(item.profile)));
    const onlyClassB = hdbtProfiles.length > 0 && hdbtProfiles.every((item) =>
      /class b|10\.2gbps|hdbaset 2\.0/.test(transportText(item.profile)) &&
      !/class a|18gbps|hdbaset 3\.0/.test(transportText(item.profile)),
    );
    if (onlyClassB) {
      items.push({
        id: "chain-4k60-444-over-classb",
        severity: "blocker",
        domain: "signal",
        message: "The requirement asks for 4K60 4:4:4, but the selected HDBaseT path only proves Class B / 10.2Gbps (HDBaseT 2.0). 4K60 4:4:4 needs an 18Gbps-capable path - confirm the resolution/chroma actually required or upgrade the transport.",
      });
    }
  }

  // Distance vs governed reach: any topology run that exceeds the product's
  // governed HDBaseT reach must be flagged before quote.
  const topologyLengths = topology.connections
    .map((connection) => connection.lengthMetres)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (topologyLengths.length) {
    const longest = Math.max(...topologyLengths);
    const hdbtProfiles = input.products
      .map((product) => ({ sku: text(product.sku).toUpperCase(), profile: profileOf(product.sku) }))
      .filter((item) => /hdbaset/.test(transportText(item.profile)));
    for (const item of hdbtProfiles) {
      const reachMatch = transportText(item.profile).match(/(\d{2,3})m/);
      const reach = reachMatch ? Number(reachMatch[1]) : null;
      if (reach && longest > reach) {
        items.push({
          id: `chain-distance-exceeds-${item.sku}`,
          severity: "blocker",
          domain: "signal",
          sku: item.sku,
          message: `${item.sku} has a governed HDBaseT reach of ${reach}m, but the longest topology run is ${longest}m. The path exceeds the product's proven reach - confirm the cable grade and distance or select a longer-reach product.`,
        });
      }
    }
  }

  return items;
}
