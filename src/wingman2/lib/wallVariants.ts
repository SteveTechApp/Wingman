import type { WallOption } from "./videowallOptions";

/**
 * The build a design is ordered in.
 *
 * A catalogue design is an architecture, not a part number: the 500 series
 * ships as the full pair and as the Lite (-E) pair, and the 600 series ships on
 * copper and on fibre. They are the same signal path with a different connector
 * set, so a rep reading "NetworkHD 500" needs to see which build the room
 * actually needs before the schedule is quoted.
 *
 * A variant is a swap on the design's own schedule, never a second design: it
 * keeps the design's id, so the recommendation, the saved wall and a shared
 * pick all still name one architecture — only the order lines and the one check
 * that build brings along differ.
 */
export type WallVariant = {
  /** `""` is the catalogue build, so a saved design without a variant is that one. */
  id: string;
  label: string;
  /** What this build is, in the room's terms. */
  summary: string;
  /** SKUs swapped on the design's schedule; absent on the catalogue build. */
  skus?: Record<string, string>;
  /** The check that travels with this build, added to the design's own. */
  check?: string;
};

export const WALL_BASE_VARIANT = "";

/** The 500-series Lite pair: same 1GbE design, smaller connector set. */
const LITE_500 = { "NHD-500-TX": "NHD-500-E-TX", "NHD-500-RX": "NHD-500-E-RX" };

const VARIANTS: Record<string, WallVariant[]> = {
  nhd500: [
    {
      id: WALL_BASE_VARIANT,
      label: "500 · full pair",
      summary:
        "NHD-500-TX/RX: the full pair — a local HDMI loop-out, analogue audio in and out, an SFP cage, USB/KVM and RS-232 alongside the 1GbE link.",
    },
    {
      id: "lite",
      label: "500-E · Lite pair",
      summary:
        "NHD-500-E-TX/RX: HDMI in, an audio de-embed at the encoder and PoE on a 1GbE link, with no loop-out, SFP, USB/KVM or RS-232.",
      skus: LITE_500,
      check:
        "The 500-E build is the Lite pair: confirm the room does not need the encoder's HDMI loop-out, SFP cage, USB/KVM or RS-232 before ordering.",
    },
  ],
  "nhd500-multiview": [
    {
      id: WALL_BASE_VARIANT,
      label: "500 · full pair",
      summary:
        "NHD-500-TX/RX: the full pair feeding the multiview stage — a local HDMI loop-out, analogue audio in and out, an SFP cage, USB/KVM and RS-232 alongside the 1GbE link.",
    },
    {
      id: "lite",
      label: "500-E · Lite pair",
      summary:
        "NHD-500-E-TX/RX: the Lite pair feeding the multiview stage — HDMI in, an audio de-embed and PoE, with no loop-out, SFP, USB/KVM or RS-232.",
      skus: LITE_500,
      check:
        "The 500-E build is the Lite pair: confirm the room does not need the encoder's HDMI loop-out, SFP cage, USB/KVM or RS-232 before ordering.",
    },
  ],
  nhd600: [
    {
      id: WALL_BASE_VARIANT,
      label: "600 · copper",
      summary: "NHD-600-TRX: 10GbE over RJ45 copper, with a separate 1GbE control port on the same unit.",
    },
    {
      id: "fibre",
      label: "600 · fibre",
      summary:
        "NHD-600-TRXF: the same transceiver with a 10Gb SFP+ cage — 300 m on OM3 multi-mode, up to 10 km on single-mode.",
      skus: { "NHD-600-TRX": "NHD-600-TRXF" },
      check:
        "NHD-600-TRXF takes a 10Gb SFP+ module or lead: confirm the fibre type, the connectors and the ordering code with the local catalogue.",
    },
  ],
};

/**
 * The builds a design ships in, catalogue build first. A design with one build
 * returns nothing rather than one chip nobody can act on.
 */
export function wallOptionVariants(optionId: string): WallVariant[] {
  return VARIANTS[optionId] ?? [];
}

/** The build a saved design names, or null when it names the catalogue build. */
export function wallVariantFor(optionId: string, variantId: string | null | undefined): WallVariant | null {
  if (!variantId) return null;
  return wallOptionVariants(optionId).find((variant) => variant.id === variantId) ?? null;
}

/** What a saved design should say about its build: the label, or nothing at all. */
export function wallVariantLabel(optionId: string, variantId: string | null | undefined): string | null {
  return wallVariantFor(optionId, variantId)?.label ?? null;
}

/**
 * The design as it would be ordered: the chosen build's SKUs on the schedule and
 * its check beside the design's own.
 *
 * A variant id the design does not offer is ignored, so a stale draft or a
 * hand-edited record cannot put another build's parts on this wall.
 */
export function wallOptionWithVariant(option: WallOption, variantId?: string | null): WallOption {
  const variant = wallVariantFor(option.id, variantId);
  if (!variant) return option;
  const equipment = variant.skus
    ? option.equipment.map((item) => {
      const sku = variant.skus![item.sku];
      return sku ? { ...item, sku } : item;
    })
    : option.equipment;
  return {
    ...option,
    equipment,
    checks: variant.check ? [...option.checks, variant.check] : option.checks,
  };
}
