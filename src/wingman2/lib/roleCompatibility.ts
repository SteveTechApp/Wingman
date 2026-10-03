/* ------------------------------------------------------------------ */
/*  Role-compatibility checker                                         */
/*                                                                     */
/*  When a user replaces a BY-OTHERS placeholder in a template BOM,    */
/*  this module validates that the selected product's classification   */
/*  is compatible with the placeholder's designed role.                */
/* ------------------------------------------------------------------ */

export type CompatibilityResult = {
  compatible: boolean;
  severity: "ok" | "warning" | "error";
  message: string;
};

/* ------------------------------------------------------------------ */
/*  Placeholder role → compatible product classification patterns      */
/* ------------------------------------------------------------------ */

type RolePattern = {
  /** Substring patterns in the product's classificationPath, category, or description */
  productPatterns: RegExp[];
  /** Human-readable label for what fits this role */
  fitsLabel: string;
};

const ROLE_COMPATIBILITY_MAP: Record<string, RolePattern> = {
  "Visual outputs by others": {
    productPatterns: [
      /\bdecoder\b/i,
      /\bdisplay\b/i,
      /\bvideo.?wall\b/i,
      /\bmonitor\b/i,
      /\bscreen\b/i,
      /\bprojector\b/i,
      /\bled\b/i,
    ],
    fitsLabel: "decoders, displays, projectors, LED walls",
  },
  "Output mounting by others": {
    productPatterns: [/.*/], // Any product can be a mounting reference
    fitsLabel: "any mounting accessory or bracket",
  },
  "Audio I/O and processing by others": {
    productPatterns: [
      /\b(dsp|audio\s*processor|aec)\b/i,
      /\bamplifier\b/i,
      /\baudio\b.*\b(interface|device)\b/i,
      /\bdante\b/i,
      /\bdsp\b/i,
    ],
    fitsLabel: "DSPs, audio interfaces, amplifiers, Dante devices",
  },
  "Audio capture by others": {
    productPatterns: [
      /\bcamera\b/i,
      /\bmicrophone\b/i,
      /\bmic\b/i,
      /\baudio\s*capture\b/i,
      /\bptz\b/i,
    ],
    fitsLabel: "cameras, microphones, PTZ devices",
  },
  "Audio reproduction by others": {
    productPatterns: [
      /\b(speaker|loudspeaker|subwoofer)\b/i,
      /\bamplifier\b/i,
      /\bamp\b/i,
    ],
    fitsLabel: "speakers, loudspeakers, amplifiers",
  },
  "Room control by others or validate WyreStorm control": {
    productPatterns: [
      /\bcontrol\s*(processor|system)\b/i,
      /\btouch\s*panel\b/i,
      /\bcontroller\b/i,
      /\bkeypad\b/i,
      /\bsyn-ctl\b/i,
      /\bsyn-touch\b/i,
    ],
    fitsLabel: "control processors, touch panels, keypads",
  },
  "Network infrastructure by others": {
    productPatterns: [
      /\b(switch|switching)\b/i,
      /\bnetwork\b/i,
      /\bmanaged\b.*\b(switch|ethernet)\b/i,
      /\bpoe\b/i,
      /\bvlan\b/i,
    ],
    fitsLabel: "managed network switches, PoE switches",
  },
  "Rack, furniture and power by others": {
    productPatterns: [/.*/], // Any product can reference rack/power
    fitsLabel: "rack, power distribution, UPS, furniture",
  },
  "CCTS and consumables by others": {
    productPatterns: [/.*/], // Any product can reference cables
    fitsLabel: "cables, connectors, consumables",
  },
  "Installation labour by others": {
    productPatterns: [/.*/], // Labour is not a product
    fitsLabel: "labour and installation services",
  },
  "Commissioning and training by others": {
    productPatterns: [/.*/], // Service, not a product
    fitsLabel: "commissioning and training services",
  },
  "Design and project delivery by others": {
    productPatterns: [/.*/], // Service, not a product
    fitsLabel: "design and project management services",
  },
  "Video conferencing equipment by others": {
    productPatterns: [
      /\bcamera\b/i,
      /\buc\b/i,
      /\bvideo\s*conf/i,
      /\bteams\b/i,
      /\bzoom\b/i,
      /\bcompute\b/i,
      /\bndi\b/i,
    ],
    fitsLabel: "cameras, UC compute, NDI devices",
  },
};

/* ------------------------------------------------------------------ */
/*  Product classification lookup                                      */
/* ------------------------------------------------------------------ */

/**
 * Classify a product from its intelligence index entry into a role tag.
 * Uses classificationPath, category, and description.
 */
export function classifyProduct(product: {
  sku?: string;
  classificationPath?: string[];
  category?: string;
  description?: string;
  name?: string;
  technologies?: string[];
}): string[] {
  const text = [
    ...(product.classificationPath ?? []),
    product.category ?? "",
    product.description ?? "",
    product.name ?? "",
    ...(product.technologies ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const tags: string[] = [];

  if (/\bencoder\b/.test(text) && !/\bdecoder\b/.test(text)) tags.push("encoder");
  if (/\bdecoder\b/.test(text)) tags.push("decoder");
  if (/\btransceiver\b/i.test(text) || /\btrx\b/i.test(text)) tags.push("transceiver");
  if (/\bmatrix\b/.test(text)) tags.push("matrix");
  if (/\bswitcher\b/.test(text)) tags.push("switcher");
  if (/\bcamera\b/.test(text)) tags.push("camera");
  if (/\bmicrophone\b/.test(text) || /\bmic\b/.test(text)) tags.push("microphone");
  if (/\bdsp\b/.test(text) || /\baudio\s*processor\b/.test(text)) tags.push("dsp");
  if (/\bamplifier\b/.test(text) || /\bamp\b/.test(text)) tags.push("amplifier");
  if (/\bspeaker\b/.test(text) || /\bloudspeaker\b/.test(text)) tags.push("speaker");
  if (/\bcontrol\b.*\bprocessor\b/.test(text) || /\bcontroller\b/.test(text)) tags.push("controller");
  if (/\btouch\s*panel\b/.test(text)) tags.push("touch-panel");
  if (/\bswitch\b/.test(text) && /\bnetwork\b/.test(text)) tags.push("network-switch");
  if (/\bdisplay\b/.test(text) || /\bmonitor\b/.test(text)) tags.push("display");
  if (/\bprojector\b/.test(text)) tags.push("projector");
  if (/\bvideo\s*wall\b/.test(text)) tags.push("video-wall");
  if (/\busb\b/.test(text) && /\bbridge\b/.test(text)) tags.push("usb-bridge");
  if (/\bdante\b/.test(text)) tags.push("dante");
  if (/\bndi\b/.test(text)) tags.push("ndi");

  if (tags.length === 0) tags.push("accessory");

  return tags;
}

/* ------------------------------------------------------------------ */
/*  Compatibility check                                                */
/* ------------------------------------------------------------------ */

/**
 * Check if a product is compatible with a BY-OTHERS placeholder role.
 *
 * @param placeholderRole - The role string from the TemplateBomRow (e.g. "Visual outputs by others")
 * @param productClassification - The product's classification tags from classifyProduct()
 * @returns CompatibilityResult indicating whether the product fits the role
 */
export function checkRoleCompatibility(
  placeholderRole: string,
  productClassification: string[],
): CompatibilityResult {
  const rolePattern = ROLE_COMPATIBILITY_MAP[placeholderRole];

  // Unknown role — cannot validate, assume compatible
  if (!rolePattern) {
    return {
      compatible: true,
      severity: "ok",
      message: `Role "${placeholderRole}" is not in the compatibility database. Proceed with caution.`,
    };
  }

  // Check if any product classification matches any role pattern
  const matches = rolePattern.productPatterns.some((pattern) =>
    productClassification.some((tag) => pattern.test(tag)),
  );

  // Wildcard roles (services, consumables) — always compatible
  if (rolePattern.productPatterns.length === 1 && rolePattern.productPatterns[0].source === ".*") {
    return {
      compatible: true,
      severity: "ok",
      message: `This placeholder accepts ${rolePattern.fitsLabel}.`,
    };
  }

  if (matches) {
    return {
      compatible: true,
      severity: "ok",
      message: `Product matches the expected role: ${rolePattern.fitsLabel}.`,
    };
  }

  // Mismatch — product doesn't fit the role
  return {
    compatible: false,
    severity: "error",
    message: `This product (${productClassification.join(", ")}) does not match the placeholder role. Expected: ${rolePattern.fitsLabel}.`,
  };
}

/**
 * Get the expected role description for a placeholder role.
 * Used to show "Expected: ..." hints in the UI.
 */
export function expectedRoleDescription(placeholderRole: string): string | null {
  return ROLE_COMPATIBILITY_MAP[placeholderRole]?.fitsLabel ?? null;
}

/**
 * Get all known placeholder roles for UI display.
 */
export function knownPlaceholderRoles(): string[] {
  return Object.keys(ROLE_COMPATIBILITY_MAP);
}
