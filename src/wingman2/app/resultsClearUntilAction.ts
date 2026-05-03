const IDLE_BODY_CLASS = "wm-results-awaiting-action";
const RESULT_CARD_CLASS = "wm-gated-product-result";
const EMPTY_STATE_ID = "wm-results-empty-state";

const TARGET_PATH_PATTERN = /\/wingman\/(?:finder|product-pitch|compare|videowall|proposal)(?:\/|$)/i;

const SKU_PATTERN = /\b(?:NHD|MX|MXV|SW|SWX|RX|RXV|TX|EX|EXA|EXF|EXP|APO|CAM|HALO|SYN|SP|CAB|AMP|COM|IDB|FOCUS|SR)-[A-Z0-9][A-Z0-9-]*\b/i;

let currentPath = "";
let userHasTakenAction = false;
let refreshTimer = 0;
let isRendering = false;

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isTargetPage(): boolean {
  return TARGET_PATH_PATTERN.test(window.location.pathname);
}

function getMain(): HTMLElement | null {
  const main = document.querySelector("main");

  if (main instanceof HTMLElement) {
    return main;
  }

  return null;
}

function resetForRouteIfNeeded(): void {
  if (currentPath === window.location.pathname) {
    return;
  }

  currentPath = window.location.pathname;
  userHasTakenAction = false;
}

function isInsideShell(element: Element): boolean {
  if (element.closest("aside, nav, header")) {
    return true;
  }

  if (element.closest(`#${EMPTY_STATE_ID}`)) {
    return true;
  }

  if (element.closest("#wm-discovery-memory-strip")) {
    return true;
  }

  if (element.closest("#wm-clear-project-confirm-modal")) {
    return true;
  }

  return false;
}

function shouldIgnoreButton(button: HTMLButtonElement): boolean {
  const label = normalize(button.textContent).toLowerCase();

  if (!label) {
    return true;
  }

  if (/^\d+\s+[a-z]/i.test(label)) {
    return true;
  }

  if (label.includes("back")) {
    return true;
  }

  if (label.includes("next")) {
    return true;
  }

  if (label.includes("show details")) {
    return true;
  }

  if (label.includes("reset")) {
    return true;
  }

  if (label.includes("clear current project")) {
    return true;
  }

  if (label.includes("compact")) {
    return true;
  }

  return false;
}

function markUserAction(): void {
  if (!isTargetPage()) {
    return;
  }

  userHasTakenAction = true;
  scheduleRefresh();
}

function handleInputOrChange(event: Event): void {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  if (isInsideShell(target)) {
    return;
  }

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    markUserAction();
  }
}

function handleClick(event: MouseEvent): void {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  if (isInsideShell(target)) {
    return;
  }

  const button = target.closest("button");

  if (button instanceof HTMLButtonElement) {
    if (shouldIgnoreButton(button)) {
      return;
    }

    markUserAction();
    return;
  }

  const clickable = target.closest("a, [role='button'], [role='checkbox'], [role='radio'], [aria-pressed], [data-filter], [data-value]");

  if (clickable) {
    markUserAction();
  }
}

function clearExistingMarks(main: HTMLElement): void {
  main.querySelectorAll(`.${RESULT_CARD_CLASS}`).forEach((element) => {
    element.classList.remove(RESULT_CARD_CLASS);
  });
}

function looksLikeProductResult(element: Element): boolean {
  if (isInsideShell(element)) {
    return false;
  }

  const text = normalize(element.textContent);

  if (!SKU_PATTERN.test(text)) {
    return false;
  }

  const lowerClass = normalize(element.getAttribute("class")).toLowerCase();

  if (lowerClass.includes("filter")) {
    return false;
  }

  if (lowerClass.includes("search")) {
    return false;
  }

  if (lowerClass.includes("input")) {
    return false;
  }

  if (element.closest("form")) {
    return false;
  }

  return true;
}

function markProductResults(main: HTMLElement): void {
  clearExistingMarks(main);

  if (!isTargetPage()) {
    return;
  }

  if (userHasTakenAction) {
    return;
  }

  const candidates = main.querySelectorAll(
    "article, li, tr, [data-product], [data-sku], [class*='card'], [class*='Card'], [class*='result'], [class*='Result'], [class*='product'], [class*='Product'], [class*='recommend'], [class*='Recommend']"
  );

  candidates.forEach((candidate) => {
    if (!looksLikeProductResult(candidate)) {
      return;
    }

    candidate.classList.add(RESULT_CARD_CLASS);
  });
}

function findHeroAnchor(main: HTMLElement): Element | null {
  const candidates = main.querySelectorAll("section, article, div");

  for (const candidate of candidates) {
    const text = normalize(candidate.textContent);

    if (text.includes("Product Finder")) {
      return candidate;
    }

    if (text.includes("Product Families")) {
      return candidate;
    }

    if (text.includes("Product Pitch")) {
      return candidate;
    }

    if (text.includes("Competitor")) {
      return candidate;
    }

    if (text.includes("Room Templates")) {
      return candidate;
    }

    if (text.includes("Videowall")) {
      return candidate;
    }

    if (text.includes("Proposal")) {
      return candidate;
    }
  }

  return main.firstElementChild;
}

function ensureEmptyState(main: HTMLElement): HTMLElement {
  const existing = document.getElementById(EMPTY_STATE_ID);

  if (existing instanceof HTMLElement) {
    return existing;
  }

  const emptyState = document.createElement("section");
  emptyState.id = EMPTY_STATE_ID;
  emptyState.setAttribute("aria-label", "Results are clear until the user makes a selection");

  emptyState.innerHTML = `
    <div class="wm-results-empty-icon">+</div>
    <div class="wm-results-empty-copy">
      <p>Results window clear</p>
      <strong>Select a filter, choose an option, or type a requirement to show matching products.</strong>
    </div>
  `;

  const anchor = findHeroAnchor(main);

  if (anchor?.parentElement) {
    anchor.parentElement.insertBefore(emptyState, anchor.nextSibling);
    return emptyState;
  }

  main.insertBefore(emptyState, main.firstChild);
  return emptyState;
}

function removeEmptyState(): void {
  document.getElementById(EMPTY_STATE_ID)?.remove();
}

function render(): void {
  if (isRendering) {
    return;
  }

  isRendering = true;
  resetForRouteIfNeeded();

  const main = getMain();

  if (!main) {
    isRendering = false;
    return;
  }

  if (!isTargetPage()) {
    document.body.classList.remove(IDLE_BODY_CLASS);
    clearExistingMarks(main);
    removeEmptyState();
    isRendering = false;
    return;
  }

  markProductResults(main);

  if (userHasTakenAction) {
    document.body.classList.remove(IDLE_BODY_CLASS);
    removeEmptyState();
    isRendering = false;
    return;
  }

  document.body.classList.add(IDLE_BODY_CLASS);
  ensureEmptyState(main);

  isRendering = false;
}

function scheduleRefresh(): void {
  if (refreshTimer) {
    return;
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0;
    render();
  }, 80);
}

function patchHistoryEvents(): void {
  const historyWithPatchFlag = window.history as History & {
    __wmResultsClearUntilActionPatched?: boolean;
  };

  if (historyWithPatchFlag.__wmResultsClearUntilActionPatched) {
    return;
  }

  historyWithPatchFlag.__wmResultsClearUntilActionPatched = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithResultsClear(...args: Parameters<History["pushState"]>) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };

  window.history.replaceState = function replaceStateWithResultsClear(...args: Parameters<History["replaceState"]>) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  patchHistoryEvents();

  document.addEventListener("input", handleInputOrChange, true);
  document.addEventListener("change", handleInputOrChange, true);
  document.addEventListener("click", handleClick, true);

  window.addEventListener("popstate", scheduleRefresh);
  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener("wm:navigation", scheduleRefresh);
  window.addEventListener("DOMContentLoaded", scheduleRefresh);
  window.addEventListener("wm:clear-current-project", () => {
    userHasTakenAction = false;
    scheduleRefresh();
  });

  const observer = new MutationObserver(scheduleRefresh);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scheduleRefresh();
}

export {};