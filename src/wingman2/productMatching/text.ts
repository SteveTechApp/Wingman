import type { FinderNeed, FinderProduct } from "./types";

export function cleanDisplayText(value: unknown) {
  return String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/&#x2122;|&#8482;|&trade;/gi, " TM ")
    .replace(/&#x00ae;|&#174;|&reg;/gi, " R ")
    .replace(/&#x2013;|&#8211;|&ndash;/gi, "-")
    .replace(/&#x2014;|&#8212;|&mdash;/gi, "-")
    .replace(/&#x2018;|&#8216;|&lsquo;/gi, "'")
    .replace(/&#x2019;|&#8217;|&rsquo;/gi, "'")
    .replace(/&#x201c;|&#8220;|&ldquo;/gi, '"')
    .replace(/&#x201d;|&#8221;|&rdquo;/gi, '"')
    .replace(/&#x2022;|&#8226;|&bull;/gi, "-")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2022/g, "-")
    .replace(/[\u0080-\u024f]+/g, " ")
    .replace(/[^\u0020-\u007e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normaliseText(value: unknown) {
  return cleanDisplayText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function unique(values: string[]) {
  return Array.from(new Set(values.map(cleanDisplayText).filter(Boolean)));
}

export function textIncludesAny(text: string, terms: string[]) {
  const normalised = normaliseText(text);
  return terms.some((term) => normalised.includes(normaliseText(term)));
}

export function getFinderNeedText(need: FinderNeed) {
  return normaliseText(Object.values(need).join(" "));
}

export function getFinderMatchText(product: FinderProduct) {
  return normaliseText(
    `${product.sku} ${product.title} ${product.family} ${product.category} ${product.description} ${product.tags.join(" ")} ${product.searchText}`,
  );
}

export function productHasFeatureTerm(product: FinderProduct, term: string) {
  const text = ` ${getFinderMatchText(product)} `;
  const normalisedTerm = normaliseText(term);

  if (!normalisedTerm) return false;
  if (normalisedTerm.length <= 3 && !normalisedTerm.includes(" ")) {
    return text.includes(` ${normalisedTerm} `);
  }

  return text.includes(normalisedTerm);
}

export function productHasFeatureAny(product: FinderProduct, terms: string[]) {
  return terms.some((term) => productHasFeatureTerm(product, term));
}

export function productHasAllFeatureGroups(product: FinderProduct, termGroups: string[][]) {
  return termGroups.every((terms) => productHasFeatureAny(product, terms));
}

export function productHasAny(product: FinderProduct, terms: string[]) {
  return textIncludesAny(getFinderMatchText(product), terms);
}

export function cleanFinderProduct(product: FinderProduct): FinderProduct {
  return {
    ...product,
    sku: cleanDisplayText(product.sku),
    title: cleanDisplayText(product.title),
    family: cleanDisplayText(product.family),
    category: cleanDisplayText(product.category),
    description: cleanDisplayText(product.description),
    tags: unique(product.tags),
    searchText: cleanDisplayText(product.searchText),
  };
}

export function classifyProduct(product: FinderProduct) {
  const text = normaliseText(`${product.sku} ${product.title} ${product.description} ${product.searchText}`);

  if (textIncludesAny(text, ["video wall", "lcd wall", "wall processor", "sw 0206 vw", "sw 0204 vw"])) return "Video wall";
  if (textIncludesAny(text, ["ndi", "camera", "ptz", "cam"])) return "NDI / camera";
  if (textIncludesAny(text, ["networkhd", "nhd", "avoip", "av over ip", "encoder", "decoder", "transceiver"])) return "AVoIP";
  if (textIncludesAny(text, ["matrix", "routing", "mx 0404", "mx 0808", "mx 0812"])) return "Matrix / routing";
  if (textIncludesAny(text, ["hdbaset", "rx", "tx", "extender", "kvm"])) return "HDBaseT extender";
  if (textIncludesAny(text, ["wireless", "miracast", "airplay"])) return "Wireless presentation";
  if (textIncludesAny(text, ["usb", "conference", "byom", "byod", "speakerphone", "microphone"])) return "UC / conferencing";
  if (textIncludesAny(text, ["presentation", "switcher", "usb c", "sw"])) return "Presentation switcher";

  return product.category || "Other";
}
