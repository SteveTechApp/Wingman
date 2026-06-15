import { useEffect } from "react";

const SKU_PATTERN =
  /\b(?:NHD|MX|SW|APO|SYN|CAM|CAB|CON|EXP|EXT|EX|TX|RX|USB|HDBT|HDMI)[A-Z0-9]*-[A-Z0-9-]+\b/gi;

function isRoute(): boolean {
  return window.location.pathname.toLowerCase().includes("/wingman/product-call-cards");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function countSkuTokens(text: string): number {
  return Array.from(text.matchAll(SKU_PATTERN)).length;
}

function scoreListPane(element: HTMLElement): number {
  const text = cleanText(element.textContent || "");
  const skuCount = countSkuTokens(text);
  const buttonCount = element.querySelectorAll("button").length;
  let score = 0;

  if (skuCount >= 6) {
    score += skuCount;
  }

  if (buttonCount >= 10) {
    score += 10;
  }

  if (/\bshowing\b/i.test(text) && /\bmatching\b/i.test(text)) {
    score += 15;
  }

  if (element.querySelector(".wingman-alpha-filter-host")) {
    score += 20;
  }

  if (/PRODUCT DISCUSSION/i.test(text)) {
    score -= 30;
  }

  if (/Add to project/i.test(text)) {
    score -= 20;
  }

  return score;
}

function scoreDetailPane(element: HTMLElement): number {
  const text = cleanText(element.textContent || "");
  let score = 0;

  if (/PRODUCT DISCUSSION/i.test(text)) {
    score += 30;
  }

  if (/WHAT IT IS/i.test(text)) {
    score += 12;
  }

  if (/How to sell/i.test(text)) {
    score += 12;
  }

  if (/Specification/i.test(text)) {
    score += 10;
  }

  if (/Add to project/i.test(text)) {
    score += 10;
  }

  if (countSkuTokens(text) >= 12) {
    score -= 20;
  }

  return score;
}

function pickSmallestUsefulElement(elements: HTMLElement[], scorer: (element: HTMLElement) => number): HTMLElement | null {
  const scored = elements
    .map((element) => ({
      element,
      score: scorer(element),
      textLength: cleanText(element.textContent || "").length,
    }))
    .filter((item) => item.score > 20)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.textLength - b.textLength;
    });

  if (scored.length < 1) {
    return null;
  }

  return scored[0].element;
}

function findCommonParent(left: HTMLElement, right: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = left.parentElement;

  while (current) {
    if (current.contains(right)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function markFilterZones(listPane: HTMLElement): void {
  listPane.querySelectorAll<HTMLElement>(".wingman-alpha-filter-host").forEach((filter) => {
    filter.setAttribute("data-wingman-pcc-sticky-filter", "true");
  });

  Array.from(listPane.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) {
      return;
    }

    const text = cleanText(child.textContent || "");
    const hasCategoryFilters = /Presentation/i.test(text) && /NetworkHD/i.test(text) && /Matrix/i.test(text);
    const hasAlphaButtons = /\bAll\b/i.test(text) && /\b0-9\b/i.test(text) && /\bA\b/.test(text) && /\bZ\b/.test(text);

    if (hasCategoryFilters || hasAlphaButtons) {
      child.setAttribute("data-wingman-pcc-sticky-filter", "true");
    }
  });
}

function removeStoryPanelsFromList(listPane: HTMLElement): void {
  listPane.querySelectorAll<HTMLElement>(".wingman-product-story-panel").forEach((panel) => {
    panel.remove();
  });
}

function refreshLayout(): void {
  if (!isRoute()) {
    return;
  }

  const main = document.querySelector<HTMLElement>("main") || document.body;
  main.setAttribute("data-wingman-product-callcards-page", "true");

  const candidates = Array.from(
    main.querySelectorAll<HTMLElement>("section, article, div[class], div"),
  ).filter((element) => {
    if (element.closest("nav, aside, header, footer, .sidebar, .wingman-sidebar, .topbar")) {
      return false;
    }

    const text = cleanText(element.textContent || "");

    if (text.length < 80) {
      return false;
    }

    return true;
  });

  const listPane = pickSmallestUsefulElement(candidates, scoreListPane);
  const detailPane = pickSmallestUsefulElement(candidates, scoreDetailPane);

  if (!listPane || !detailPane) {
    return;
  }

  if (listPane === detailPane) {
    return;
  }

  const commonParent = findCommonParent(listPane, detailPane);

  if (!commonParent) {
    return;
  }

  commonParent.setAttribute("data-wingman-pcc-split-layout", "true");
  listPane.setAttribute("data-wingman-pcc-list-pane", "true");
  detailPane.setAttribute("data-wingman-pcc-detail-pane", "true");

  markFilterZones(listPane);
  removeStoryPanelsFromList(listPane);
}

export default function ProductCallCardsStickyLayoutEnhancer(): null {
  useEffect(() => {
    let frame = 0;

    const queueRefresh = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        refreshLayout();
      });
    };

    queueRefresh();

    const observer = new MutationObserver(() => {
      queueRefresh();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", queueRefresh);
    window.addEventListener("click", queueRefresh, true);

    const interval = window.setInterval(queueRefresh, 1000);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      observer.disconnect();
      window.removeEventListener("resize", queueRefresh);
      window.removeEventListener("click", queueRefresh, true);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}