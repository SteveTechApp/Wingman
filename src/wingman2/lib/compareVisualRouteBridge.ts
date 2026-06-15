/*
  Compare visual route bridge.

  Visual-only helper:
  - Adds body.wingman-compare-page while on /wingman/compare.
  - Adds light structural classes to Compare result sections after React renders.
  - Does not change ranking, SKU selection, role gating or compare logic.
*/

declare global {
  interface Window {
    __wingmanCompareVisualRouteBridgeInstalled?: boolean;
  }
}

function isCompareRoute(): boolean {
  return window.location.pathname.toLowerCase().includes("/wingman/compare");
}

function textOf(element: Element | null): string {
  return String(element?.textContent || "").replace(/\s+/g, " ").trim();
}

function addCompareBodyClass(): void {
  document.body.classList.toggle("wingman-compare-page", isCompareRoute());
}

function clearCompareResultClasses(root: ParentNode): void {
  const classNames = [
    "compare-result-shell",
    "compare-best-card",
    "compare-option-card",
    "compare-summary-card",
  ];

  for (const className of classNames) {
    for (const element of Array.from(root.querySelectorAll<HTMLElement>(`.${className}`))) {
      element.classList.remove(className);
    }
  }
}

function enhanceCompareResults(): void {
  if (!isCompareRoute()) {
    addCompareBodyClass();
    return;
  }

  addCompareBodyClass();

  const main = document.querySelector("main");

  if (!main) {
    return;
  }

  clearCompareResultClasses(main);

  const blocks = Array.from(main.querySelectorAll<HTMLElement>("section, article, div"))
    .filter((element) => !element.closest("form"))
    .map((element) => ({
      element,
      text: textOf(element),
    }));

  const shell = blocks
    .filter((entry) =>
      entry.text.includes("Best WyreStorm candidate") ||
      entry.text.includes("Other possible WyreStorm options") ||
      entry.text.includes("Viable product choices")
    )
    .sort((a, b) => b.text.length - a.text.length)[0]?.element;

  if (shell) {
    shell.classList.add("compare-result-shell");
  }

  for (const entry of blocks) {
    const text = entry.text;

    if (
      text.includes("Best WyreStorm candidate") &&
      /NHD-|MX-|SW-|EX-|APO-|CAM-|SYN-/.test(text) &&
      text.length < 1800
    ) {
      entry.element.classList.add("compare-best-card");
    }

    if (
      /NHD-|MX-|SW-|EX-|APO-|CAM-|SYN-/.test(text) &&
      (text.includes("PARTIAL MATCH") || text.includes("GOOD MATCH") || text.includes("VERIFY")) &&
      text.length < 2600 &&
      !text.includes("Best WyreStorm candidate")
    ) {
      entry.element.classList.add("compare-option-card");
    }

    if (
      (text.includes("Summary") || text.includes("Competitor:")) &&
      text.includes("Nearest WyreStorm direction") &&
      text.length < 2600
    ) {
      entry.element.classList.add("compare-summary-card");
    }
  }
}

function scheduleEnhance(): void {
  window.setTimeout(enhanceCompareResults, 50);
  window.setTimeout(enhanceCompareResults, 250);
}

function install(): void {
  if (window.__wingmanCompareVisualRouteBridgeInstalled) {
    scheduleEnhance();
    return;
  }

  window.__wingmanCompareVisualRouteBridgeInstalled = true;

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