/*
  Compare More button bridge.

  Visual/navigation helper:
  - Adds a "More" action to Compare product result cards.
  - Sends the user to the product positioning page with the SKU in the URL.
  - Does not change comparison ranking, role gating, or matching logic.
*/

declare global {
  interface Window {
    __wingmanCompareMoreButtonBridgeInstalled?: boolean;
  }
}

const PRODUCT_POSITIONING_ROUTE = "/wingman/product-pitch";
const WYRESTORM_SKU_PATTERN = /\b(?:NHD|MX|SW|EX|APO|CAM|SYN|CAB)-[A-Z0-9-]+\b/;

function isCompareRoute(): boolean {
  return window.location.pathname.toLowerCase().includes("/wingman/compare");
}

function normaliseText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractWyreStormSku(element: Element): string | null {
  const candidates = [
    element.getAttribute("data-sku"),
    element.getAttribute("data-product-sku"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.textContent,
  ];

  for (const candidate of candidates) {
    const match = normaliseText(candidate).match(WYRESTORM_SKU_PATTERN);

    if (match?.[0]) {
      return match[0];
    }
  }

  return null;
}

function buildProductPositioningUrl(sku: string): string {
  const params = new URLSearchParams();
  params.set("sku", sku);
  params.set("source", "compare");

  return `${PRODUCT_POSITIONING_ROUTE}?${params.toString()}`;
}

function isUsefulCompareProductCard(element: HTMLElement): boolean {
  if (element.classList.contains("compare-more-action-row")) {
    return false;
  }

  if (element.querySelector(".compare-product-more-action")) {
    return false;
  }

  const text = normaliseText(element.textContent);

  if (!WYRESTORM_SKU_PATTERN.test(text)) {
    return false;
  }

  if (element.closest("form")) {
    return false;
  }

  if (text.length > 3200) {
    return false;
  }

  if (
    text.includes("Best WyreStorm candidate") ||
    text.includes("PARTIAL MATCH") ||
    text.includes("GOOD MATCH") ||
    text.includes("VERIFY") ||
    text.includes("NO MATCH") ||
    element.classList.contains("compare-best-card") ||
    element.classList.contains("compare-option-card") ||
    element.classList.contains("compare-result-summary-card") ||
    element.classList.contains("compare-result-candidate-card")
  ) {
    return true;
  }

  return false;
}

function makeMoreButton(sku: string): HTMLAnchorElement {
  const link = document.createElement("a");

  link.className = "compare-product-more-action";
  link.href = buildProductPositioningUrl(sku);
  link.textContent = "More";
  link.setAttribute("aria-label", `Open product positioning support for ${sku}`);
  link.setAttribute("title", `Open product positioning support for ${sku}`);

  link.addEventListener("click", () => {
    try {
      window.sessionStorage.setItem("wingman:product-positioning-sku", sku);
      window.sessionStorage.setItem("wingman:product-positioning-source", "compare");
    } catch {
      // Session storage is a convenience only.
    }
  });

  return link;
}

function addMoreButtonToCard(card: HTMLElement): void {
  if (card.querySelector(".compare-product-more-action")) {
    return;
  }

  const sku = extractWyreStormSku(card);

  if (!sku) {
    return;
  }

  const actionRow = document.createElement("div");
  actionRow.className = "compare-more-action-row";
  actionRow.appendChild(makeMoreButton(sku));

  card.appendChild(actionRow);
}

function enhanceCompareMoreButtons(): void {
  if (!isCompareRoute()) {
    return;
  }

  const main = document.querySelector("main");

  if (!main) {
    return;
  }

  const cards = Array.from(
    main.querySelectorAll<HTMLElement>(
      ".compare-best-card, .compare-option-card, .compare-result-summary-card, .compare-result-candidate-card, section, article, div"
    )
  ).filter(isUsefulCompareProductCard);

  const selected: HTMLElement[] = [];

  for (const card of cards) {
    const isInsideSelected = selected.some((selectedCard) => selectedCard.contains(card));

    if (isInsideSelected) {
      continue;
    }

    selected.push(card);
    addMoreButtonToCard(card);
  }
}

function scheduleEnhance(): void {
  window.setTimeout(enhanceCompareMoreButtons, 50);
  window.setTimeout(enhanceCompareMoreButtons, 250);
  window.setTimeout(enhanceCompareMoreButtons, 700);
}

function install(): void {
  if (window.__wingmanCompareMoreButtonBridgeInstalled) {
    scheduleEnhance();
    return;
  }

  window.__wingmanCompareMoreButtonBridgeInstalled = true;

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
    const result = originalPushState(...args);
    scheduleEnhance();
    return result;
  }) as History["pushState"];

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
    const result = originalReplaceState(...args);
    scheduleEnhance();
    return result;
  }) as History["replaceState"];

  window.addEventListener("popstate", scheduleEnhance);
  window.addEventListener("hashchange", scheduleEnhance);
  document.addEventListener("DOMContentLoaded", scheduleEnhance);

  const observer = new MutationObserver(() => {
    scheduleEnhance();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  scheduleEnhance();
}

install();

export {};