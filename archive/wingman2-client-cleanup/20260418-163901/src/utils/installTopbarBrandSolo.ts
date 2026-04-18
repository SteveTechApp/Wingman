declare global {
  interface Window {
    __wmTopbarBrandSoloInstalled?: boolean;
    __wmTopbarBrandSoloCleanup?: () => void;
  }
}

const BRAND_ROOT_SELECTORS = [
  ".wm-topbar__brand",
  ".wm-brand-lockup",
  '[class*="topbar__brand"]',
  '[class*="brand-lockup"]',
].join(",");

function cloneGraphic(node: Element): HTMLElement | null {
  if (node instanceof HTMLImageElement) {
    const img = document.createElement("img");
    img.src = node.currentSrc || node.src;
    img.alt = "Wingman";
    img.draggable = false;
    img.className = "wm-topbar__brand-solo-image";
    return img;
  }

  if (node instanceof SVGElement) {
    const svg = node.cloneNode(true) as SVGElement;
    svg.classList.add("wm-topbar__brand-solo-image");
    return svg as unknown as HTMLElement;
  }

  return null;
}

function getBrandHref(root: HTMLElement): string {
  const link = root.querySelector("a[href]");

  if (link instanceof HTMLAnchorElement) {
    const href = link.getAttribute("href");
    if (href && href.trim().length > 0) {
      return href;
    }
  }

  return "/app/dashboard";
}

function alreadySolo(root: HTMLElement): boolean {
  const solo = root.querySelector(":scope > .wm-topbar__brand-solo");
  if (!(solo instanceof HTMLElement)) return false;
  if (root.children.length !== 1) return false;
  return true;
}

function soloiseBrand(root: HTMLElement): void {
  if (alreadySolo(root)) return;

  const sourceGraphic = root.querySelector("img,svg");
  if (!(sourceGraphic instanceof Element)) return;

  const clonedGraphic = cloneGraphic(sourceGraphic);
  if (!(clonedGraphic instanceof HTMLElement)) return;

  const href = getBrandHref(root);

  const anchor = document.createElement("a");
  anchor.className = "wm-topbar__brand-solo";
  anchor.href = href;
  anchor.setAttribute("aria-label", "Wingman home");
  anchor.appendChild(clonedGraphic);

  root.replaceChildren(anchor);
  root.dataset.wmBrandSolo = "true";
}

function syncTopbarBrandSolo(): void {
  const roots = document.querySelectorAll(BRAND_ROOT_SELECTORS);

  roots.forEach((node) => {
    if (node instanceof HTMLElement) {
      soloiseBrand(node);
    }
  });
}

export function installTopbarBrandSolo(): () => void {
  if (typeof window === "undefined") return () => {};
  if (typeof document === "undefined") return () => {};

  if (window.__wmTopbarBrandSoloInstalled) {
    return window.__wmTopbarBrandSoloCleanup ?? (() => {});
  }

  const sync = () => {
    syncTopbarBrandSolo();
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
    window.__wmTopbarBrandSoloInstalled = false;
    window.__wmTopbarBrandSoloCleanup = undefined;
  };

  window.__wmTopbarBrandSoloInstalled = true;
  window.__wmTopbarBrandSoloCleanup = cleanup;

  return cleanup;
}

export default installTopbarBrandSolo;