const TEMPLATES_PATH_PATTERN = /(?:^|\/)(wingman\/templates|wingman\/room-templates|app\/tools\/templates|templates|room-templates)(?:\/|$)/i;

const BODY_CLASS = "wm-templates-landing-density";
const MAIN_CLASS = "wm-templates-density-main";
const ROOT_CLASS = "wm-templates-density-root";
const CARD_CLASS = "wm-templates-density-card";
const HERO_CLASS = "wm-templates-density-hero";

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isTemplatesPath(): boolean {
  return TEMPLATES_PATH_PATTERN.test(window.location.pathname);
}

function clearMarks(): void {
  document.body.classList.remove(BODY_CLASS);

  document.querySelectorAll(`.${MAIN_CLASS}`).forEach((element) => {
    element.classList.remove(MAIN_CLASS);
  });

  document.querySelectorAll(`.${ROOT_CLASS}`).forEach((element) => {
    element.classList.remove(ROOT_CLASS);
  });

  document.querySelectorAll(`.${CARD_CLASS}`).forEach((element) => {
    element.classList.remove(CARD_CLASS);
  });

  document.querySelectorAll(`.${HERO_CLASS}`).forEach((element) => {
    element.classList.remove(HERO_CLASS);
  });
}

function findMain(): HTMLElement | null {
  const main = document.querySelector("main");

  if (main instanceof HTMLElement) {
    return main;
  }

  return null;
}

function markRoot(main: HTMLElement): HTMLElement {
  main.classList.add(MAIN_CLASS);

  const directChildren = Array.from(main.children).filter((element) => element instanceof HTMLElement) as HTMLElement[];

  const bestChild =
    directChildren.find((element) => normalize(element.textContent).toLowerCase().includes("template")) ??
    directChildren[0] ??
    main;

  bestChild.classList.add(ROOT_CLASS);

  return bestChild;
}

function markHero(root: HTMLElement): void {
  const headings = Array.from(root.querySelectorAll("h1, h2, h3"));

  for (const heading of headings) {
    const text = normalize(heading.textContent).toLowerCase();

    if (!text.includes("template")) {
      continue;
    }

    let cursor: HTMLElement | null = heading instanceof HTMLElement ? heading.parentElement : null;

    for (let index = 0; index < 6; index += 1) {
      if (!cursor) {
        return;
      }

      const rect = cursor.getBoundingClientRect();

      if (rect.width > 360 && rect.height > 40) {
        cursor.classList.add(HERO_CLASS);
        return;
      }

      cursor = cursor.parentElement;
    }
  }
}

function looksLikeTemplateCard(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const text = normalize(element.textContent).toLowerCase();

  if (!text) {
    return false;
  }

  if (!text.includes("template") && !text.includes("meeting") && !text.includes("classroom") && !text.includes("boardroom") && !text.includes("training")) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width < 120 || rect.height < 50) {
    return false;
  }

  if (element.closest("aside, nav, header")) {
    return false;
  }

  return true;
}

function markCards(root: HTMLElement): void {
  const candidates = root.querySelectorAll("article, section, button, a, li, div[class*='card'], div[class*='Card'], div[class*='template'], div[class*='Template']");

  candidates.forEach((element) => {
    if (!looksLikeTemplateCard(element)) {
      return;
    }

    element.classList.add(CARD_CLASS);
  });
}

function applyTemplatesDensity(): void {
  clearMarks();

  if (!isTemplatesPath()) {
    return;
  }

  const main = findMain();

  if (!main) {
    return;
  }

  document.body.classList.add(BODY_CLASS);

  const root = markRoot(main);
  markHero(root);
  markCards(root);
}

let refreshTimer = 0;

function scheduleRefresh(): void {
  if (refreshTimer) {
    return;
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0;
    applyTemplatesDensity();
  }, 80);
}

function patchHistoryEvents(): void {
  const historyWithPatchFlag = window.history as History & {
    __wmTemplatesLandingDensityPatched?: boolean;
  };

  if (historyWithPatchFlag.__wmTemplatesLandingDensityPatched) {
    return;
  }

  historyWithPatchFlag.__wmTemplatesLandingDensityPatched = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithTemplatesDensity(...args: Parameters<History["pushState"]>) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };

  window.history.replaceState = function replaceStateWithTemplatesDensity(...args: Parameters<History["replaceState"]>) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  patchHistoryEvents();

  window.addEventListener("popstate", scheduleRefresh);
  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener("wm:navigation", scheduleRefresh);
  window.addEventListener("DOMContentLoaded", scheduleRefresh);

  const observer = new MutationObserver(scheduleRefresh);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scheduleRefresh();
}

export {};
