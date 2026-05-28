const storageKey = "wingmanGuruPosition";
const roamingKey = "wingmanGuruRoaming";

function labelFor(element: HTMLElement): string {
  const imageText = Array.from(element.querySelectorAll<HTMLImageElement>("img"))
    .map((img) => `${img.alt ?? ""} ${img.src ?? ""}`)
    .join(" ");

  return [
    element.textContent,
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.id,
    String(element.className ?? ""),
    imageText,
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function visible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function inSidebar(element: HTMLElement): boolean {
  const holder = element.closest("aside,nav");
  if (!(holder instanceof HTMLElement)) return false;

  const rect = holder.getBoundingClientRect();
  return rect.left < 25 && rect.right < 350;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function findGuru(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("button,a,div,[role='button']"));

  for (const element of candidates) {
    if (!visible(element)) continue;
    if (inSidebar(element)) continue;

    const rect = element.getBoundingClientRect();
    const label = labelFor(element);
    const looksLikeGuru = /guru|assistant|wingman|bot|chat|avatar/i.test(label);
    const sensibleSize = rect.width >= 36 && rect.height >= 36 && rect.width <= 240 && rect.height <= 240;
    const alreadyRoaming = element.dataset[roamingKey] === "true";
    const likelyFloatingArea = rect.left > window.innerWidth * 0.4 && rect.top > window.innerHeight * 0.3;

    if (alreadyRoaming) return element;
    if (looksLikeGuru && sensibleSize && likelyFloatingArea) return element;
  }

  return null;
}

function readStoredPosition(): { left: number; top: number } | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { left?: number; top?: number };

    if (typeof parsed.left !== "number") return null;
    if (typeof parsed.top !== "number") return null;

    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
}

function savePosition(left: number, top: number): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ left, top }));
  } catch {
    return;
  }
}

function applyPosition(element: HTMLElement, left: number, top: number): void {
  const rect = element.getBoundingClientRect();
  const width = Math.max(rect.width, 72);
  const height = Math.max(rect.height, 72);

  const safeLeft = clamp(left, 12, window.innerWidth - width - 12);
  const safeTop = clamp(top, 12, window.innerHeight - height - 12);

  element.style.setProperty("position", "fixed", "important");
  element.style.setProperty("left", `${safeLeft}px`, "important");
  element.style.setProperty("top", `${safeTop}px`, "important");
  element.style.setProperty("right", "auto", "important");
  element.style.setProperty("bottom", "auto", "important");
  element.style.setProperty("z-index", "2147483000", "important");
  element.style.setProperty("cursor", "grab", "important");
  element.style.setProperty("touch-action", "none", "important");
  element.style.setProperty("user-select", "none", "important");
  element.style.setProperty("transform", "none", "important");
  element.removeAttribute("aria-hidden");
}

function resetPosition(element: HTMLElement): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Position reset still works for this session.
  }

  const rect = element.getBoundingClientRect();
  applyPosition(element, window.innerWidth - rect.width - 24, window.innerHeight - rect.height - 24);
}

function makeGuruRoaming(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const stored = readStoredPosition();

  applyPosition(element, stored?.left ?? rect.left, stored?.top ?? rect.top);

  if (element.dataset[roamingKey] === "true") return;

  element.dataset[roamingKey] = "true";
  element.title = "Drag Guru to move. Double-click to reset.";

  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;
  let moved = false;
  let suppressClick = false;

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;

    const current = element.getBoundingClientRect();

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = current.left;
    startTop = current.top;
    moved = false;

    element.setPointerCapture(event.pointerId);
    element.style.setProperty("cursor", "grabbing", "important");
  }, true);

  element.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      moved = true;
    }

    if (!moved) return;

    event.preventDefault();
    applyPosition(element, startLeft + dx, startTop + dy);
  }, true);

  element.addEventListener("pointerup", (event) => {
    if (pointerId !== event.pointerId) return;

    const current = element.getBoundingClientRect();

    savePosition(current.left, current.top);

    if (moved) {
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 150);
    }

    try {
      element.releasePointerCapture(event.pointerId);
    } catch {
      // Safe to ignore.
    }

    pointerId = null;
    moved = false;
    element.style.setProperty("cursor", "grab", "important");
  }, true);

  element.addEventListener("click", (event) => {
    if (!suppressClick) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);

  element.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetPosition(element);
  }, true);
}

function run(): void {
  const guru = findGuru();

  if (!guru) return;

  makeGuruRoaming(guru);
}

let scheduled = false;

function schedule(): void {
  if (scheduled) return;

  scheduled = true;

  window.setTimeout(() => {
    scheduled = false;
    run();
  }, 120);
}

run();

new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

window.addEventListener("resize", schedule);
window.addEventListener("popstate", schedule);

export {};