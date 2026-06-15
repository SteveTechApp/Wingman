/*
  Product positioning autofill bridge.

  Purpose:
  - Reads ?sku= from product positioning routes.
  - Fills the product/SKU search field.
  - Attempts to open the matching product result.
  - Allows Compare > More to land the user directly in product assistance.
*/

declare global {
  interface Window {
    __wingmanProductPositioningAutofillBridgeInstalled?: boolean;
  }
}

const PRODUCT_ROUTES = [
  "/wingman/product-pitch",
  "/wingman/product-call-cards",
  "/wingman/products",
];

function isProductPositioningRoute(): boolean {
  const path = window.location.pathname.toLowerCase();
  return PRODUCT_ROUTES.some((route) => path.includes(route));
}

function getRequestedSku(): string | null {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("sku");

  if (fromUrl) {
    return fromUrl.trim().toUpperCase();
  }

  try {
    return window.sessionStorage.getItem("wingman:product-positioning-sku")?.trim().toUpperCase() || null;
  } catch {
    return null;
  }
}

function normaliseText(value: string | null | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
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

function findBestSearchField(): HTMLInputElement | HTMLTextAreaElement | null {
  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
  ).filter((field) => {
    const type = field instanceof HTMLInputElement ? field.type.toLowerCase() : "textarea";
    return ["", "text", "search", "textarea"].includes(type);
  });

  const scored = fields
    .map((field) => {
      const searchable = [
        field.getAttribute("placeholder"),
        field.getAttribute("name"),
        field.getAttribute("id"),
        field.getAttribute("aria-label"),
        field.closest("label")?.textContent,
      ]
        .map(normaliseText)
        .join(" ")
        .toLowerCase();

      let score = 0;

      if (searchable.includes("sku")) score += 5;
      if (searchable.includes("product")) score += 4;
      if (searchable.includes("search")) score += 3;
      if (searchable.includes("find")) score += 2;
      if (searchable.includes("competitor")) score -= 5;

      return { field, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.field || fields[0] || null;
}

function clickMatchingProductElement(sku: string): boolean {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("button, a, [role='button'], li, article, section, div")
  )
    .map((element) => ({
      element,
      text: normaliseText(element.textContent).toUpperCase(),
    }))
    .filter((entry) => entry.text.includes(sku))
    .sort((a, b) => a.text.length - b.text.length);

  for (const candidate of candidates) {
    const clickable = candidate.element.closest<HTMLElement>("button, a, [role='button']") || candidate.element;

    if (!clickable) {
      continue;
    }

    clickable.click();
    return true;
  }

  return false;
}

function applyProductPositioningAutofill(): void {
  if (!isProductPositioningRoute()) {
    return;
  }

  const sku = getRequestedSku();

  if (!sku) {
    return;
  }

  document.body.classList.add("wingman-product-positioning-autofill");

  const field = findBestSearchField();

  if (field) {
    setFieldValue(field, sku);
  }

  document.dispatchEvent(
    new CustomEvent("wingman:product-positioning-autofill", {
      detail: { sku, source: "compare" },
    })
  );

  window.setTimeout(() => clickMatchingProductElement(sku), 150);
  window.setTimeout(() => clickMatchingProductElement(sku), 450);
  window.setTimeout(() => clickMatchingProductElement(sku), 900);
}

function scheduleAutofill(): void {
  window.setTimeout(applyProductPositioningAutofill, 50);
  window.setTimeout(applyProductPositioningAutofill, 300);
  window.setTimeout(applyProductPositioningAutofill, 800);
}

function install(): void {
  if (window.__wingmanProductPositioningAutofillBridgeInstalled) {
    scheduleAutofill();
    return;
  }

  window.__wingmanProductPositioningAutofillBridgeInstalled = true;

  const originalPushState = window.history.pushState.bind(window.history);
  window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
    const result = originalPushState(...args);
    scheduleAutofill();
    return result;
  }) as History["pushState"];

  const originalReplaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
    const result = originalReplaceState(...args);
    scheduleAutofill();
    return result;
  }) as History["replaceState"];

  window.addEventListener("popstate", scheduleAutofill);
  window.addEventListener("hashchange", scheduleAutofill);
  document.addEventListener("DOMContentLoaded", scheduleAutofill);

  const observer = new MutationObserver(() => {
    scheduleAutofill();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  scheduleAutofill();
}

install();

export {};