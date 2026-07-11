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

function hasAny(text: string, terms: RegExp[]): boolean {
  return terms.some((term) => term.test(text));
}

export function classifyProductCallCard(
  product: ProductCallCardClassificationInput,
): ClassifiedProductCallCardHeading[] {
  const sku = fieldText(product.sku).toUpperCase();

  // Classification must describe what the product is, not every application,
  // feature or alternative mentioned in its marketing copy.
  const identityText = [
    product.sku,
    product.name,
    product.title,
    product.family,
    product.category,
    product.productType,
    product.role,
    product.productRole,
  ]
    .map(fieldText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const headings = new Set<ClassifiedProductCallCardHeading>();
  const identityHas = (terms: RegExp[]) =>
    terms.some((term) => term.test(identityText));

  const isNetworkHd = /^NHD-/.test(sku);
  const isCamera = /^CAM-/.test(sku);
  const isApollo =
    /^APO-/.test(sku) &&
    !/^APO-DG/.test(sku);
  const isHaloVideoBar = /^HALO-VX10(?:-UC)?-V2$/.test(sku);

  const isUnifiedComms =
    isCamera ||
    isApollo ||
    isHaloVideoBar ||
    identityHas([
      /\bunified comm(?:s|unications?)\b/,
      /\bvideo bar\b/,
      /\bconference camera\b/,
      /\bconferencing camera\b/,
      /\bspeakerphone\b/,
      /\buc switcher\b/,
      /\bptz camera\b/,
    ]);

  if (isUnifiedComms) {
    headings.add("Unified Comms");
  }

  const isAudioProduct =
    /^AMP-/.test(sku) ||
    identityHas([
      /\baudio amplifier\b/,
      /\bnetwork amplifier\b/,
      /\bdante amplifier\b/,
      /\bdsp amplifier\b/,
      /\baudio processor\b/,
      /\baudio converter\b/,
      /\baudio breakout\b/,
      /\baudio extractor\b/,
      /\baudio de-?embed(?:der|ding)?\b/,
    ]);

  if (isAudioProduct) {
    headings.add("Audio");
  }

  const hasKitSku = /(?:^|-)KIT(?:-|$)/.test(sku);
  const extenderIdentity = identityHas([
    /\bextender kit\b/,
    /\bhdbaset kit\b/,
    /\bhdmi (?:extension|extender) kit\b/,
    /\btx\s*\/\s*rx pair\b/,
    /\btransmitter\s*(?:and|\/)\s*receiver (?:kit|pair)\b/,
  ]);
  const kitCapableSku =
    /^(?:EXP-)?(?:EX|MX|MXV)-/.test(sku);

  if ((hasKitSku && kitCapableSku) || extenderIdentity) {
    headings.add("Extender Kits");
  }

  const isDistributionAmplifier =
    /^(?:EXP-)?SP-/.test(sku) ||
    /(?:^|[-/])DA(?:[-/]|$)/.test(sku) ||
    identityHas([
      /\bsplitter\b/,
      /\bdistribution amplifier\b/,
      /\bhdmi splitter\b/,
    ]);

  if (isDistributionAmplifier) {
    headings.add("DA / Splitters");
  }

  const isVideoWallSku = /(?:^|-)VW(?:-|$)/.test(sku);
  const isPresentationSwitcherSku =
    /^(?:EXP-)?SW-/.test(sku) &&
    !isVideoWallSku;
  const isPresentationMatrixSku =
    /^(?:EXP-)?MX(?:V)?-/.test(sku) &&
    /(?:^|-)(?:MST|EDU)(?:-|$)/.test(sku);
  const isPresentationIdentity = identityHas([
    /\bpresentation switcher\b/,
    /\broom switcher\b/,
    /\bclassroom switcher\b/,
    /\busb-c switcher\b/,
    /\bmeeting-room switcher\b/,
  ]);

  if (
    (isPresentationSwitcherSku &&
      identityHas([
        /\bpresentation\b/,
        /\bswitcher\b/,
        /\bmeeting room\b/,
        /\bclassroom\b/,
        /\busb-c\b/,
      ])) ||
    isPresentationMatrixSku ||
    isPresentationIdentity
  ) {
    headings.add("Presentation Switchers");
  }

  const isMatrix =
    /^(?:EXP-)?MX(?:V)?-/.test(sku) ||
    identityHas([
      /\bmatrix switcher\b/,
      /\bseamless matrix\b/,
      /\bfixed i\/o matrix\b/,
      /\brouting matrix\b/,
    ]);

  if (isMatrix) {
    headings.add("Matrix Switchers");
  }

  const isWirelessCastingHost = [
    "APO-VX20-UC-V2",
    "HALO-VX10-V2",
  ].includes(sku);

  const isWirelessCasting =
    isWirelessCastingHost ||
    /^APO-DG/.test(sku) ||
    (
      /-W$/.test(sku) &&
      /^(?:EXP-)?(?:SW|MX|MXV)-/.test(sku)
    ) ||
    identityHas([
      /\bwireless casting dongle\b/,
      /\bwireless presentation dongle\b/,
      /\bwireless presentation receiver\b/,
      /\bwireless casting receiver\b/,
    ]);

  if (isWirelessCasting) {
    headings.add("Wireless Casting");
  }

  // The AVoIP filter is the governed NetworkHD family. Descriptions that merely
  // mention an AVoIP application or alternative must not add this heading.
  if (isNetworkHd) {
    headings.add("AVoIP");
  }

  const isVideoWall =
    ["NHD-0401-MV", "NHD-150-RX", "SW-0204-VW", "SW-0206-VW"].includes(sku) ||
    isVideoWallSku ||
    identityHas([
      /\bvideo wall processor\b/,
      /\bvideowall processor\b/,
      /\bmultiview processor\b/,
      /\bmulti-view processor\b/,
      /\bmultiview decoder\b/,
    ]);

  if (isVideoWall) {
    headings.add("Video Wall");
  }

  const isControl =
    /^SYN-TOUCH/.test(sku) ||
    /^NHD-(?:000-)?CTL/.test(sku) ||
    identityHas([
      /\btouch panel\b/,
      /\btouchpad controller\b/,
      /\bcontrol interface\b/,
      /\broom controller\b/,
      /\bav controller\b/,
    ]);

  if (isControl) {
    headings.add("Control");
  }

  return [...headings];
}
