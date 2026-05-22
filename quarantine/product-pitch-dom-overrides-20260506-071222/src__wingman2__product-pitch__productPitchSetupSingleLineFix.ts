function cleanPitchText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isProductPitchPage(): boolean {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("product-pitch")) return true;

  return cleanPitchText(document.body.textContent).toLowerCase().includes("create a one-page wyrestorm product pitch");
}

function findPitchSetupPanel(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section,article,div")).filter((element) => {
    const text = cleanPitchText(element.textContent).toLowerCase();

    if (!text.includes("pitch setup")) return false;
    if (!text.includes("search sku")) return false;
    if (!text.includes("product family")) return false;
    if (!text.includes("pitch audience")) return false;

    return true;
  });

  candidates.sort((a, b) => cleanPitchText(a.textContent).length - cleanPitchText(b.textContent).length);

  return candidates[0] ?? null;
}

function findSearchInput(panel: HTMLElement): HTMLInputElement | null {
  return Array.from(panel.querySelectorAll<HTMLInputElement>("input")).find((input) => {
    const identity = cleanPitchText([
      input.placeholder,
      input.getAttribute("aria-label"),
      input.name,
      input.id,
    ].filter(Boolean).join(" ")).toLowerCase();

    if (identity.includes("sku")) return true;
    if (identity.includes("requirement")) return true;
    if (identity.includes("nhd")) return true;
    if (identity.includes("usb-c")) return true;

    return false;
  }) ?? null;
}

function selectOptionsText(select: HTMLSelectElement): string {
  return Array.from(select.options).map((option) => {
    return cleanPitchText(option.textContent || option.value).toLowerCase();
  }).join(" ");
}

function findAudienceSelect(panel: HTMLElement): HTMLSelectElement | null {
  return Array.from(panel.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
    const options = selectOptionsText(select);

    if (!options.includes("trade")) return false;
    if (!options.includes("technical")) return false;

    return true;
  }) ?? null;
}

function findFamilySelect(panel: HTMLElement, audienceSelect: HTMLSelectElement | null): HTMLSelectElement | null {
  return Array.from(panel.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
    if (select === audienceSelect) return false;

    const options = selectOptionsText(select);

    if (options.includes("all")) return true;
    if (options.includes("networkhd")) return true;
    if (options.includes("apollo")) return true;
    if (options.includes("matrix")) return true;
    if (options.includes("camera")) return true;

    return false;
  }) ?? null;
}

function findSetupRow(panel: HTMLElement, searchInput: HTMLInputElement | null): HTMLElement | null {
  if (!searchInput) return null;

  const candidates = Array.from(panel.querySelectorAll<HTMLElement>("div,label,section,article")).filter((element) => {
    if (!element.contains(searchInput)) return false;
    if (element.querySelectorAll("select").length < 2) return false;

    return true;
  });

  candidates.sort((a, b) => cleanPitchText(a.textContent).length - cleanPitchText(b.textContent).length);

  return candidates[0] ?? panel;
}

function markControl(control: HTMLElement | null, className: string, panel: HTMLElement): void {
  if (!control) return;

  control.classList.add(className);

  const label = control.closest<HTMLElement>("label");

  if (label) {
    label.classList.add(`${className}-group`);
    return;
  }

  const parent = control.parentElement;

  if (!parent) return;
  if (parent === panel) return;

  parent.classList.add(`${className}-group`);
}

function removePreviousHint(panel: HTMLElement): void {
  panel.querySelectorAll<HTMLElement>(".wm-pitch-setup-right-hint").forEach((hint) => {
    hint.remove();
  });
}

function reconcileProductPitchSetupSingleLine(): void {
  if (!isProductPitchPage()) return;

  const panel = findPitchSetupPanel();

  if (!panel) return;

  panel.classList.remove("wm-product-pitch-setup-panel");
  panel.classList.add("wm-product-pitch-setup-singleline-panel");

  removePreviousHint(panel);

  const searchInput = findSearchInput(panel);
  const audienceSelect = findAudienceSelect(panel);
  const familySelect = findFamilySelect(panel, audienceSelect);
  const row = findSetupRow(panel, searchInput);

  if (row) {
    row.classList.add("wm-product-pitch-setup-singleline-row");
  }

  markControl(searchInput, "wm-pitch-search-input", panel);
  markControl(familySelect, "wm-pitch-family-select", panel);
  markControl(audienceSelect, "wm-pitch-audience-select", panel);
}

let queued = false;

function scheduleReconcile(): void {
  if (queued) return;

  queued = true;

  window.requestAnimationFrame(() => {
    queued = false;
    reconcileProductPitchSetupSingleLine();
  });
}

export function installProductPitchSetupSingleLineFix(): void {
  if (typeof window === "undefined") return;

  const alreadyInstalled = document.body.dataset.wmProductPitchSetupSingleLineFixInstalled === "true";

  if (alreadyInstalled) return;

  document.body.dataset.wmProductPitchSetupSingleLineFixInstalled = "true";

  document.addEventListener("input", scheduleReconcile, true);
  document.addEventListener("change", scheduleReconcile, true);

  const observer = new MutationObserver(scheduleReconcile);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleReconcile, { once: true });
    return;
  }

  scheduleReconcile();
}