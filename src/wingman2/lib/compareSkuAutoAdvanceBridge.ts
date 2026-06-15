/*
  COMPARE_SKU_CLICK_AUTO_ADVANCE_BRIDGE

  Runtime helper for the Compare workflow.

  Purpose:
  - Known competitor SKU chips go straight to WyreStorm comparison results.
  - The page does not stop at a secondary "stored SKU selected" stage.
  - The Compare route receives stable body/result classes for scoped styling.
*/

declare global {
  interface Window {
    __wingmanCompareSkuAutoAdvanceBridgeInstalled?: boolean;
    __wingmanCompareRouteClassInstalled?: boolean;
    __wingmanCompareResultObserverInstalled?: boolean;
  }
}

const SKU_PATTERN = /\b[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){1,}\b/g;

const NON_SKU_WORDS = new Set([
  "ATLONA",
  "BLUSTREAM",
  "CRESTRON",
  "EXTRON",
  "KRAMER",
  "LIGHTWARE",
  "AMX",
  "AVPRO",
  "EDGEE",
  "ZEEVEE",
  "BINARY",
  "JUST ADD POWER",
  "CUSTOM",
]);

let compareEnhanceTimer: ReturnType<typeof setTimeout> | null = null;

function isCompareRoute(): boolean {
  return window.location.pathname.toLowerCase().includes("/wingman/compare");
}

function normaliseText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function syncCompareRouteClass(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.body.classList.toggle("wingman-compare-page", isCompareRoute());
}

function scheduleCompareEnhancement(): void {
  if (!isCompareRoute()) {
    return;
  }

  if (compareEnhanceTimer) {
    clearTimeout(compareEnhanceTimer);
  }

  compareEnhanceTimer = setTimeout(() => {
    syncCompareRouteClass();
    enhanceCompareResultLayout();
  }, 40);
}

function installCompareRouteClass(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__wingmanCompareRouteClassInstalled) {
    scheduleCompareEnhancement();
    return;
  }

  window.__wingmanCompareRouteClassInstalled = true;

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
    const result = originalPushState(...args);
    scheduleCompareEnhancement();
    return result;
  }) as History["pushState"];

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
    const result = originalReplaceState(...args);
    scheduleCompareEnhancement();
    return result;
  }) as History["replaceState"];

  window.addEventListener("popstate", scheduleCompareEnhancement);
  window.addEventListener("hashchange", scheduleCompareEnhancement);
  document.addEventListener("DOMContentLoaded", scheduleCompareEnhancement);

  scheduleCompareEnhancement();
}

function extractSingleSkuFromText(value: string | null | undefined): string | null {
  const text = normaliseText(value);

  if (!text) {
    return null;
  }

  if (text.length > 96) {
    return null;
  }

  if (NON_SKU_WORDS.has(text.toUpperCase())) {
    return null;
  }

  const matches = text.toUpperCase().match(SKU_PATTERN) || [];

  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
}

function extractSkuFromElement(element: Element): string | null {
  const htmlElement = element as HTMLElement;

  const attributeCandidates = [
    htmlElement.dataset.compareSku,
    htmlElement.dataset.knownSku,
    htmlElement.getAttribute("data-sku"),
    htmlElement.getAttribute("aria-label"),
    htmlElement.getAttribute("title"),
    htmlElement.getAttribute("value"),
    htmlElement.textContent,
  ];

  for (const candidate of attributeCandidates) {
    const sku = extractSingleSkuFromText(candidate);

    if (sku) {
      return sku;
    }
  }

  return null;
}

function findCompetitorSkuField(): HTMLInputElement | HTMLTextAreaElement | null {
  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
  );

  const directPlaceholder = fields.find((field) => {
    const placeholder = normaliseText(field.getAttribute("placeholder")).toLowerCase();
    return placeholder.includes("competitor sku");
  });

  if (directPlaceholder) {
    return directPlaceholder;
  }

  return fields.find((field) => {
    const searchableText = [
      field.getAttribute("placeholder"),
      field.getAttribute("name"),
      field.getAttribute("id"),
      field.getAttribute("aria-label"),
    ]
      .map(normaliseText)
      .join(" ")
      .toLowerCase();

    return searchableText.includes("sku") && searchableText.includes("competitor");
  }) || null;
}

function setFieldValue(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = field instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(field, value);
  }

  if (!descriptor?.set) {
    field.value = value;
  }

  try {
    field.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: false,
        data: value,
        inputType: "insertText",
      })
    );
  } catch {
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function submitCompareFromField(field: HTMLInputElement | HTMLTextAreaElement): void {
  const form = field.closest("form") as HTMLFormElement | null;

  window.setTimeout(() => {
    if (!form) {
      return;
    }

    const submitButton = form.querySelector<HTMLButtonElement>(
      'button[type="submit"], input[type="submit"]'
    );

    if (typeof form.requestSubmit === "function" && submitButton) {
      form.requestSubmit(submitButton);
      return;
    }

    if (typeof form.requestSubmit === "function") {
      form.requestSubmit();
      return;
    }

    if (submitButton) {
      submitButton.click();
      return;
    }

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  }, 80);
}

function isKnownSkuArea(element: Element): boolean {
  const form = element.closest("form");

  if (!form) {
    return false;
  }

  const formText = normaliseText(form.textContent).toLowerCase();

  return formText.includes("known skus") || formText.includes("known sku");
}

function handleCompareSkuClick(event: MouseEvent): void {
  if (!isCompareRoute()) {
    return;
  }

  const rawTarget = event.target;

  if (!(rawTarget instanceof Element)) {
    return;
  }

  const clickedElement = rawTarget.closest<HTMLElement>(
    '[data-compare-sku], [data-known-sku], [data-sku], button, [role="button"], a, li, span'
  );

  if (!clickedElement) {
    return;
  }

  if (!isKnownSkuArea(clickedElement)) {
    return;
  }

  const sku = extractSkuFromElement(clickedElement);

  if (!sku) {
    return;
  }

  const competitorSkuField = findCompetitorSkuField();

  if (!competitorSkuField) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  setFieldValue(competitorSkuField, sku);

  document.dispatchEvent(
    new CustomEvent("wingman:compare-known-sku-auto-advance", {
      detail: { sku },
    })
  );

  submitCompareFromField(competitorSkuField);
  scheduleCompareEnhancement();
}

function removeOldCompareClasses(main: HTMLElement): void {
  const classNames = [
    "compare-result-flow",
    "compare-result-summary-card",
    "compare-result-candidate-card",
    "compare-result-copy-card",
    "compare-result-help-copy",
  ];

  for (const className of classNames) {
    for (const element of Array.from(main.querySelectorAll<HTMLElement>(`.${className}`))) {
      element.classList.remove(className);
    }
  }
}

function isUsefulCandidateCard(text: string): boolean {
  if (!(text.includes("Why this direction is suggested") || text.includes("Why it may fit"))) {
    return false;
  }

  if (!(text.includes("Check before quoting") || text.includes("Check before positioning"))) {
    return false;
  }

  if (!(text.includes("Gaps / cautions") || text.includes("Gaps / caution"))) {
    return false;
  }

  if (!/\bNHD-[A-Z0-9-]+\b/.test(text)) {
    return false;
  }

  return text.length < 4200;
}

function markSmallestMatchingCards(elements: HTMLElement[], className: string, predicate: (text: string) => boolean): void {
  const matches = elements
    .map((element) => ({
      element,
      text: normaliseText(element.textContent),
    }))
    .filter((entry) => predicate(entry.text))
    .sort((a, b) => a.text.length - b.text.length);

  const selected: HTMLElement[] = [];

  for (const match of matches) {
    const alreadyCovered = selected.some((element) => element.contains(match.element));

    if (alreadyCovered) {
      continue;
    }

    selected.push(match.element);
    match.element.classList.add(className);
  }
}

function enhanceCompareResultLayout(): void {
  if (!isCompareRoute()) {
    return;
  }

  const main = document.querySelector<HTMLElement>("main");

  if (!main) {
    return;
  }

  removeOldCompareClasses(main);

  const elements = Array.from(
    main.querySelectorAll<HTMLElement>("section, article, div, aside")
  ).filter((element) => !element.closest("form"));

  const resultRoot = elements
    .map((element) => ({
      element,
      text: normaliseText(element.textContent),
    }))
    .filter((entry) =>
      entry.text.includes("Review WyreStorm product direction") &&
      entry.text.includes("Viable product choices")
    )
    .sort((a, b) => a.text.length - b.text.length)[0]?.element;

  if (!resultRoot) {
    return;
  }

  resultRoot.classList.add("compare-result-flow");

  for (const element of elements) {
    const text = normaliseText(element.textContent);

    if (
      text.includes("Known SKUs for the selected brand are shown as clickable buttons") &&
      text.length < 450
    ) {
      element.classList.add("compare-result-help-copy");
    }

    if (
      text.includes("Best WyreStorm candidate") &&
      text.includes("Copy summary") &&
      text.length < 1800
    ) {
      element.classList.add("compare-result-summary-card");
    }

    if (
      text.includes("Copy-safe comparison summary") &&
      (text.includes("Check before quoting") || text.includes("Check before positioning")) &&
      text.length < 4200
    ) {
      element.classList.add("compare-result-copy-card");
    }
  }

  markSmallestMatchingCards(elements, "compare-result-candidate-card", isUsefulCandidateCard);
}

function installCompareResultObserver(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__wingmanCompareResultObserverInstalled) {
    scheduleCompareEnhancement();
    return;
  }

  window.__wingmanCompareResultObserverInstalled = true;

  const observer = new MutationObserver(() => {
    scheduleCompareEnhancement();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  scheduleCompareEnhancement();
}

function installCompareSkuAutoAdvanceBridge(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__wingmanCompareSkuAutoAdvanceBridgeInstalled) {
    return;
  }

  window.__wingmanCompareSkuAutoAdvanceBridgeInstalled = true;
  document.addEventListener("click", handleCompareSkuClick, true);
}

installCompareRouteClass();
installCompareResultObserver();
installCompareSkuAutoAdvanceBridge();

export {};