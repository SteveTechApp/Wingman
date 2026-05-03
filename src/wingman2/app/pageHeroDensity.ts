const WINGMAN_PATH_PATTERN = /(?:^|\/)(wingman|app\/tools)(?:\/|$)/i;
const BODY_CLASS = "wm-page-hero-density-enabled";
const HERO_CLASS = "wm-page-hero-density";
const HERO_ACTION_CLASS = "wm-page-hero-action-density";
const HERO_TITLE_CLASS = "wm-page-hero-title-density";
const HERO_KICKER_CLASS = "wm-page-hero-kicker-density";
const HERO_SUBTITLE_CLASS = "wm-page-hero-subtitle-density";

const PAGE_TITLE_HINTS = [
  "dashboard",
  "project",
  "discovery",
  "product finder",
  "product families",
  "product pitch",
  "competitor",
  "room templates",
  "videowall",
  "video wall",
  "sales strategy",
  "live call cards",
  "document ingest",
  "proposal",
  "support",
  "guru"
];

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isWingmanPath(): boolean {
  return WINGMAN_PATH_PATTERN.test(window.location.pathname);
}

function removeMarks(): void {
  document.body.classList.remove(BODY_CLASS);

  document.querySelectorAll(`.${HERO_CLASS}`).forEach((element) => {
    element.classList.remove(HERO_CLASS);
  });

  document.querySelectorAll(`.${HERO_ACTION_CLASS}`).forEach((element) => {
    element.classList.remove(HERO_ACTION_CLASS);
  });

  document.querySelectorAll(`.${HERO_TITLE_CLASS}`).forEach((element) => {
    element.classList.remove(HERO_TITLE_CLASS);
  });

  document.querySelectorAll(`.${HERO_KICKER_CLASS}`).forEach((element) => {
    element.classList.remove(HERO_KICKER_CLASS);
  });

  document.querySelectorAll(`.${HERO_SUBTITLE_CLASS}`).forEach((element) => {
    element.classList.remove(HERO_SUBTITLE_CLASS);
  });
}

function hasPageTitleHint(text: string): boolean {
  const lower = text.toLowerCase();

  return PAGE_TITLE_HINTS.some((hint) => lower.includes(hint));
}

function getMain(): HTMLElement | null {
  const main = document.querySelector("main");

  if (main instanceof HTMLElement) {
    return main;
  }

  return null;
}

function scoreHeroCandidate(element: HTMLElement, heading: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const text = normalize(element.textContent);
  let score = 0;

  if (rect.top < 260) {
    score += 8;
  }

  if (rect.height <= 180) {
    score += 5;
  }

  if (rect.width >= 520) {
    score += 4;
  }

  if (element.querySelector("a, button")) {
    score += 3;
  }

  if (text.length <= 520) {
    score += 3;
  }

  if (hasPageTitleHint(text)) {
    score += 2;
  }

  if (heading.tagName.toLowerCase() === "h1") {
    score += 4;
  }

  return score;
}

function collectHeroCandidates(main: HTMLElement): Array<{ element: HTMLElement; heading: HTMLElement; score: number }> {
  const headings = Array.from(main.querySelectorAll("h1, h2"));

  const candidates: Array<{ element: HTMLElement; heading: HTMLElement; score: number }> = [];

  headings.forEach((heading) => {
    if (!(heading instanceof HTMLElement)) {
      return;
    }

    const headingText = normalize(heading.textContent);

    if (!headingText) {
      return;
    }

    if (headingText.length < 8) {
      return;
    }

    let cursor: HTMLElement | null = heading.parentElement;

    for (let index = 0; index < 7; index += 1) {
      if (!cursor) {
        return;
      }

      if (cursor.tagName.toLowerCase() === "main") {
        return;
      }

      const rect = cursor.getBoundingClientRect();

      if (rect.width > 400 && rect.height > 45) {
        candidates.push({
          element: cursor,
          heading,
          score: scoreHeroCandidate(cursor, heading)
        });
      }

      cursor = cursor.parentElement;
    }
  });

  return candidates;
}

function findHero(main: HTMLElement): { element: HTMLElement; heading: HTMLElement } | null {
  const candidates = collectHeroCandidates(main)
    .filter((candidate) => candidate.element.getBoundingClientRect().top < 340)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];

  if (best) {
    return {
      element: best.element,
      heading: best.heading
    };
  }

  return null;
}

function markHeroText(hero: HTMLElement, heading: HTMLElement): void {
  heading.classList.add(HERO_TITLE_CLASS);

  const textBlocks = Array.from(hero.querySelectorAll("p, span, small, strong"));

  textBlocks.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const text = normalize(element.textContent);

    if (!text) {
      return;
    }

    if (text.length < 36 && text === text.toUpperCase()) {
      element.classList.add(HERO_KICKER_CLASS);
      return;
    }

    if (text.length < 48 && /^[A-Z0-9 /&+.-]+$/.test(text)) {
      element.classList.add(HERO_KICKER_CLASS);
      return;
    }

    if (text.length >= 20 && text.length <= 180) {
      element.classList.add(HERO_SUBTITLE_CLASS);
    }
  });
}

function markHeroActions(hero: HTMLElement): void {
  const actions = Array.from(hero.querySelectorAll("a, button"));

  actions.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const label = normalize(element.textContent);

    if (!label) {
      return;
    }

    if (label.length > 42) {
      return;
    }

    element.classList.add(HERO_ACTION_CLASS);
  });
}

function markPageHero(): void {
  removeMarks();

  if (!isWingmanPath()) {
    return;
  }

  const main = getMain();

  if (!main) {
    return;
  }

  const hero = findHero(main);

  if (!hero) {
    return;
  }

  document.body.classList.add(BODY_CLASS);
  hero.element.classList.add(HERO_CLASS);

  markHeroText(hero.element, hero.heading);
  markHeroActions(hero.element);
}

let refreshTimer = 0;

function scheduleRefresh(): void {
  if (refreshTimer) {
    return;
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0;
    markPageHero();
  }, 70);
}

function patchHistoryEvents(): void {
  const historyWithPatchFlag = window.history as History & {
    __wmPageHeroDensityPatched?: boolean;
  };

  if (historyWithPatchFlag.__wmPageHeroDensityPatched) {
    return;
  }

  historyWithPatchFlag.__wmPageHeroDensityPatched = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithPageHeroDensity(...args: Parameters<History["pushState"]>) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };

  window.history.replaceState = function replaceStateWithPageHeroDensity(...args: Parameters<History["replaceState"]>) {
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