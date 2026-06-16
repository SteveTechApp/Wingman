declare global {
  interface Window {
    __wingmanGuruDetachedPanelInstalled?: boolean;
  }
}

const DETACHED_CLASS = "wingman-guru-detached-panel";
const ACTIVE_BODY_CLASS = "wingman-guru-detached-active";

function normaliseText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function elementArea(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  return Math.max(1, rect.width) * Math.max(1, rect.height);
}

function hasGuruInterpretationMarkers(element: HTMLElement): boolean {
  const text = normaliseText(element.textContent);

  if (!text.includes("need more support")) {
    return false;
  }

  if (!text.includes("show wingman interpretation")) {
    return false;
  }

  return text.includes("ask next") || text.includes("missing detail") || text.includes("workflow") || text.includes("likely direction");
}

function findBestPanelRoot(marker: HTMLElement): HTMLElement {
  let current: HTMLElement | null = marker;
  let best: HTMLElement = marker;
  let bestScore = -9999;

  for (let depth = 0; current && depth < 10; depth += 1) {
    const text = normaliseText(current.textContent);
    let score = 0;

    if (text.includes("need more support")) {
      score += 10;
    }

    if (text.includes("show wingman interpretation")) {
      score += 10;
    }

    if (text.includes("ask next")) {
      score += 6;
    }

    if (text.includes("missing detail")) {
      score += 6;
    }

    if (text.includes("workflow")) {
      score += 6;
    }

    if (text.includes("live call cards")) {
      score -= 40;
    }

    if (text.length > 120 && text.length < 3500) {
      score += 6;
    }

    const area = elementArea(current);

    if (area > 20000 && area < 520000) {
      score += 4;
    }

    if (score > bestScore) {
      best = current;
      bestScore = score;
    }

    current = current.parentElement;
  }

  return best;
}

function detachGuruInterpretationPanel(): void {
  const allElements = Array.from(document.querySelectorAll<HTMLElement>("body *"));

  const markerCandidates = allElements
    .filter((element) => hasGuruInterpretationMarkers(element))
    .sort((left, right) => elementArea(left) - elementArea(right));

  const marker = markerCandidates[0];

  if (!marker) {
    document.body.classList.remove(ACTIVE_BODY_CLASS);
    return;
  }

  const root = findBestPanelRoot(marker);

  root.classList.add(DETACHED_CLASS);
  root.setAttribute("data-wingman-guru-detached-panel", "true");
  document.body.classList.add(ACTIVE_BODY_CLASS);

  const closeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).filter((button) =>
    normaliseText(button.textContent).includes("close")
  );

  for (const button of closeButtons) {
    if (button.dataset.wingmanGuruDetachedCloseBound === "true") {
      continue;
    }

    button.dataset.wingmanGuruDetachedCloseBound = "true";

    button.addEventListener("click", () => {
      document.body.classList.remove(ACTIVE_BODY_CLASS);
      root.classList.remove(DETACHED_CLASS);
    });
  }
}

function installGuruDetachedPanel(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__wingmanGuruDetachedPanelInstalled) {
    return;
  }

  window.__wingmanGuruDetachedPanelInstalled = true;

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(detachGuruInterpretationPanel);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener("resize", detachGuruInterpretationPanel);
  window.addEventListener("wingman:guru-detach-refresh", detachGuruInterpretationPanel);

  window.requestAnimationFrame(detachGuruInterpretationPanel);
  window.setTimeout(detachGuruInterpretationPanel, 500);
  window.setTimeout(detachGuruInterpretationPanel, 1500);
}

installGuruDetachedPanel();

export {};