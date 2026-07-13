export const PRODUCT_CALL_CARD_HEADINGS = [
  "All",
  "Audio",
  "Extender Kits",
  "DA / Splitters",
  "Presentation Switchers",
  "Matrix Switchers",
  "Wireless Casting",
  "Unified Comms",
  "AVoIP",
  "Video Wall",
  "Control",
] as const;

export type ProductCallCardHeading = (typeof PRODUCT_CALL_CARD_HEADINGS)[number];
export type ClassifiedProductCallCardHeading = Exclude<ProductCallCardHeading, "All">;

export type ProductCallCardClassificationInput = {
  sku?: unknown;
  name?: unknown;
  title?: unknown;
  family?: unknown;
  category?: unknown;
  productType?: unknown;
  tags?: unknown;
  applications?: unknown;
  role?: unknown;
  productRole?: unknown;
  description?: unknown;
  summary?: unknown;
};

function fieldText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(fieldText).filter(Boolean).join(" ");
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "";
}

export function productCallCardClassificationText(product: ProductCallCardClassificationInput): string {
  return [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.category,
    product.productType,
    product.tags,
    product.applications,
    product.role,
    product.productRole,
    product.description,
    product.summary,
  ]
    .map(fieldText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// `tags` and `applications` are often populated from a shared, generic list of every
// vertical-market/room-type a product could conceivably appear in (e.g. an AVoIP
// decoder tagged "Unified communications", "Boardroom", "Video wall" alongside a dozen
// other markets) rather than a description of what the product itself is. Matching
// those fields word-for-word makes almost every networked product look like it
// belongs under every family heading. Heading classification instead uses only the
// fields that actually describe the product: identity, category and prose text.
function productCallCardHeadingSignalText(product: ProductCallCardClassificationInput): string {
  return [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.category,
    product.productType,
    product.role,
    product.productRole,
    product.description,
    product.summary,
  ]
    .map(fieldText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasAny(text: string, terms: RegExp[]): boolean {
  return terms.some((term) => term.test(text));
}

// A passive cable's "applications" copy (meeting room, video wall, UC space, ...)
// describes rooms it might be used in, not what the cable itself is - matching that
// free text would wrongly surface a cable under a family filter like "Video Wall" or
// "Unified Comms". Cables get no specific heading; they still show under "All".
function isCableProduct(sku: string, category: string): boolean {
  return /^(?:EXP-)?CAB-/.test(sku) || /\bcables?\b/.test(category.toLowerCase());
}

export function classifyProductCallCard(
  product: ProductCallCardClassificationInput,
): ClassifiedProductCallCardHeading[] {
  const sku = fieldText(product.sku).toUpperCase();
  const category = fieldText(product.category);

  if (isCableProduct(sku, category)) {
    return [];
  }

  const text = productCallCardHeadingSignalText(product);
  const headings = new Set<ClassifiedProductCallCardHeading>();

  const unifiedComms = hasAny(text, [
    /\bunified comm(?:s|unications?)\b/,
    /\busb conferenc(?:e|ing)\b/,
    /\bspeakerphone\b/,
    /\bteams\b/,
    /\bzoom\b/,
    /\bbyod\b/,
    /\bbyom\b/,
    /\b(?:ptz )?camera\b/,
    /\bmicrophone\b/,
  ]) || /^APO-.*(?:UC|MIC)/.test(sku) || /^CAM-/.test(sku);

  if (unifiedComms) {
    headings.add("Unified Comms");
  }

  const audioCore = /^AMP-/.test(sku) || hasAny(text, [/\bamplifier\b/, /\bdante\b/, /\bdsp\b/]);
  const audioPeripheral = hasAny(text, [/\baudio\b/, /\bspeaker\b/, /\bmicrophone\b/, /\bmic\b/]);

  if (audioCore || (audioPeripheral && !unifiedComms)) {
    headings.add("Audio");
  }

  if (
    /(?:^|-)(?:KIT)(?:-|$)/.test(sku) ||
    hasAny(text, [
      /\bextender kit\b/,
      /\bhdbaset kit\b/,
      /\bhdmi (?:extension|extender) kit\b/,
      /\btx\s*\/\s*rx pair\b/,
      /\btransmitter\s*(?:and|\/)\s*receiver (?:kit|pair)\b/,
    ])
  ) {
    headings.add("Extender Kits");
  }

  if (
    /^(?:EXP-)?SP-/.test(sku) ||
    /(?:^|[-/])DA(?:[-/]|$)/.test(sku) ||
    hasAny(text, [/\bsplitter\b/, /\bdistribution amplifier\b/, /\bhdmi splitter\b/])
  ) {
    headings.add("DA / Splitters");
  }

  const swMeetingSwitcher =
    /^(?:EXP-)?SW-/.test(sku) &&
    !/(?:^|-)VW(?:-|$)/.test(sku) &&
    hasAny(text, [/\bpresentation\b/, /\bswitcher\b/, /\bmeeting room\b/, /\bclassroom\b/, /\busb-c\b/]);

  if (
    swMeetingSwitcher ||
    /(?:^|-)MST(?:-|$)/.test(sku) ||
    /(?:^|-)EDU(?:-|$)/.test(sku) ||
    hasAny(text, [
      /\bpresentation switcher\b/,
      /\broom switching\b/,
      /\bmeeting-room switcher\b/,
      /\busb-c presentation\b/,
      /\bbyod\b/,
      /\bbyom\b/,
    ])
  ) {
    headings.add("Presentation Switchers");
  }

  if (
    /^(?:EXP-)?MX(?:V)?-/.test(sku) ||
    hasAny(text, [/\bmatrix switcher\b/, /\bseamless matrix\b/, /\bfixed i\/o switching\b/])
  ) {
    headings.add("Matrix Switchers");
  }

  if (
    /^APO-DG/.test(sku) ||
    /(?:^|-)DG2?(?:-|$)/.test(sku) ||
    hasAny(text, [/\bwireless presentation\b/, /\bwireless casting\b/, /\bcasting\b/, /\bairplay\b/, /\bmiracast\b/]) ||
    (/-W$/.test(sku) && hasAny(text, [/\bwireless\b/, /\bpresentation\b/]))
  ) {
    headings.add("Wireless Casting");
  }

  const networkHdRelated = /^NHD-/.test(sku) || hasAny(text, [/\bnetworkhd\b/, /\bav(?:-|\s*)over(?:-|\s*)ip\b/, /\bavoip\b/]);

  if (
    networkHdRelated ||
    (hasAny(text, [/\bencoder\b/, /\bdecoder\b/, /\bcontroller\b/]) && hasAny(text, [/\bnetworkhd\b/, /\bnhd\b/]))
  ) {
    headings.add("AVoIP");
  }

  if (
    ["NHD-0401-MV", "NHD-150-RX", "SW-0204-VW", "SW-0206-VW"].includes(sku) ||
    /(?:^|-)VW(?:-|$)/.test(sku) ||
    hasAny(text, [/\bvideo wall\b/, /\bvideowall\b/, /\bmultiview\b/, /\bmulti-view\b/])
  ) {
    headings.add("Video Wall");
  }

  if (
    /^SYN-TOUCH/.test(sku) ||
    /^NHD-(?:000-)?CTL/.test(sku) ||
    hasAny(text, [/\btouch panel\b/, /\btouchpad controller\b/, /\bcontrol interface\b/]) ||
    (/\bcontroller\b/.test(text) && hasAny(text, [/\bcontrol\b/, /\bnetworkhd\b/, /\bnhd\b/]))
  ) {
    headings.add("Control");
  }

  return [...headings];
}
