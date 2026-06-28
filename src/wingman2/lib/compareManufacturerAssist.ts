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

const skuSignatures: Record<string, string[]> = {
  Extron: ["DTP2 R 211", "DTP2 T 211", "DTP3 R 201", "IN1608 xi", "NAV D 101", "NAV E 101"],
  Atlona: ["AT-OME", "AT-UHD", "AT-HDVS", "AT-AVA", "OME-EX"],
  Lightware: ["LBN-", "UCX-", "MMX", "VINX", "TPX"],
  Blustream: ["IP250", "IP300", "HEX", "HMXL", "PRO8"],
  Crestron: ["DM-NVX", "DM-TX", "DM-RMC", "HD-RX", "HD-TX"],
  Kramer: ["WP-", "TP-", "VIA", "VS-", "VM-"],
  ZeeVee: ["ZyPer", "Zyper", "ZV"],
  "AVPro Edge": ["AC-MX", "AC-EX", "MXNET"],
  Barco: ["ClickShare", "CX-", "C-", "S3", "E2"],
  "Barco ClickShare": ["CX-20", "CX-30", "CX-50", "C-5", "C-10"],
  Airtame: ["Airtame"],
  BirdDog: ["BirdDog", "P200", "P240", "X1"],
  Marshall: ["CV", "ML-"],
  Mersive: ["Solstice"],
  Sony: ["SRG", "BRC", "REA"]
};

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

function readSelectedBrandLine(): string | null {
  const pageText = normaliseText(document.body?.textContent ?? "");
  const match = pageText.match(/Selected brand:\s*([A-Za-z0-9\s+\-_.&/]+)/i);

  return cleanManufacturer(match?.[1]);
}

function readManufacturerInputValue(): string | null {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input"));

  for (const input of inputs) {
    const value = cleanManufacturer(input.value);

    if (!value) {
      continue;
    }

    const containerText = normaliseText(
      input.closest("label, section, article, div")?.textContent ?? ""
    ).toLowerCase();

    if (containerText.includes("manufacturer") || containerText.includes("competitor brand")) {
      return value;
    }
  }

  return null;
}

function inferManufacturerFromSkuStep(): string | null {
  const pageText = normaliseText(document.body?.textContent ?? "");

  if (!pageText.toLowerCase().includes("known skus for selected brand")) {
    return null;
  }

  const matches = Object.entries(skuSignatures)
    .map(([manufacturer, signatures]) => {
      const score = signatures.reduce((count, signature) => {
        return pageText.toLowerCase().includes(signature.toLowerCase()) ? count + 1 : count;
      }, 0);

      return { manufacturer, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches[0]?.manufacturer ?? null;
}

function getSelectedManufacturer(): string | null {
  /*
    Current page state must win over session storage.
    This prevents stale cases such as selecting Extron while the badge still shows Atlona.
  */
  const current =
    inferManufacturerFromSkuStep() ??
    readSelectedBrandLine() ??
    readManufacturerInputValue();

  if (current) {
    setSelectedManufacturer(current);
    return current;
  }

  return cleanManufacturer(window.sessionStorage.getItem(SELECTED_MANUFACTURER_KEY));
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

function findSkuStepTarget(): HTMLElement | null {
  const pageText = normaliseText(document.body?.textContent ?? "").toLowerCase();

  if (!pageText.includes("known skus for selected brand") && !pageText.includes("competitor sku")) {
    return null;
  }

  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3"));

  const productHeading = headings.find((heading) => {
    const text = normaliseText(heading.textContent).toLowerCase();

    return (
      text.includes("choose competitor product") ||
      text.includes("competitor product") ||
      text.includes("choose competitor sku")
    );
  });

  if (productHeading) {
    return productHeading.closest("section, article, div") as HTMLElement | null;
  }

  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section, article, div"));

  return (
    candidates.find((candidate) => {
      const text = normaliseText(candidate.textContent).toLowerCase();

      return text.includes("known skus for selected brand") || text.includes("competitor sku");
    }) ?? null
  );
}

function updateManufacturerBadge(): void {
  if (!isCompareRoute()) {
    removeManufacturerBadge();
    return;
  }

  const target = findSkuStepTarget();

  if (!target) {
    removeManufacturerBadge();
    return;
  }

  const manufacturer = getSelectedManufacturer();

  if (!manufacturer) {
    removeManufacturerBadge();
    return;
  }

  const existing = target.querySelector<HTMLElement>(`.${BADGE_CLASS}`);

  if (existing) {
    const strong = existing.querySelector("strong");

    if (strong) {
      strong.textContent = manufacturer;
    }

    return;
  }

  removeManufacturerBadge();

  const badge = document.createElement("div");
  badge.className = `${BADGE_CLASS} wm-ui-badge wm-ui-badge-selected`;
  badge.setAttribute("aria-label", `Selected manufacturer ${manufacturer}`);
  const label = document.createElement("span");
  label.textContent = "Selected manufacturer";
  const value = document.createElement("strong");
  value.textContent = manufacturer;
  badge.append(label, value);

  const heading = Array.from(target.querySelectorAll<HTMLElement>("h1, h2, h3")).find((item) =>
    normaliseText(item.textContent).toLowerCase().includes("competitor")
  );

  if (heading) {
    heading.insertAdjacentElement("afterend", badge);
    return;
  }

  target.insertAdjacentElement("afterbegin", badge);
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
