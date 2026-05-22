function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isProductPitchPage(): boolean {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("product-pitch")) return true;

  return cleanText(document.body.textContent).toLowerCase().includes("create a one-page wyrestorm product pitch");
}

function findPitchSetupPanel(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section,article,div")).filter((element) => {
    const text = cleanText(element.textContent).toLowerCase();

    if (!text.includes("pitch setup")) return false;
    if (!text.includes("search sku")) return false;
    if (!text.includes("product family")) return false;
    if (!text.includes("pitch audience")) return false;

    return true;
  });

  candidates.sort((a, b) => cleanText(a.textContent).length - cleanText(b.textContent).length);

  return candidates[0] ?? null;
}

function findSearchInput(panel: HTMLElement): HTMLInputElement | null {
  return Array.from(panel.querySelectorAll<HTMLInputElement>("input")).find((input) => {
    const identity = cleanText([
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
    return cleanText(option.textContent || option.value).toLowerCase();
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

    if (options.includes("networkhd")) return true;
    if (options.includes("apollo")) return true;
    if (options.includes("matrix")) return true;
    if (options.includes("camera")) return true;
    if (options.includes("all")) return true;

    return false;
  }) ?? null;
}

function addFieldClass(control: HTMLElement, className: string): void {
  control.classList.add(className);

  const label = control.closest<HTMLElement>("label");

  if (label) {
    label.classList.add(`${className}-group`);
    return;
  }

  const parent = control.parentElement;

  if (parent) {
    parent.classList.add(`${className}-group`);
  }
}

function ensureSetupHint(panel: HTMLElement): void {
  const existing = panel.querySelector<HTMLElement>(".wm-pitch-setup-right-hint");

  if (existing) return;

  const hint = document.createElement("div");
  hint.className = "wm-pitch-setup-right-hint";
  hint.innerHTML = `
    <strong>Product picker only</strong>
    <span>Search or filter first, then click a product card to open the pitch on a separate result page.</span>
  `;

  panel.appendChild(hint);
}

function reconcileProductPitchSetupLayout(): void {
  if (!isProductPitchPage()) return;

  const panel = findPitchSetupPanel();

  if (!panel) return;

  const searchInput = findSearchInput(panel);
  const audienceSelect = findAudienceSelect(panel);
  const familySelect = findFamilySelect(panel, audienceSelect);

  panel.classList.add("wm-product-pitch-setup-panel");

  if (searchInput) {
    addFieldClass(searchInput, "wm-pitch-search-input");
  }

  if (familySelect) {
    addFieldClass(familySelect, "wm-pitch-family-select");
  }

  if (audienceSelect) {
    addFieldClass(audienceSelect, "wm-pitch-audience-select");
  }

  ensureSetupHint(panel);
}

let queued = false;

function scheduleReconcile(): void {
  if (queued) return;

  queued = true;

  window.requestAnimationFrame(() => {
    queued = false;
    reconcileProductPitchSetupLayout();
  });
}

export function installProductPitchSetupLayoutFix(): void {
  if (typeof window === "undefined") return;

  const alreadyInstalled = document.body.dataset.wmProductPitchSetupLayoutFixInstalled === "true";

  if (alreadyInstalled) return;

  document.body.dataset.wmProductPitchSetupLayoutFixInstalled = "true";

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