const VIDEOWALL_PATH_PATTERN = /(?:^|\/)(wingman\/videowall|app\/tools\/videowall|videowall)(?:\/|$)/i;
const BODY_CLASS = "wm-videowall-density";
const HERO_CLASS = "wm-videowall-hero-density";
const ACTION_CLASS = "wm-videowall-hero-action";

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isVideowallPath(): boolean {
  return VIDEOWALL_PATH_PATTERN.test(window.location.pathname);
}

function removeMarks(): void {
  document.body.classList.remove(BODY_CLASS);

  document.querySelectorAll(`.${HERO_CLASS}`).forEach((element) => {
    element.classList.remove(HERO_CLASS);
  });

  document.querySelectorAll(`.${ACTION_CLASS}`).forEach((element) => {
    element.classList.remove(ACTION_CLASS);
  });
}

function findHeroContainer(): HTMLElement | null {
  const headings = Array.from(document.querySelectorAll("main h1, main h2, main h3"));

  for (const heading of headings) {
    const text = normalize(heading.textContent).toLowerCase();

    if (!text.includes("videowall")) {
      continue;
    }

    if (!text.includes("visualise")) {
      continue;
    }

    let cursor: HTMLElement | null = heading.parentElement;

    for (let index = 0; index < 6; index += 1) {
      if (!cursor) {
        break;
      }

      const blockText = normalize(cursor.textContent).toLowerCase();

      if (blockText.includes("open discovery") || blockText.includes("open proposal")) {
        return cursor;
      }

      cursor = cursor.parentElement;
    }
  }

  return null;
}

function markHero(): void {
  removeMarks();

  if (!isVideowallPath()) {
    return;
  }

  document.body.classList.add(BODY_CLASS);

  const hero = findHeroContainer();

  if (!hero) {
    return;
  }

  hero.classList.add(HERO_CLASS);

  const buttons = hero.querySelectorAll("button, a");

  buttons.forEach((element) => {
    const label = normalize(element.textContent).toLowerCase();

    if (label.includes("open discovery") || label.includes("open proposal")) {
      element.classList.add(ACTION_CLASS);
    }
  });
}

let refreshTimer = 0;

function scheduleRefresh(): void {
  if (refreshTimer) {
    return;
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0;
    markHero();
  }, 50);
}

function patchHistoryEvents(): void {
  const historyWithPatchFlag = window.history as History & {
    __wmVideowallHeroDensityPatched?: boolean;
  };

  if (historyWithPatchFlag.__wmVideowallHeroDensityPatched) {
    return;
  }

  historyWithPatchFlag.__wmVideowallHeroDensityPatched = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithVideowallDensity(...args: Parameters<History["pushState"]>) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };

  window.history.replaceState = function replaceStateWithVideowallDensity(...args: Parameters<History["replaceState"]>) {
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
