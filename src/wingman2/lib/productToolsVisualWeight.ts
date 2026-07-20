const PRODUCT_TOOL_TITLES = new Set([
  "Browse Catalogue",
  "Explore Product Families",
  "Search a Known SKU",
  "Compare a Competitor",
  "Product Dashboard",
  "Add to Response Pack",
]);

const CARD_ATTRIBUTE = "data-wingman-product-tool-card";
const ART_ATTRIBUTE = "data-wingman-product-tool-art";
const TITLE_SELECTOR = "h1, h2, h3, h4, strong, [role='heading'], span, p";

type WingmanVisualWeightWindow = Window & {
  __wingmanProductToolsVisualWeightInstalled?: boolean;
};

function normaliseText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function classText(element: Element) {
  return normaliseText(element.getAttribute("class"));
}

function renderedArea(element: Element) {
  const rect = element.getBoundingClientRect();
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function looksLikeCard(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const svgCount = element.querySelectorAll("svg").length;
  const classHint = /card|tile|action|option|route|tool|hub/i.test(classText(element));
  const interactive = element.matches("a, button, [role='link']");
  const sensibleSize = rect.width >= 260 && rect.height >= 100 && rect.height <= 520;

  return sensibleSize && svgCount >= 2 && (classHint || interactive);
}

function findCard(titleElement: HTMLElement) {
  let current = titleElement.parentElement;
  let fallback: HTMLElement | null = null;
  let depth = 0;

  while (current && current !== document.body && depth < 12) {
    const rect = current.getBoundingClientRect();
    const sensibleSize = rect.width >= 260 && rect.height >= 100 && rect.height <= 520;
    const svgCount = current.querySelectorAll("svg").length;

    if (!fallback && sensibleSize && svgCount >= 2) {
      fallback = current;
    }

    if (looksLikeCard(current)) {
      return current;
    }

    current = current.parentElement;
    depth += 1;
  }

  return fallback;
}

function findArtworkHost(svg: SVGElement, card: HTMLElement) {
  let current: HTMLElement | null = svg.parentElement;
  let fallback: HTMLElement | SVGElement = svg;
  let depth = 0;

  while (current && current !== card && depth < 5) {
    const styles = window.getComputedStyle(current);
    const hint = /art|graphic|illustration|visual|watermark|decor/i.test(classText(current));

    fallback = current;

    if (hint || styles.position === "absolute" || styles.position === "fixed") {
      return current;
    }

    current = current.parentElement;
    depth += 1;
  }

  return fallback;
}

function markCard(card: HTMLElement) {
  if (card.getAttribute(CARD_ATTRIBUTE) !== "true") {
    card.setAttribute(CARD_ATTRIBUTE, "true");
  }

  const svgs = Array.from(card.querySelectorAll<SVGElement>("svg"));

  if (svgs.length < 2) {
    return;
  }

  const artworkSvg = svgs
    .map((svg) => ({ svg, area: renderedArea(svg) }))
    .sort((left, right) => right.area - left.area)[0]?.svg;

  if (!artworkSvg) {
    return;
  }

  const artworkHost = findArtworkHost(artworkSvg, card);

  if (artworkHost.getAttribute(ART_ATTRIBUTE) !== "true") {
    artworkHost.setAttribute(ART_ATTRIBUTE, "true");
  }

  if (artworkSvg.getAttribute(ART_ATTRIBUTE) !== "true") {
    artworkSvg.setAttribute(ART_ATTRIBUTE, "true");
  }
}

function scanProductToolCards() {
  const titleElements = Array.from(document.querySelectorAll<HTMLElement>(TITLE_SELECTOR));

  for (const titleElement of titleElements) {
    const title = normaliseText(titleElement.textContent);

    if (!PRODUCT_TOOL_TITLES.has(title)) {
      continue;
    }

    const card = findCard(titleElement);

    if (card) {
      markCard(card);
    }
  }
}

function installProductToolsVisualWeight() {
  const targetWindow = window as WingmanVisualWeightWindow;

  if (targetWindow.__wingmanProductToolsVisualWeightInstalled) {
    return;
  }

  targetWindow.__wingmanProductToolsVisualWeightInstalled = true;

  let scanQueued = false;

  const queueScan = () => {
    if (scanQueued) {
      return;
    }

    scanQueued = true;

    window.requestAnimationFrame(() => {
      scanQueued = false;
      scanProductToolCards();
    });
  };

  queueScan();

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("popstate", queueScan);
  window.addEventListener("hashchange", queueScan);
  window.addEventListener("resize", queueScan);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installProductToolsVisualWeight, { once: true });
}

if (document.readyState !== "loading") {
  installProductToolsVisualWeight();
}
