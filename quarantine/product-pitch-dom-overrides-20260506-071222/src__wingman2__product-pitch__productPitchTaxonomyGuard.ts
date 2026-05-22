type GuardClassification = {
  family: string;
  aliases: string[];
};

function wmTaxText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function wmTaxUpper(value: string | null | undefined): string {
  return wmTaxText(value).toUpperCase();
}

function wmTaxSkuFromText(value: string | null | undefined): string {
  const prepared = wmTaxUpper(value)
    .replace(/\bHALO\s+(\d+)/g, "HALO-$1")
    .replace(/\bNETWORKHD\s+/g, "NHD-");

  const match = prepared.match(/\b(?:AMP|APO|CAB|CAM|COM|EX|EX3|EXP-MX|HALO|IDB|M4250|M4300|MV|MX|MXV|NHD|RX3|SPK|SW|SWX)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/);

  return wmTaxText(match?.[0]);
}

function wmClassifySku(sku: string): GuardClassification {
  const code = wmTaxUpper(sku);

  if (/^AMP-/.test(code)) return { family: "Amplifier", aliases: ["amplifier", "audio"] };
  if (/^APO-/.test(code)) return { family: "Apollo", aliases: ["apollo", "presentation / uc", "unified comms", "uc"] };
  if (/^HALO-WFA/.test(code)) return { family: "Camera", aliases: ["camera", "capture"] };
  if (/^HALO-/.test(code)) return { family: "HALO", aliases: ["halo", "audio / uc", "unified comms", "uc"] };
  if (/^CAM-/.test(code)) return { family: "Camera", aliases: ["camera", "capture"] };
  if (/^CAB-/.test(code)) return { family: "Cable", aliases: ["cable", "cables"] };
  if (/^IDB-/.test(code)) return { family: "Cable Management", aliases: ["cable management", "accessory"] };
  if (/^(M4250|M4300)-/.test(code)) return { family: "Network Switch", aliases: ["network switch", "network infrastructure"] };

  if (code === "NHD-0401-MV") return { family: "NetworkHD 500", aliases: ["networkhd", "networkhd 500", "avoip", "av-over-ip"] };
  if (/^NHD-(000|CTL|TOUCH|USB)/.test(code) || code.includes("RACK")) return { family: "NetworkHD Accessory", aliases: ["networkhd", "networkhd accessory", "avoip", "av-over-ip"] };
  if (/^NHD-(110|120|124|128|140|150)/.test(code)) return { family: "NetworkHD 100", aliases: ["networkhd", "networkhd 100", "avoip", "av-over-ip"] };
  if (/^NHD-250/.test(code)) return { family: "NetworkHD 200", aliases: ["networkhd", "networkhd 200", "avoip", "av-over-ip"] };
  if (/^NHD-(300|400)/.test(code)) return { family: "NetworkHD 400", aliases: ["networkhd", "networkhd 400", "avoip", "av-over-ip"] };
  if (/^NHD-5/.test(code)) return { family: "NetworkHD 500", aliases: ["networkhd", "networkhd 500", "avoip", "av-over-ip"] };
  if (/^NHD-6|^NHD-610/.test(code)) return { family: "NetworkHD 600", aliases: ["networkhd", "networkhd 600", "avoip", "av-over-ip"] };
  if (/^NHD-/.test(code)) return { family: "NetworkHD", aliases: ["networkhd", "avoip", "av-over-ip"] };

  if (/^MV-/.test(code)) return { family: "Multiview Processor", aliases: ["multiview", "video processing", "processor"] };
  if (/^SWX-/.test(code)) return { family: "Extender", aliases: ["extender", "extension", "hdbaset"] };
  if (/^SW-.*VW/.test(code)) return { family: "Video Wall Processor", aliases: ["video wall", "processor"] };
  if (/^SW-/.test(code)) return { family: "Presentation Switcher", aliases: ["presentation switcher", "presentation / room core", "room core"] };
  if (/^(EX|EX3|RX3)-/.test(code)) return { family: "Extender", aliases: ["extender", "extension", "hdbaset"] };

  if (/^(MX|MXV|EXP-MX)-/.test(code) && code.includes("SCL")) {
    return { family: "Seamless Matrix", aliases: ["seamless matrix", "matrix"] };
  }

  if (/^(MX|MXV|EXP-MX)-/.test(code) && code.includes("MST")) {
    return { family: "Presentation Switcher", aliases: ["presentation switcher", "room core", "mst"] };
  }

  if (/^(MX|MXV|EXP-MX)-/.test(code) && (code.includes("H2A") || code.includes("HDBT"))) {
    return { family: "HDBaseT Matrix", aliases: ["hdbaset matrix", "matrix", "hdbaset"] };
  }

  if (/^(MX|MXV|EXP-MX)-/.test(code)) {
    return { family: "Matrix", aliases: ["matrix"] };
  }

  if (/^SPK-/.test(code)) return { family: "Speaker", aliases: ["speaker", "audio"] };

  return { family: "Unclassified", aliases: ["unclassified"] };
}

function wmIsProductPitchPage(): boolean {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("product-pitch")) return true;

  return wmTaxText(document.body.textContent).toLowerCase().includes("create a one-page wyrestorm product pitch");
}

function wmFindProductFamilySelect(): HTMLSelectElement | null {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));

  return selects.find((select) => {
    const optionsText = Array.from(select.options).map((option) => wmTaxText(option.textContent || option.value).toLowerCase()).join(" ");
    const selectContext = wmTaxText([
      select.getAttribute("aria-label"),
      select.name,
      select.id,
      select.closest("label")?.textContent,
      select.parentElement?.textContent,
    ].filter(Boolean).join(" ")).toLowerCase();

    if (selectContext.includes("pitch audience")) return false;
    if (optionsText.includes("trade") && optionsText.includes("technical")) return false;

    if (selectContext.includes("product family")) return true;
    if (optionsText.includes("networkhd") && optionsText.includes("apollo")) return true;
    if (optionsText.includes("matrix") && optionsText.includes("camera")) return true;

    return false;
  }) ?? null;
}

function wmSelectedFamilyFilter(): string {
  const select = wmFindProductFamilySelect();

  if (!select) return "";

  const label = wmTaxText(select.selectedOptions?.[0]?.textContent || select.value);

  if (!label) return "";
  if (label.toLowerCase() === "all") return "";
  if (label.toLowerCase().includes("any")) return "";

  return label;
}

function wmFindChooseProductSection(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section,article,div")).filter((element) => {
    const content = wmTaxText(element.textContent).toLowerCase();

    return content.includes("choose the product") && content.includes("pitch setup");
  });

  candidates.sort((a, b) => wmTaxText(a.textContent).length - wmTaxText(b.textContent).length);

  return candidates[0] ?? null;
}

function wmLooksLikeProductCard(element: HTMLElement): boolean {
  const content = wmTaxText(element.textContent);

  if (content.length < 8) return false;
  if (content.length > 300) return false;
  if (!wmTaxSkuFromText(content)) return false;

  const tag = element.tagName.toLowerCase();
  const className = String(element.className || "").toLowerCase();

  if (tag === "button") return true;
  if (element.getAttribute("role") === "button") return true;
  if (tag === "article") return true;
  if (className.includes("card")) return true;
  if (className.includes("product")) return true;

  return false;
}

function wmGetProductCards(section: HTMLElement): HTMLElement[] {
  const cards = Array.from(section.querySelectorAll<HTMLElement>("button,[role='button'],article,div")).filter(wmLooksLikeProductCard);

  return cards.filter((card) => {
    return !cards.some((other) => other !== card && other.contains(card));
  });
}

function wmFamilyMatchesFilter(classification: GuardClassification, selectedFamily: string): boolean {
  const filter = selectedFamily.toLowerCase();

  if (!filter) return true;

  if (classification.family.toLowerCase() === filter) return true;

  return classification.aliases.some((alias) => alias.toLowerCase() === filter || alias.toLowerCase().includes(filter) || filter.includes(alias.toLowerCase()));
}

function wmReplaceCardFamilyLabel(card: HTMLElement, family: string): void {
  const leaves = Array.from(card.querySelectorAll<HTMLElement>("span,p,small,div")).filter((element) => {
    if (element.children.length > 0) return false;

    const value = wmTaxText(element.textContent);

    if (!value) return false;
    if (value.length > 40) return false;

    return true;
  });

  const familyWords = [
    "networkhd",
    "networkhd avoip",
    "unified comms",
    "presentation / room core",
    "audio / control",
    "camera / capture",
    "extender / hdbaset",
    "accessory",
    "video processor",
  ];

  const target = leaves.find((leaf) => {
    const value = wmTaxText(leaf.textContent).toLowerCase();

    return familyWords.includes(value);
  });

  if (target) {
    target.textContent = family;
    target.classList.add("wm-taxonomy-corrected-family-label");
    return;
  }

  const badge = document.createElement("div");
  badge.className = "wm-taxonomy-corrected-family-label";
  badge.textContent = family;
  card.appendChild(badge);
}

function wmReconcileProductPitchTaxonomy(): void {
  if (!wmIsProductPitchPage()) return;

  const section = wmFindChooseProductSection();

  if (!section) return;

  const selectedFamily = wmSelectedFamilyFilter();
  const cards = wmGetProductCards(section);

  cards.forEach((card) => {
    const sku = wmTaxSkuFromText(card.textContent);
    const classification = wmClassifySku(sku);
    const matches = wmFamilyMatchesFilter(classification, selectedFamily);

    card.dataset.wmCorrectSku = sku;
    card.dataset.wmCorrectFamily = classification.family;

    wmReplaceCardFamilyLabel(card, classification.family);

    if (selectedFamily && !matches) {
      card.classList.add("wm-taxonomy-filter-hidden");
      card.hidden = true;
      card.style.setProperty("display", "none", "important");
      return;
    }

    card.classList.remove("wm-taxonomy-filter-hidden");
    card.hidden = false;
    card.style.removeProperty("display");
    card.style.removeProperty("visibility");
  });
}

let wmTaxonomyQueued = false;

function wmScheduleTaxonomyReconcile(): void {
  if (wmTaxonomyQueued) return;

  wmTaxonomyQueued = true;

  window.requestAnimationFrame(() => {
    wmTaxonomyQueued = false;
    wmReconcileProductPitchTaxonomy();
  });
}

export function installProductPitchTaxonomyGuard(): void {
  if (typeof window === "undefined") return;

  const installed = document.body.dataset.wmProductPitchTaxonomyGuardInstalled === "true";

  if (installed) return;

  document.body.dataset.wmProductPitchTaxonomyGuardInstalled = "true";

  document.addEventListener("change", wmScheduleTaxonomyReconcile, true);
  document.addEventListener("input", wmScheduleTaxonomyReconcile, true);
  /* Click listener removed: it was collapsing native select dropdowns. */

  const observer = new MutationObserver(wmScheduleTaxonomyReconcile);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wmScheduleTaxonomyReconcile, { once: true });
    return;
  }

  wmScheduleTaxonomyReconcile();
}