type DiscoveryMemoryGroup =
  | "application"
  | "environment"
  | "outputs"
  | "positions"
  | "sources"
  | "signalPaths"
  | "processing"
  | "general";

interface DiscoveryMemoryItem {
  id: string;
  group: DiscoveryMemoryGroup;
  label: string;
  value: string;
  updatedAt: number;
}

const STORAGE_KEY = "wm.discovery.answerMemory.v2";
const STRIP_ID = "wm-discovery-memory-strip";
const BODY_CLASS = "wm-discovery-memory-enabled";
const PATH_PATTERN = /(?:^|\/)(wingman\/discovery|app\/tools\/discovery|discovery)(?:\/|$)/i;

const GROUPS: Array<{
  key: DiscoveryMemoryGroup;
  title: string;
  match: string[];
}> = [
  {
    key: "application",
    title: "Application",
    match: ["application", "room type", "use case", "market", "vertical", "meeting", "boardroom", "training", "classroom", "auditorium", "worship"]
  },
  {
    key: "environment",
    title: "Environment",
    match: ["environment", "room size", "layout", "seating", "rack", "network", "lan", "vlan", "furniture", "distance band"]
  },
  {
    key: "outputs",
    title: "Outputs",
    match: ["output", "display", "screen", "projector", "monitor", "dual display", "duplicated", "video wall", "interactive"]
  },
  {
    key: "positions",
    title: "Positions",
    match: ["position", "location", "table", "lectern", "ceiling", "wall", "floor", "credenza", "equipment rack", "av furniture"]
  },
  {
    key: "sources",
    title: "Sources",
    match: ["source", "laptop", "pc", "ops", "camera", "microphone", "mic", "signage", "streaming", "recorder", "ptz", "ndi"]
  },
  {
    key: "signalPaths",
    title: "Signal paths",
    match: ["signal path", "cable", "route", "via", "connected", "transport", "hdbaset", "avoip", "usb", "audio", "power", "control"]
  },
  {
    key: "processing",
    title: "Processing",
    match: ["processing", "multiview", "mst", "scaling", "matrix", "switching", "routing", "video wall behaviour", "window"]
  }
];

const GROUP_TITLES: Record<DiscoveryMemoryGroup, string> = {
  application: "Application",
  environment: "Environment",
  outputs: "Outputs",
  positions: "Positions",
  sources: "Sources",
  signalPaths: "Signal paths",
  processing: "Processing",
  general: "Other"
};

let refreshTimer = 0;
let isRendering = false;
let expanded = false;

function isDiscoveryPath(): boolean {
  return PATH_PATTERN.test(window.location.pathname);
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slug(value: string): string {
  return normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function isMemoryItem(value: unknown): value is DiscoveryMemoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as DiscoveryMemoryItem;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.group === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.value === "string" &&
    typeof candidate.updatedAt === "number"
  );
}

function loadMemory(): DiscoveryMemoryItem[] {
  const raw = window.sessionStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter(isMemoryItem);
    }
  } catch {
    return [];
  }

  return [];
}

function saveMemory(items: DiscoveryMemoryItem[]): void {
  const cleaned = items
    .filter((item) => normalize(item.value).length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 80);

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}

function clearMemory(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
}

function getNearbyText(element: Element): string {
  const container = element.closest("fieldset, section, article, form, div");

  if (!container) {
    return "";
  }

  return normalize(container.textContent).slice(0, 700);
}

function inferGroup(label: string, value: string, context: string): DiscoveryMemoryGroup {
  const source = `${label} ${value} ${context}`.toLowerCase();

  for (const group of GROUPS) {
    const matched = group.match.some((term) => source.includes(term));

    if (matched) {
      return group.key;
    }
  }

  return "general";
}

function findLabelByFor(id: string): string {
  const labels = Array.from(document.querySelectorAll("label"));

  for (const label of labels) {
    if (label.htmlFor === id) {
      return normalize(label.textContent);
    }
  }

  return "";
}

function getLabelForControl(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const labelledBy = element.getAttribute("aria-labelledby");

  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    const labelText = normalize(labelElement?.textContent);

    if (labelText) {
      return labelText;
    }
  }

  if (element.id) {
    const explicitText = findLabelByFor(element.id);

    if (explicitText) {
      return explicitText;
    }
  }

  const parentLabel = element.closest("label");
  const parentLabelText = normalize(parentLabel?.textContent);

  if (parentLabelText) {
    return parentLabelText;
  }

  const container = element.closest("div, section, article, fieldset");
  const localLabel = container?.querySelector("label");
  const localLabelText = normalize(localLabel?.textContent);

  if (localLabelText) {
    return localLabelText;
  }

  const ariaLabel = normalize(element.getAttribute("aria-label"));

  if (ariaLabel) {
    return ariaLabel;
  }

  const placeholder = normalize(element.getAttribute("placeholder"));

  if (placeholder) {
    return placeholder;
  }

  const name = normalize(element.getAttribute("name"));

  if (name) {
    return name;
  }

  return "Answer";
}

function getControlValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (element instanceof HTMLSelectElement) {
    return Array.from(element.selectedOptions)
      .map((option) => normalize(option.textContent || option.value))
      .filter(Boolean)
      .join(", ");
  }

  if (element instanceof HTMLTextAreaElement) {
    return normalize(element.value).slice(0, 180);
  }

  if (element.type === "password" || element.type === "hidden") {
    return "";
  }

  if (element.type === "checkbox" || element.type === "radio") {
    if (!element.checked) {
      return "";
    }

    return getLabelForControl(element);
  }

  return normalize(element.value).slice(0, 140);
}

function shouldIgnore(label: string, value: string): boolean {
  const cleanLabel = normalize(label).toLowerCase();
  const cleanValue = normalize(value).toLowerCase();

  if (!cleanValue) {
    return true;
  }

  if (cleanValue === "select" || cleanValue === "choose") {
    return true;
  }

  if (cleanLabel.includes("search") || cleanLabel.includes("filter")) {
    return true;
  }

  return false;
}

function upsertMemoryItem(item: DiscoveryMemoryItem): void {
  const current = loadMemory().filter((existing) => existing.id !== item.id);
  saveMemory([item, ...current]);
}

function captureControl(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): void {
  if (element.closest(`#${STRIP_ID}`)) {
    return;
  }

  const label = getLabelForControl(element);
  const value = getControlValue(element);

  if (shouldIgnore(label, value)) {
    return;
  }

  const context = getNearbyText(element);
  const group = inferGroup(label, value, context);

  upsertMemoryItem({
    id: `${group}:${slug(label)}`,
    group,
    label,
    value,
    updatedAt: Date.now()
  });
}

function isBlockedButtonText(text: string): boolean {
  const lower = normalize(text).toLowerCase();

  if (!lower) {
    return true;
  }

  if (/^\d+\s+[a-z]/i.test(lower)) {
    return true;
  }

  if (lower.startsWith("add path")) {
    return true;
  }

  if (
    lower.includes("next") ||
    lower.includes("back") ||
    lower.includes("clear current project") ||
    lower.includes("remove") ||
    lower.includes("complete") ||
    lower.includes("save") ||
    lower.includes("copy") ||
    lower.includes("export") ||
    lower.includes("show details") ||
    lower.includes("reset reminder")
  ) {
    return true;
  }

  return false;
}

function captureChoice(element: Element): void {
  if (element.closest(`#${STRIP_ID}`)) {
    return;
  }

  const text = normalize(element.textContent).slice(0, 120);

  if (isBlockedButtonText(text)) {
    return;
  }

  const context = getNearbyText(element);
  const group = inferGroup("Selected option", text, context);

  upsertMemoryItem({
    id: `${group}:choice:${slug(text)}`,
    group,
    label: `Selected ${GROUP_TITLES[group]}`,
    value: text,
    updatedAt: Date.now()
  });
}

function captureSelectedControls(): void {
  const selected = document.querySelectorAll<HTMLElement>(
    'main button[aria-pressed="true"], main [role="checkbox"][aria-checked="true"], main [data-state="checked"], main [aria-selected="true"]'
  );

  selected.forEach(captureChoice);
}

function scanCurrentAnswers(): void {
  const controls = document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "main input, main select, main textarea"
  );

  controls.forEach(captureControl);
  captureSelectedControls();
}

function findEngineeringCanvasTop(main: HTMLElement): number | null {
  const headings = Array.from(main.querySelectorAll("h1, h2, h3"));

  for (const heading of headings) {
    const text = normalize(heading.textContent);

    if (text.includes("AV Engineering Design Canvas")) {
      return heading.getBoundingClientRect().top;
    }
  }

  return null;
}

function collectStepAreaCandidates(main: HTMLElement): Element[] {
  const buttons = Array.from(main.querySelectorAll("button"));
  const candidates: Element[] = [];

  buttons.forEach((button) => {
    const buttonText = normalize(button.textContent);

    if (!/^1\s+Application/i.test(buttonText)) {
      return;
    }

    let cursor: Element | null = button;

    for (let index = 0; index < 8; index += 1) {
      const parent = cursor?.parentElement;

      if (!parent) {
        return;
      }

      const parentText = normalize(parent.textContent);

      if (parentText.includes("1 Application") && parentText.includes("8 Recommendation")) {
        candidates.push(parent);
      }

      cursor = parent;
    }
  });

  return Array.from(new Set(candidates));
}

function findStepArea(main: HTMLElement): Element | null {
  const candidates = collectStepAreaCandidates(main);

  if (candidates.length === 0) {
    return null;
  }

  const canvasTop = findEngineeringCanvasTop(main);

  if (canvasTop !== null) {
    const afterCanvasHeading = candidates
      .map((candidate) => ({
        candidate,
        top: candidate.getBoundingClientRect().top
      }))
      .filter((entry) => entry.top >= canvasTop - 12)
      .sort((a, b) => a.top - b.top);

    if (afterCanvasHeading[0]) {
      return afterCanvasHeading[0].candidate;
    }
  }

  return candidates
    .map((candidate) => ({
      candidate,
      top: candidate.getBoundingClientRect().top
    }))
    .sort((a, b) => b.top - a.top)[0]?.candidate ?? null;
}

function ensureStrip(): HTMLElement | null {
  const main = document.querySelector("main");

  if (!(main instanceof HTMLElement)) {
    return null;
  }

  const existing = document.getElementById(STRIP_ID);
  const strip = existing instanceof HTMLElement ? existing : document.createElement("aside");

  if (!existing) {
    strip.id = STRIP_ID;
    strip.setAttribute("aria-label", "Discovery previous responses");
  }

  const stepArea = findStepArea(main);

  if (stepArea?.parentElement) {
    stepArea.parentElement.insertBefore(strip, stepArea.nextSibling);
    return strip;
  }

  if (strip.parentElement !== main) {
    main.insertBefore(strip, main.firstChild);
  }

  return strip;
}

function getItemsByGroup(items: DiscoveryMemoryItem[]): Map<DiscoveryMemoryGroup, DiscoveryMemoryItem[]> {
  const map = new Map<DiscoveryMemoryGroup, DiscoveryMemoryItem[]>();

  items.forEach((item) => {
    const current = map.get(item.group) ?? [];
    current.push(item);
    map.set(item.group, current);
  });

  map.forEach((groupItems, key) => {
    map.set(
      key,
      groupItems.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
    );
  });

  return map;
}

function renderMemory(): void {
  if (!isDiscoveryPath()) {
    document.body.classList.remove(BODY_CLASS);
    document.getElementById(STRIP_ID)?.remove();
    return;
  }

  document.body.classList.add(BODY_CLASS);

  const strip = ensureStrip();

  if (!strip) {
    return;
  }

  const items = loadMemory();
  const itemsByGroup = getItemsByGroup(items);
  const populatedGroups = GROUPS.filter((group) => (itemsByGroup.get(group.key) ?? []).length > 0);

  if (populatedGroups.length === 0) {
    strip.hidden = true;
    return;
  }

  strip.hidden = false;

  const cards = populatedGroups
    .map((group) => {
      const groupItems = itemsByGroup.get(group.key) ?? [];
      const primary = groupItems[0];

      if (!primary) {
        return "";
      }

      return `
        <article class="wm-memory-card">
          <span>${escapeHtml(group.title)}</span>
          <strong>${escapeHtml(primary.value)}</strong>
        </article>
      `;
    })
    .join("");

  const detailRows = populatedGroups
    .map((group) => {
      const groupItems = itemsByGroup.get(group.key) ?? [];

      if (groupItems.length === 0) {
        return "";
      }

      const rows = groupItems
        .map((item) => {
          return `
            <li>
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
            </li>
          `;
        })
        .join("");

      return `
        <section>
          <h4>${escapeHtml(group.title)}</h4>
          <ul>${rows}</ul>
        </section>
      `;
    })
    .join("");

  isRendering = true;

  strip.innerHTML = `
    <div class="wm-memory-header">
      <div>
        <span>Brief so far</span>
        <strong>Previous responses</strong>
      </div>
      <div class="wm-memory-actions">
        <button type="button" data-wm-memory-toggle>${expanded ? "Compact" : "Details"}</button>
        <button type="button" data-wm-memory-clear>Reset</button>
      </div>
    </div>
    <div class="wm-memory-cards">
      ${cards}
    </div>
    ${
      expanded
        ? `<div class="wm-memory-details">${detailRows}</div>`
        : ""
    }
  `;

  strip.querySelector("[data-wm-memory-toggle]")?.addEventListener("click", () => {
    expanded = !expanded;
    renderMemory();
  });

  strip.querySelector("[data-wm-memory-clear]")?.addEventListener("click", () => {
    clearMemory();
    renderMemory();
  });

  window.setTimeout(() => {
    isRendering = false;
  }, 0);
}

function scheduleRefresh(): void {
  if (isRendering) {
    return;
  }

  if (refreshTimer) {
    return;
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0;

    if (!isDiscoveryPath()) {
      renderMemory();
      return;
    }

    scanCurrentAnswers();
    renderMemory();
  }, 120);
}

function handleInputEvent(event: Event): void {
  const target = event.target;

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  ) {
    window.setTimeout(() => {
      captureControl(target);
      renderMemory();
    }, 0);
  }
}

function handleClickEvent(event: MouseEvent): void {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  if (target.closest(`#${STRIP_ID}`)) {
    return;
  }

  const button = target.closest("button");

  if (!button) {
    return;
  }

  const text = normalize(button.textContent);

  if (text.toLowerCase().includes("clear current project")) {
    clearMemory();
    renderMemory();
    return;
  }

  window.setTimeout(() => {
    captureChoice(button);
    captureSelectedControls();
    renderMemory();
  }, 0);
}

function patchHistoryEvents(): void {
  const historyWithPatchFlag = window.history as History & {
    __wmDiscoveryAnswerMemoryPatched?: boolean;
  };

  if (historyWithPatchFlag.__wmDiscoveryAnswerMemoryPatched) {
    return;
  }

  historyWithPatchFlag.__wmDiscoveryAnswerMemoryPatched = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithDiscoveryMemory(...args: Parameters<History["pushState"]>) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };

  window.history.replaceState = function replaceStateWithDiscoveryMemory(...args: Parameters<History["replaceState"]>) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  patchHistoryEvents();

  document.addEventListener("input", handleInputEvent, true);
  document.addEventListener("change", handleInputEvent, true);
  document.addEventListener("click", handleClickEvent, true);

  window.addEventListener("popstate", scheduleRefresh);
  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener("wm:navigation", scheduleRefresh);
  window.addEventListener("DOMContentLoaded", scheduleRefresh);

  const observer = new MutationObserver(scheduleRefresh);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scheduleRefresh();
}

export {};