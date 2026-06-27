import { useEffect } from "react";

const TARGET_ROUTE_PARTS = [
  "/wingman/product-call-cards",
  "/wingman/products",
  "/wingman/product-finder",  "/wingman/projects",
  "/wingman/templates",
];

const ORDERED_BUCKETS = [
  "0-9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

type AlphaBucket = "All" | (typeof ORDERED_BUCKETS)[number];

const SKU_OR_MODEL_PATTERN =
  /\b(?:NHD|MX|SW|APO|SYN|CAM|CAB|CON|EXP|EXT|EX|TX|RX|USB|HDBT|HDMI|MMX|UCX|UBEX|VINX|TPX|TAURUS)[A-Z0-9]*[-\s]?[A-Z0-9-]*\b/i;

const CONTAINER_SELECTORS = [
  '[data-wingman-alpha-list="true"]',
  "[data-wingman-product-list]",
  ".wingman-product-list",
  ".product-list",
  ".product-grid",
  ".product-results",
  ".sku-results",
  ".results-list",
  ".compare-product-list",
  ".compare-candidate-list",
  ".compare-results",
  ".candidate-list",
  ".candidate-grid",
  ".wm-list",
  ".wm-grid",
  ".card-grid",
  ".product-picker",
  ".compare-picker",
].join(",");

const FALLBACK_CONTAINER_SELECTORS = [
  "main section",
  'main [class*="panel"]',
  'main [class*="list"]',
  'main [class*="grid"]',
  'main [class*="results"]',
].join(",");

const DIRECT_ITEM_SELECTOR =
  ":scope > button, :scope > a, :scope > div, :scope > li, :scope > article";

function routeIsInScope(): boolean {
  const path = window.location.pathname.toLowerCase();
  return TARGET_ROUTE_PARTS.some((routePart) => path.includes(routePart));
}

function normaliseText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getItemText(item: HTMLElement): string {
  return normaliseText(item.textContent || "");
}

function getPrimaryToken(text: string): string {
  const cleaned = normaliseText(text);

  if (!cleaned) {
    return "";
  }

  const modelMatch = cleaned.match(SKU_OR_MODEL_PATTERN)?.[0];

  if (modelMatch) {
    return normaliseText(modelMatch);
  }

  return cleaned;
}

function getBucket(text: string): AlphaBucket | "" {
  const token = getPrimaryToken(text);
  const first = token.charAt(0).toUpperCase();

  if (/^[0-9]/.test(first)) {
    return "0-9";
  }

  if (/^[A-Z]$/.test(first)) {
    return first as AlphaBucket;
  }

  return "";
}

function isSkuOrProductLike(text: string): boolean {
  const cleaned = normaliseText(text);

  if (cleaned.length < 2 || cleaned.length > 280) {
    return false;
  }

  if (SKU_OR_MODEL_PATTERN.test(cleaned)) {
    return true;
  }

  if (
    /\b(NetworkHD|WyreStorm|Matrix|HDBaseT|AVoIP|Multiview|Video wall|Extender|Control|Camera|USB|Dante|Decoder|Encoder|Receiver|Transmitter)\b/i.test(
      cleaned,
    )
  ) {
    return true;
  }

  return false;
}

function isInsideNavigation(element: Element): boolean {
  return Boolean(
    element.closest(
      "nav, aside, header, footer, .sidebar, .wingman-sidebar, .app-sidebar, .topbar, .command-bar",
    ),
  );
}

function getDirectItems(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(DIRECT_ITEM_SELECTOR)).filter(
    (item) => {
      if (item.classList.contains("wingman-alpha-filter-host")) {
        return false;
      }

      if (item.closest(".wingman-alpha-filter-host")) {
        return false;
      }

      const text = getItemText(item);
      const bucket = getBucket(text);

      if (!bucket) {
        return false;
      }

      return text.length >= 2 && text.length <= 280;
    },
  );
}

function looksLikeExistingAlphaFilter(element: Element | null): boolean {
  if (!element) {
    return false;
  }

  if (element.classList.contains("wingman-alpha-filter-host")) {
    return true;
  }

  const buttonText = Array.from(element.querySelectorAll("button"))
    .map((button) => normaliseText(button.textContent || ""))
    .join(" ");

  if (!/\bAll\b/.test(buttonText)) {
    return false;
  }

  if (!/\b0-9\b/.test(buttonText)) {
    return false;
  }

  if (!/\bA\b/.test(buttonText)) {
    return false;
  }

  return true;
}

function hasExistingAlphaFilterNear(container: Element): boolean {
  if (looksLikeExistingAlphaFilter(container.previousElementSibling)) {
    return true;
  }

  if (looksLikeExistingAlphaFilter(container.firstElementChild)) {
    return true;
  }

  if (looksLikeExistingAlphaFilter(container.children.item(1))) {
    return true;
  }

  if (Boolean(container.querySelector(".wingman-alpha-filter-host"))) {
    return true;
  }

  return false;
}

function isLikelyFilterableList(container: Element): boolean {
  if (isInsideNavigation(container)) {
    return false;
  }

  if (container.closest(".wingman-alpha-filter-host")) {
    return false;
  }

  if (hasExistingAlphaFilterNear(container)) {
    return false;
  }

  const items = getDirectItems(container);

  if (items.length < 6) {
    return false;
  }

  const productLikeCount = items.filter((item) => isSkuOrProductLike(getItemText(item))).length;
  const buckets = new Set(items.map((item) => getBucket(getItemText(item))).filter(Boolean));

  if (productLikeCount >= 4) {
    return true;
  }

  if (items.length >= 9 && buckets.size >= 3) {
    return true;
  }

  return false;
}

function getExistingHost(container: HTMLElement): HTMLElement | null {
  const previous = container.previousElementSibling;

  if (previous instanceof HTMLElement && previous.classList.contains("wingman-alpha-filter-host")) {
    return previous;
  }

  return null;
}

function getAvailableBuckets(items: HTMLElement[]): AlphaBucket[] {
  const available = new Set<AlphaBucket>();

  items.forEach((item) => {
    const bucket = getBucket(getItemText(item));

    if (bucket && bucket !== "All") {
      available.add(bucket);
    }
  });

  return ORDERED_BUCKETS.filter((bucket) => available.has(bucket));
}

function getVisibleBuckets(items: HTMLElement[]): AlphaBucket[] {
  const availableBuckets = getAvailableBuckets(items);

  if (availableBuckets.length < 1) {
    return ["All"];
  }

  return ["All", ...availableBuckets];
}

function applyFilter(container: HTMLElement, activeBucket: AlphaBucket): void {
  const items = getDirectItems(container);

  items.forEach((item) => {
    const itemBucket = getBucket(getItemText(item));
    const shouldShow = activeBucket === "All" || itemBucket === activeBucket;

    if (shouldShow) {
      item.removeAttribute("data-wingman-alpha-hidden");
      return;
    }

    item.setAttribute("data-wingman-alpha-hidden", "true");
  });
}

function updateButtonStates(host: HTMLElement, activeBucket: AlphaBucket): void {
  host.querySelectorAll<HTMLButtonElement>("button[data-alpha-bucket]").forEach((button) => {
    const bucket = button.dataset.alphaBucket || "";
    const isActive = bucket === activeBucket;

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function updateCount(host: HTMLElement, container: HTMLElement, activeBucket: AlphaBucket): void {
  const count = host.querySelector<HTMLElement>(".wingman-alpha-filter-readout-disabled");

  if (!count) {
    return;
  }

  const items = getDirectItems(container);
  const visible = items.filter((item) => !item.hasAttribute("data-wingman-alpha-hidden")).length;

  if (activeBucket === "All") {
    count.textContent = `${items.length} items`;
    return;
  }

  count.textContent = `${visible} / ${items.length}`;
}

function buildToolbar(container: HTMLElement, items: HTMLElement[]): void {
  const existingHost = getExistingHost(container);
  const host = existingHost || document.createElement("div");
  const visibleBuckets = getVisibleBuckets(items);
  const savedActiveBucket = (host.dataset.alphaActive || "All") as AlphaBucket;
  const activeBucket = visibleBuckets.includes(savedActiveBucket) ? savedActiveBucket : "All";

  host.className = "wingman-alpha-filter-host";
  host.setAttribute("data-wingman-alpha-filter-host", "true");
  host.setAttribute("data-wingman-alpha-actual-buckets", visibleBuckets.join(","));
  host.dataset.alphaActive = activeBucket;

  host.innerHTML = "";

  const label = document.createElement("span");
  label.className = "wingman-alpha-filter-readout-disabled";
  label.textContent = "Filter";

  const rail = document.createElement("div");
  rail.className = "wingman-alpha-filter-rail";
  rail.setAttribute("aria-label", "Actual available alpha-numeric product filter");

  visibleBuckets.forEach((bucket) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wingman-alpha-filter-button";
    button.textContent = bucket;
    button.dataset.alphaBucket = bucket;
    button.setAttribute("aria-pressed", bucket === activeBucket ? "true" : "false");

    button.addEventListener("click", () => {
      host.dataset.alphaActive = bucket;
      applyFilter(container, bucket);
      updateButtonStates(host, bucket);
      updateCount(host, container, bucket);
    });

    rail.appendChild(button);
  });

  const count = document.createElement("span");
  count.className = "wingman-alpha-filter-readout-disabled";

  host.appendChild(label);
  host.appendChild(rail);
  host.appendChild(count);

  if (!existingHost && container.parentElement) {
    container.parentElement.insertBefore(host, container);
  }

  applyFilter(container, activeBucket);
  updateButtonStates(host, activeBucket);
  updateCount(host, container, activeBucket);
}

function refreshAlphaFilters(): void {
  if (!routeIsInScope()) {
    return;
  }

  const explicitContainers = Array.from(document.querySelectorAll<HTMLElement>(CONTAINER_SELECTORS));
  const fallbackContainers = Array.from(
    document.querySelectorAll<HTMLElement>(FALLBACK_CONTAINER_SELECTORS),
  );

  const containers = Array.from(new Set([...explicitContainers, ...fallbackContainers]));

  containers.forEach((container) => {
    if (!isLikelyFilterableList(container)) {
      return;
    }

    buildToolbar(container, getDirectItems(container));
  });
}

export default function WorkflowAlphaNumericFilter(): null {
  useEffect(() => {
    let frame = 0;

    const queueRefresh = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        refreshAlphaFilters();
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

    const interval = window.setInterval(queueRefresh, 1500);

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
