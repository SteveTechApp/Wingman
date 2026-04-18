declare global {
  interface Window {
    __wmPublicLandingCleanupInstalled?: boolean;
    __wmPublicLandingCleanupTeardown?: () => void;
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isPublicLanding(): boolean {
  const path = window.location.pathname.toLowerCase();
  return path === "/" || path === "/home" || path === "/landing";
}

function hideElement(element: Element | null | undefined): void {
  if (!(element instanceof HTMLElement)) return;
  element.style.display = "none";
  element.setAttribute("aria-hidden", "true");
  element.dataset.wmLandingHidden = "true";
}

function getTextCandidates(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,span,div,section,article,button,a")
  );
}

function findFirstExactText(text: string): HTMLElement | null {
  const target = normalizeText(text);

  for (const element of getTextCandidates()) {
    const own = normalizeText(element.textContent);
    if (own === target) return element;
  }

  return null;
}

function findFirstContainingText(text: string): HTMLElement | null {
  const target = normalizeText(text);

  for (const element of getTextCandidates()) {
    const own = normalizeText(element.textContent);
    if (own.includes(target)) return element;
  }

  return null;
}

function findCompositePanel(texts: string[]): HTMLElement | null {
  const targets = texts.map((item) => normalizeText(item));
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section,article,div"));

  let best: HTMLElement | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const text = normalizeText(candidate.innerText || candidate.textContent || "");
    const allMatch = targets.every((token) => text.includes(token));
    if (!allMatch) continue;

    const rect = candidate.getBoundingClientRect();
    const area = rect.width * rect.height;

    if (rect.width < 180 || rect.height < 120) continue;
    if (area < bestArea) {
      best = candidate;
      bestArea = area;
    }
  }

  return best;
}

function findHeroHeading(): HTMLElement | null {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1,h2"));
  for (const heading of headings) {
    const text = normalizeText(heading.textContent);
    if (text.includes("one operating surface for")) return heading;
  }
  return null;
}

function markHeroAndMain(): void {
  const heroHeading = findHeroHeading();
  if (!(heroHeading instanceof HTMLElement)) return;

  const heroBlock = heroHeading.closest<HTMLElement>("section,article,div");
  if (!(heroBlock instanceof HTMLElement)) return;

  heroBlock.classList.add("wm-public-landing-clean-hero");

  const grid = heroBlock.parentElement;
  if (grid instanceof HTMLElement) {
    grid.classList.add("wm-public-landing-clean-grid");
  }

  const main = heroBlock.closest<HTMLElement>("main") ?? grid ?? heroBlock.parentElement;
  if (main instanceof HTMLElement) {
    main.classList.add("wm-public-landing-clean-main");
  }
}

function cloneBrandIntoHero(): void {
  const heroHeading = findHeroHeading();
  if (!(heroHeading instanceof HTMLElement)) return;

  const heroBlock = heroHeading.closest<HTMLElement>("section,article,div");
  if (!(heroBlock instanceof HTMLElement)) return;

  if (heroBlock.querySelector(".wm-public-landing-clean-brand")) return;

  const sourceImg =
    document.querySelector<HTMLImageElement>('.wm-topbar img[alt*="wingman" i], header img[alt*="wingman" i], img[alt*="wingman" i]') ??
    document.querySelector<HTMLImageElement>('img[src*="wyrestorm" i], img[src*="wingman" i]');

  if (!(sourceImg instanceof HTMLImageElement)) return;

  const sourceBrand =
    sourceImg.closest<HTMLElement>(".wm-topbar__brand, .wm-brand-lockup, [class*='topbar__brand'], [class*='brand-lockup']") ??
    sourceImg.closest<HTMLElement>("a,div");

  if (sourceBrand instanceof HTMLElement) {
    sourceBrand.classList.add("wm-public-landing-hide-brand-source");
  }

  const wrapper = document.createElement("div");
  wrapper.className = "wm-public-landing-clean-brand";

  const img = document.createElement("img");
  img.src = sourceImg.currentSrc || sourceImg.src;
  img.alt = "Wingman";
  img.draggable = false;
  img.className = "wm-public-landing-clean-brand-image";

  wrapper.appendChild(img);
  heroBlock.insertBefore(wrapper, heroBlock.firstChild);
}

function removePrimaryLandingCta(): void {
  const ctaTexts = ["create workspace", "create your workspace"];

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("button,a"));

  for (const candidate of candidates) {
    const text = normalizeText(candidate.textContent);
    if (!ctaTexts.includes(text)) continue;
    hideElement(candidate);
  }
}

function removeRightPanel(): void {
  const panel = findCompositePanel([
    "sales assist",
    "room workflow",
    "create your workspace",
  ]);

  hideElement(panel);
}

function removeOperatorGuidanceHeading(): void {
  const heading = findFirstContainingText("designed to keep the operator moving in the right order");
  hideElement(heading);
}

function hideBottomStripForCard(titleText: string): void {
  const title = findFirstExactText(titleText);
  if (!(title instanceof HTMLElement)) return;

  const card = title.closest<HTMLElement>("article,section,div");
  if (!(card instanceof HTMLElement)) return;

  const cardRect = card.getBoundingClientRect();
  const children = Array.from(card.children).filter((child): child is HTMLElement => child instanceof HTMLElement);

  let target: HTMLElement | null = null;

  for (const child of children) {
    const rect = child.getBoundingClientRect();
    const nearBottom = rect.top >= cardRect.top + cardRect.height * 0.58;
    const compact = rect.height <= 64;
    if (nearBottom && compact) {
      target = child;
    }
  }

  hideElement(target);
}

function removeMarkedLandingClutter(): void {
  removeRightPanel();
  removePrimaryLandingCta();
  removeOperatorGuidanceHeading();
  hideBottomStripForCard("Find the path");
  hideBottomStripForCard("Discovery");
  hideBottomStripForCard("Ship the proposal");
}

function syncPublicLandingCleanup(): void {
  if (!isPublicLanding()) {
    document.documentElement.removeAttribute("data-wm-public-landing-clean");
    document.body.removeAttribute("data-wm-public-landing-clean");
    return;
  }

  document.documentElement.setAttribute("data-wm-public-landing-clean", "true");
  document.body.setAttribute("data-wm-public-landing-clean", "true");

  markHeroAndMain();
  cloneBrandIntoHero();
  removeMarkedLandingClutter();
}

export function installPublicLandingCleanup(): () => void {
  if (typeof window === "undefined") return () => {};
  if (typeof document === "undefined") return () => {};

  if (window.__wmPublicLandingCleanupInstalled) {
    return window.__wmPublicLandingCleanupTeardown ?? (() => {});
  }

  const sync = () => {
    syncPublicLandingCleanup();
  };

  const observer = new MutationObserver(() => {
    sync();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
  window.addEventListener("resize", sync);

  sync();

  const cleanup = () => {
    observer.disconnect();
    window.removeEventListener("popstate", sync);
    window.removeEventListener("hashchange", sync);
    window.removeEventListener("resize", sync);
    window.__wmPublicLandingCleanupInstalled = false;
    window.__wmPublicLandingCleanupTeardown = undefined;
  };

  window.__wmPublicLandingCleanupInstalled = true;
  window.__wmPublicLandingCleanupTeardown = cleanup;

  return cleanup;
}

export default installPublicLandingCleanup;