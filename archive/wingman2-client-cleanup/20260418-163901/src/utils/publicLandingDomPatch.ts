type VisualElement = HTMLElement | SVGElement;

const HIDE_TEXTS = new Set<string>([
  "WINGMAN",
  "WYRESTORM TECHNICAL SALES CONSOLE",
  "WINGMAN SHELL",
  "DARK TECHNICAL WORKSPACE",
  "OPEN EXISTING WORKSPACE",
  "CORE FLOW",
  "Sales assist and room workflow live in one shell.",
  "Projects hold a thread from first note to final handoff.",
  "Guru stays available without taking over the page."
]);

const STYLE_ID = "wm-public-landing-dom-patch-style";

let installed = false;
let observer: MutationObserver | null = null;
let rafId = 0;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isLandingPath(): boolean {
  const raw = window.location.pathname || "/";
  const cleaned = raw.replace(/\/+$/, "") || "/";
  return cleaned === "/";
}

function readClassName(el: Element): string {
  const htmlClass = (el as HTMLElement).className;

  if (typeof htmlClass === "string") {
    return htmlClass.toLowerCase();
  }

  const svgClass = htmlClass as { baseVal?: string } | undefined;
  if (svgClass && typeof svgClass.baseVal === "string") {
    return svgClass.baseVal.toLowerCase();
  }

  return "";
}

function isVisibleElement(el: Element): el is VisualElement {
  if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return false;
  }

  const style = window.getComputedStyle(el);
  if (style.display === "none") {
    return false;
  }

  if (style.visibility === "hidden") {
    return false;
  }

  const opacity = Number.parseFloat(style.opacity || "1");
  if (opacity === 0) {
    return false;
  }

  return true;
}

function mark(el: Element | null, attrName: string): void {
  if (!el) {
    return;
  }

  el.setAttribute(attrName, "true");
}

function injectStyles(): void {
  const existing = document.getElementById(STYLE_ID);
  if (existing) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-wm-landing-shell] {
      width: min(1480px, calc(100vw - 56px)) !important;
      max-width: 1480px !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }

    [data-wm-landing-grid] {
      display: grid !important;
      grid-template-columns: minmax(0, 1.55fr) minmax(360px, 0.95fr) !important;
      gap: 20px !important;
      align-items: start !important;
      justify-content: stretch !important;
      width: 100% !important;
      max-width: none !important;
    }

    [data-wm-landing-grid] > * {
      min-width: 0 !important;
    }

    [data-wm-landing-hero],
    [data-wm-landing-side] {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
    }

    [data-wm-landing-side] {
      align-self: stretch !important;
    }

    [data-wm-logo-scaled] {
      max-width: none !important;
      height: auto !important;
      object-fit: contain !important;
      transform-origin: left center !important;
      flex: 0 0 auto !important;
      position: relative !important;
      z-index: 2 !important;
    }

    @media (max-width: 1180px) {
      [data-wm-landing-grid] {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function hideElement(el: HTMLElement): void {
  el.style.setProperty("display", "none", "important");
  el.style.setProperty("visibility", "hidden", "important");
  el.style.setProperty("width", "0", "important");
  el.style.setProperty("height", "0", "important");
  el.style.setProperty("min-width", "0", "important");
  el.style.setProperty("min-height", "0", "important");
  el.style.setProperty("margin", "0", "important");
  el.style.setProperty("padding", "0", "important");
  el.style.setProperty("border", "0", "important");
}

function hideExactTextElements(): void {
  const selector = [
    "span",
    "div",
    "p",
    "small",
    "strong",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "a",
    "button"
  ].join(",");

  const nodes = Array.from(document.body.querySelectorAll(selector));

  nodes.forEach((node) => {
    const el = node as HTMLElement;
    if (!isVisibleElement(el)) {
      return;
    }

    const text = normalizeText(el.innerText || el.textContent || "");
    if (!HIDE_TEXTS.has(text)) {
      return;
    }

    const tag = el.tagName.toLowerCase();
    const isAction = tag === "a" || tag === "button";

    if (!isAction && el.children.length > 0) {
      return;
    }

    hideElement(el);
  });
}

function scoreLogoCandidate(el: VisualElement): number {
  const rect = el.getBoundingClientRect();
  const className = readClassName(el);
  const style = window.getComputedStyle(el);

  let score = 0;
  score += rect.top * 12;
  score += rect.left * 2;
  score += Math.abs(rect.width - 80);
  score += Math.abs(rect.height - 28);

  if (el.tagName.toLowerCase() === "img") {
    score -= 120;
  }

  if (el.tagName.toLowerCase() === "svg") {
    score -= 80;
  }

  if (className.includes("logo")) {
    score -= 180;
  }

  if (className.includes("brand")) {
    score -= 120;
  }

  if (className.includes("mark")) {
    score -= 80;
  }

  if (style.backgroundImage && style.backgroundImage !== "none") {
    score -= 60;
  }

  return score;
}

function findTopLeftLogo(): VisualElement | null {
  const nodes = Array.from(document.body.querySelectorAll("*"));

  const candidates = nodes
    .filter(isVisibleElement)
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      const className = readClassName(el);
      const style = window.getComputedStyle(el);
      const tag = el.tagName.toLowerCase();

      if (rect.top > 220) {
        return false;
      }

      if (rect.left > 540) {
        return false;
      }

      if (rect.width < 10 || rect.height < 8) {
        return false;
      }

      if (rect.width > 360 || rect.height > 180) {
        return false;
      }

      if (tag === "img" || tag === "svg") {
        return true;
      }

      if (className.includes("logo") || className.includes("brand") || className.includes("mark")) {
        return true;
      }

      if (style.backgroundImage && style.backgroundImage !== "none") {
        return true;
      }

      return false;
    })
    .sort((a, b) => scoreLogoCandidate(a) - scoreLogoCandidate(b));

  if (candidates.length === 0) {
    return null;
  }

  return candidates[0] ?? null;
}

function scaleLogo(logo: VisualElement): void {
  if (logo.getAttribute("data-wm-logo-scaled") === "true") {
    return;
  }

  const rect = logo.getBoundingClientRect();
  const targetWidth = Math.max(Math.round(rect.width * 2), 110);

  logo.style.setProperty("width", `${targetWidth}px`, "important");
  logo.style.setProperty("max-width", "none", "important");
  logo.style.setProperty("height", "auto", "important");
  logo.style.setProperty("min-width", `${targetWidth}px`, "important");
  logo.setAttribute("data-wm-logo-scaled", "true");
  mark(logo, "data-wm-logo-scaled");

  const parent = logo.parentElement;
  if (!parent) {
    return;
  }

  parent.style.setProperty("display", "flex", "important");
  parent.style.setProperty("align-items", "center", "important");
  parent.style.setProperty("gap", "12px", "important");
}

function findTextContainerIncluding(sample: string): HTMLElement | null {
  const selector = [
    "h1",
    "h2",
    "h3",
    "h4",
    "div",
    "p",
    "span",
    "a",
    "button"
  ].join(",");

  const nodes = Array.from(document.body.querySelectorAll(selector));

  for (const node of nodes) {
    const el = node as HTMLElement;

    if (!isVisibleElement(el)) {
      continue;
    }

    const text = normalizeText(el.innerText || el.textContent || "");
    if (!text.includes(sample)) {
      continue;
    }

    return el;
  }

  return null;
}

function closestSurface(start: Element | null): HTMLElement | null {
  let current = start;

  while (current && current !== document.body) {
    if (current instanceof HTMLElement) {
      const rect = current.getBoundingClientRect();
      const style = window.getComputedStyle(current);

      if (rect.width >= 280 && rect.height >= 180 && style.display !== "inline") {
        return current;
      }
    }

    current = current.parentElement;
  }

  return null;
}

function closestSharedAncestor(a: HTMLElement | null, b: HTMLElement | null): HTMLElement | null {
  if (!a || !b) {
    return null;
  }

  const visited = new Set<HTMLElement>();
  let currentA: HTMLElement | null = a;

  while (currentA) {
    visited.add(currentA);
    currentA = currentA.parentElement;
  }

  let currentB: HTMLElement | null = b;
  while (currentB) {
    if (visited.has(currentB)) {
      return currentB;
    }

    currentB = currentB.parentElement;
  }

  return null;
}

function findWideAncestor(start: HTMLElement | null): HTMLElement | null {
  let current = start;
  let best: HTMLElement | null = start;

  while (current) {
    const rect = current.getBoundingClientRect();

    if (rect.width >= 1100 && rect.height >= 320) {
      best = current;
      break;
    }

    current = current.parentElement;
  }

  return best;
}

function markLayout(): void {
  const headingNode = findTextContainerIncluding("One operating surface for");
  const ctaNode = findTextContainerIncluding("CREATE YOUR WORKSPACE");

  const heroCard = closestSurface(headingNode);
  const sideCard = closestSurface(ctaNode);
  const shared = closestSharedAncestor(heroCard, sideCard);
  const shell = findWideAncestor(shared);

  mark(heroCard, "data-wm-landing-hero");
  mark(sideCard, "data-wm-landing-side");
  mark(shared, "data-wm-landing-grid");
  mark(shell, "data-wm-landing-shell");
}

function applyPatch(): void {
  if (!isLandingPath()) {
    return;
  }

  injectStyles();
  hideExactTextElements();

  const logo = findTopLeftLogo();
  if (logo) {
    scaleLogo(logo);
  }

  markLayout();
}

function scheduleApply(): void {
  if (rafId) {
    window.cancelAnimationFrame(rafId);
  }

  rafId = window.requestAnimationFrame(() => {
    rafId = 0;
    applyPatch();
  });
}

export function installPublicLandingDomPatch(): void {
  if (installed) {
    return;
  }

  installed = true;

  const start = () => {
    if (!document.body) {
      window.setTimeout(start, 50);
      return;
    }

    scheduleApply();

    observer = new MutationObserver(() => {
      scheduleApply();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    window.addEventListener("load", scheduleApply);
    window.addEventListener("popstate", scheduleApply);
  };

  start();
}