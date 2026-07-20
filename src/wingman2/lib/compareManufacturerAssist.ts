const SELECTED_MANUFACTURER_KEY = "wingman:compare-selected-manufacturer";
const REPLAY_FLAG = "wmCompareManufacturerReplay";
const FLASH_ATTR = "data-wm-compare-manufacturer-flash";
const BADGE_CLASS = "wm-compare-selected-manufacturer-badge";

const manufacturers = [
  "Barco ClickShare",
  "AVPro Edge",
  "Crestron",
  "Extron",
  "Atlona",
  "Kramer",
  "Lightware",
  "Blustream",
  "Barco",
  "ZeeVee",
  "AMX",
  "Binary",
  "Visionary",
  "BirdDog",
  "Marshall",
  "Mersive",
  "Airtame",
  "Sony"
];

type WindowWithCompareAssist = Window &
  typeof globalThis & {
    __wmCompareManufacturerAssistInstalled?: boolean;
  };

function isCompareRoute(): boolean {
  return window.location.pathname.includes("/wingman/compare");
}

function normaliseText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function cleanManufacturer(value: string | null | undefined): string | null {
  const text = normaliseText(value);

  if (!text) {
    return null;
  }

  const exact = manufacturers.find((manufacturer) => manufacturer.toLowerCase() === text.toLowerCase());

  if (exact) {
    return exact;
  }

  const prefix = manufacturers
    .slice()
    .sort((a, b) => b.length - a.length)
    .find((manufacturer) => text.toLowerCase().startsWith(manufacturer.toLowerCase()));

  return prefix ?? null;
}

function getActionText(element: HTMLElement): string {
  return normaliseText(element.textContent);
}

function getManufacturerFromAction(element: HTMLElement): string | null {
  const text = getActionText(element);

  if (!text) {
    return null;
  }

  const blocked = [
    "add missing manufacturer",
    "next",
    "reset compare",
    "choose competitor product",
    "selected brand",
    "selected manufacturer",
    "custom"
  ];

  const lower = text.toLowerCase();

  if (blocked.some((item) => lower.includes(item))) {
    return null;
  }

  return cleanManufacturer(text);
}

function isManufacturerButton(element: HTMLElement): boolean {
  const manufacturer = getManufacturerFromAction(element);

  if (!manufacturer) {
    return false;
  }

  const nearbyText = normaliseText(
    element.closest("section, article, form")?.textContent ?? ""
  ).toLowerCase();

  return nearbyText.includes("manufacturer") || nearbyText.includes("choose competitor brand");
}

function setSelectedManufacturer(manufacturer: string): void {
  const clean = cleanManufacturer(manufacturer);

  if (!clean) {
    return;
  }

  window.sessionStorage.setItem(SELECTED_MANUFACTURER_KEY, clean);
  document.documentElement.dataset.wmCompareSelectedManufacturer = clean;
}

function removeManufacturerBadge(): void {
  document.querySelectorAll(`.${BADGE_CLASS}`).forEach((badge) => badge.remove());
}

function findNextProductButton(): HTMLElement | null {
  const actions = Array.from(document.querySelectorAll<HTMLElement>("button, a"));

  return (
    actions.find((action) => {
      const text = getActionText(action).toLowerCase();

      return text.includes("next") && text.includes("choose") && text.includes("competitor product");
    }) ?? null
  );
}

function updateManufacturerBadge(): void {
  /*
    The React Compare page now owns the selected-brand display.
    Remove legacy injected badges so stale session or inferred values cannot
    duplicate or contradict the active selectedBrand state.
  */
  removeManufacturerBadge();
}

function flashSelectAndAdvance(event: MouseEvent): void {
  if (!isCompareRoute()) {
    return;
  }

  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const action = target.closest("button, a");

  if (!(action instanceof HTMLElement)) {
    return;
  }

  if (!isManufacturerButton(action)) {
    return;
  }

  if (action.dataset[REPLAY_FLAG] === "true") {
    delete action.dataset[REPLAY_FLAG];
    return;
  }

  const manufacturer = getManufacturerFromAction(action);

  if (!manufacturer) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  setSelectedManufacturer(manufacturer);
  removeManufacturerBadge();

  action.setAttribute(FLASH_ATTR, "true");

  window.setTimeout(() => {
    action.removeAttribute(FLASH_ATTR);
    action.dataset[REPLAY_FLAG] = "true";
    action.click();

    window.setTimeout(() => {
      const next = findNextProductButton();

      if (next) {
        next.click();
      }

      window.setTimeout(updateManufacturerBadge, 120);
    }, 90);
  }, 340);
}

export function installCompareManufacturerAssist(): void {
  const targetWindow = window as WindowWithCompareAssist;

  if (targetWindow.__wmCompareManufacturerAssistInstalled) {
    return;
  }

  targetWindow.__wmCompareManufacturerAssistInstalled = true;

  document.addEventListener("click", flashSelectAndAdvance, true);

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(updateManufacturerBadge);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["value"]
  });

  window.addEventListener("popstate", () => {
    window.requestAnimationFrame(updateManufacturerBadge);
  });

  window.addEventListener("hashchange", () => {
    window.requestAnimationFrame(updateManufacturerBadge);
  });

  window.requestAnimationFrame(updateManufacturerBadge);
}
