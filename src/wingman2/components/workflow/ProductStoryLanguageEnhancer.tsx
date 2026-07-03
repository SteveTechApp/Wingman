import { useEffect } from "react";
import { getProductStoryForText, type ProductStory } from "../../lib/productStoryLanguage";

const TARGET_ROUTE_PARTS = [
  "/wingman/product-call-cards",
  "/wingman/product-pitch",
  "/wingman/product-finder",
  "/wingman/products",  "/wingman/projects",
];

const CANDIDATE_SELECTORS = [
  "article",
  "section",
  "[class*='detail']",
  "[class*='Detail']",
  "[class*='discussion']",
  "[class*='Discussion']",
  "[class*='pitch']",
  "[class*='Pitch']",
  "[class*='summary']",
  "[class*='Summary']",
  "[class*='result']",
  "[class*='Result']",
].join(",");

const SKU_PATTERN =
  /\b(?:NHD|MX|SW|APO|SYN|CAM|CAB|CON|EXP|EXT|EX|TX|RX|USB|HDBT|HDMI)[A-Z0-9]*-[A-Z0-9-]+\b/gi;

function routeIsInScope(): boolean {
  const pathname = window.location.pathname.toLowerCase();
  return TARGET_ROUTE_PARTS.some((routePart) => pathname.includes(routePart));
}

function isProductCallCardsRoute(): boolean {
  return window.location.pathname.toLowerCase().includes("/wingman/product-call-cards");
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function countSkuTokens(text: string): number {
  return Array.from(text.matchAll(SKU_PATTERN)).length;
}

function looksLikeSkuPickerArea(element: HTMLElement): boolean {
  const text = cleanText(element.textContent || "");
  const skuCount = countSkuTokens(text);
  const hasAlphaFilter = Boolean(element.querySelector(".wingman-alpha-filter-host"));
  const buttonCount = element.querySelectorAll("button").length;
  const hasShowingText = /\bshowing\b/i.test(text) && /\bmatching\b/i.test(text);

  if (hasAlphaFilter) {
    return true;
  }

  if (skuCount >= 6 && buttonCount >= 8) {
    return true;
  }

  if (skuCount >= 4 && hasShowingText) {
    return true;
  }

  return false;
}

function shouldSkipCandidate(element: HTMLElement): boolean {
  if (element.dataset.wingmanProductStoryEnhanced === "true") {
    return true;
  }

  if (element.closest(".wingman-product-story-panel")) {
    return true;
  }

  if (element.closest("nav, aside, header, footer, .sidebar, .wingman-sidebar, .topbar")) {
    return true;
  }

  if (element.matches("button, a, input, textarea, select")) {
    return true;
  }

  if (looksLikeSkuPickerArea(element)) {
    return true;
  }

  if (Boolean(element.closest("[data-wingman-pcc-list-pane='true']"))) {
    return true;
  }

  const text = cleanText(element.textContent || "");

  if (text.length < 4) {
    return true;
  }

  if (text.length > 2200) {
    return true;
  }

  if (!SKU_PATTERN.test(text)) {
    SKU_PATTERN.lastIndex = 0;
    return true;
  }

  SKU_PATTERN.lastIndex = 0;
  return false;
}

function createList(title: string, values: string[]): HTMLElement {
  const block = document.createElement("div");
  block.className = "wingman-product-story-list-block";

  const heading = document.createElement("div");
  heading.className = "wingman-product-story-mini-heading";
  heading.textContent = title;

  const list = document.createElement("ul");
  list.className = "wingman-product-story-list";

  values.slice(0, 4).forEach((value) => {
    const item = document.createElement("li");
    item.textContent = value;
    list.appendChild(item);
  });

  block.appendChild(heading);
  block.appendChild(list);

  return block;
}

function createStoryPanel(story: ProductStory): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "wingman-product-story-panel wingman-product-story-panel--compact";
  panel.setAttribute("data-wingman-product-story-panel", "true");

  const eyebrow = document.createElement("div");
  eyebrow.className = "wingman-product-story-eyebrow";
  eyebrow.textContent = `${story.sku} Â· ${story.family}`;

  const title = document.createElement("div");
  title.className = "wingman-product-story-title";
  title.textContent = story.productRole;

  const purpose = document.createElement("p");
  purpose.className = "wingman-product-story-purpose";
  purpose.textContent = story.whatItIs;

  const problem = document.createElement("div");
  problem.className = "wingman-product-story-row";

  const problemLabel = document.createElement("span");
  problemLabel.textContent = "Problem solved";

  const problemText = document.createElement("strong");
  problemText.textContent = story.problemSolved;

  problem.appendChild(problemLabel);
  problem.appendChild(problemText);

  const talkTrack = document.createElement("p");
  talkTrack.className = "wingman-product-story-talktrack";
  talkTrack.textContent = story.salesTalkTrack;

  const grid = document.createElement("div");
  grid.className = "wingman-product-story-grid";

  grid.appendChild(createList("Key facts", story.keyFeatures));
  grid.appendChild(createList("Check before quoting", story.validationQuestions));

  panel.appendChild(eyebrow);
  panel.appendChild(title);
  panel.appendChild(purpose);
  panel.appendChild(problem);
  panel.appendChild(talkTrack);
  panel.appendChild(grid);

  return panel;
}

function removeBadListStoryPanels(): void {
  document.querySelectorAll<HTMLElement>("[data-wingman-pcc-list-pane='true'] .wingman-product-story-panel").forEach((panel) => {
    panel.remove();
  });

  document.querySelectorAll<HTMLElement>(".wingman-product-story-panel").forEach((panel) => {
    const parent = panel.parentElement;

    if (!parent) {
      return;
    }

    if (looksLikeSkuPickerArea(parent)) {
      panel.remove();
    }
  });
}

function findInsertionPoint(container: HTMLElement): HTMLElement {
  const existingPanel = container.querySelector<HTMLElement>(".wingman-product-story-panel");

  if (existingPanel) {
    return existingPanel;
  }

  const heading = container.querySelector<HTMLElement>(
    "h1, h2, h3, h4, [class*='title'], [class*='Title'], [class*='heading'], [class*='Heading']",
  );

  if (heading) {
    return heading;
  }

  return container;
}

function enhanceCandidate(container: HTMLElement): boolean {
  if (shouldSkipCandidate(container)) {
    return false;
  }

  // Product Call Cards now renders its own short, context-aware product story.
  // Avoid injecting a second panel with repeated facts and question lists.
  if (isProductCallCardsRoute()) {
    return false;
  }

  const story = getProductStoryForText(container.textContent || "");

  if (!story) {
    return false;
  }

  const insertionPoint = findInsertionPoint(container);
  const panel = createStoryPanel(story);

  container.dataset.wingmanProductStoryEnhanced = "true";

  if (insertionPoint.classList.contains("wingman-product-story-panel")) {
    insertionPoint.replaceWith(panel);
    return true;
  }

  if (insertionPoint === container) {
    container.insertBefore(panel, container.firstChild);
    return true;
  }

  insertionPoint.insertAdjacentElement("afterend", panel);
  return true;
}

function refreshProductStories(): void {
  if (!routeIsInScope()) {
    return;
  }

  removeBadListStoryPanels();

  const candidates = Array.from(document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTORS));
  let enhancedCount = 0;

  candidates.forEach((candidate) => {
    if (enhancedCount >= 8) {
      return;
    }

    const enhanced = enhanceCandidate(candidate);

    if (enhanced) {
      enhancedCount += 1;
    }
  });

  removeBadListStoryPanels();
}

export default function ProductStoryLanguageEnhancer(): null {
  useEffect(() => {
    let frame = 0;

    const queueRefresh = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        refreshProductStories();
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

    window.addEventListener("popstate", queueRefresh);
    window.addEventListener("hashchange", queueRefresh);
    window.addEventListener("click", queueRefresh, true);

    const interval = window.setInterval(queueRefresh, 1200);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      observer.disconnect();
      window.removeEventListener("popstate", queueRefresh);
      window.removeEventListener("hashchange", queueRefresh);
      window.removeEventListener("click", queueRefresh, true);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
