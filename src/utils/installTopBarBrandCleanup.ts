declare global {
  interface Window {
    __wmTopBarBrandCleanupInstalled?: boolean;
    __wmTopBarBrandCleanupTeardown?: () => void;
  }
}

const BRAND_SELECTORS = [
  ".wm-topbar__brand",
  ".wm-brand-lockup",
  '[class*="topbar__brand"]',
  '[class*="brand-lockup"]',
].join(",");

function hasGraphic(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === "img" || tag === "svg") return true;
  if (element.querySelector("img,svg")) return true;
  return false;
}

function hideElement(element: Element): void {
  if (!(element instanceof HTMLElement)) return;
  element.style.display = "none";
  element.setAttribute("aria-hidden", "true");
}

function cleanBrandNode(brand: Element): void {
  if (!(brand instanceof HTMLElement)) return;

  brand.dataset.wmBrandClean = "true";

  Array.from(brand.childNodes).forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    if (!node.textContent?.trim()) return;
    node.parentNode?.removeChild(node);
  });

  Array.from(brand.children).forEach((child) => {
    if (hasGraphic(child)) {
      if (child instanceof HTMLElement) {
        child.dataset.wmBrandAnchor = "true";
      }
      return;
    }

    hideElement(child);
  });

  const anchors = brand.querySelectorAll("a,button,div,span");

  anchors.forEach((anchor) => {
    if (!(anchor instanceof HTMLElement)) return;
    if (!anchor.querySelector("img,svg")) return;

    anchor.dataset.wmBrandAnchor = "true";

    Array.from(anchor.childNodes).forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      if (!node.textContent?.trim()) return;
      node.parentNode?.removeChild(node);
    });

    Array.from(anchor.children).forEach((child) => {
      const tag = child.tagName.toLowerCase();

      if (tag === "img" || tag === "svg") return;
      if (child.querySelector("img,svg")) return;

      hideElement(child);
    });
  });
}

function syncTopBarBrandCleanup(): void {
  const brands = document.querySelectorAll(BRAND_SELECTORS);
  brands.forEach((brand) => cleanBrandNode(brand));
}

export function installTopBarBrandCleanup(): () => void {
  if (typeof window === "undefined") return () => {};
  if (typeof document === "undefined") return () => {};

  if (window.__wmTopBarBrandCleanupInstalled) {
    return window.__wmTopBarBrandCleanupTeardown ?? (() => {});
  }

  const sync = () => {
    syncTopBarBrandCleanup();
  };

  const observer = new MutationObserver(() => {
    sync();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  sync();

  const cleanup = () => {
    observer.disconnect();
    window.__wmTopBarBrandCleanupInstalled = false;
    window.__wmTopBarBrandCleanupTeardown = undefined;
  };

  window.__wmTopBarBrandCleanupInstalled = true;
  window.__wmTopBarBrandCleanupTeardown = cleanup;

  return cleanup;
}

export default installTopBarBrandCleanup;