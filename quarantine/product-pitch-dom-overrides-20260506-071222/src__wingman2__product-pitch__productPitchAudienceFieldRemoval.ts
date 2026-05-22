function wmAudienceCleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function wmAudienceIsProductPitchPage(): boolean {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("product-pitch")) return true;

  return wmAudienceCleanText(document.body.textContent).toLowerCase().includes("create a one-page wyrestorm product pitch");
}

function wmAudienceSelectOptionsText(select: HTMLSelectElement): string {
  return Array.from(select.options).map((option) => {
    return wmAudienceCleanText(option.textContent || option.value).toLowerCase();
  }).join(" ");
}

function wmAudienceFindPitchSetupPanel(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("section,article,div")).filter((element) => {
    const text = wmAudienceCleanText(element.textContent).toLowerCase();

    if (!text.includes("pitch setup")) return false;
    if (!text.includes("search sku")) return false;
    if (!text.includes("product family")) return false;

    return true;
  });

  candidates.sort((a, b) => wmAudienceCleanText(a.textContent).length - wmAudienceCleanText(b.textContent).length);

  return candidates[0] ?? null;
}

function wmAudienceFindAudienceSelect(panel: HTMLElement): HTMLSelectElement | null {
  return Array.from(panel.querySelectorAll<HTMLSelectElement>("select")).find((select) => {
    const options = wmAudienceSelectOptionsText(select);

    if (!options.includes("trade")) return false;
    if (!options.includes("technical")) return false;

    return true;
  }) ?? null;
}

function wmAudienceHideElement(element: HTMLElement | null): void {
  if (!element) return;

  element.classList.add("wm-pitch-audience-field-hidden");
  element.hidden = true;
  element.setAttribute("aria-hidden", "true");
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("visibility", "hidden", "important");
}

function wmAudienceHideNearbyLabel(select: HTMLSelectElement): void {
  const explicitLabel = select.closest<HTMLElement>("label");

  if (explicitLabel) {
    wmAudienceHideElement(explicitLabel);
    return;
  }

  const group = select.closest<HTMLElement>(".wm-pitch-audience-select-group");

  if (group) {
    wmAudienceHideElement(group);
    return;
  }

  const parent = select.parentElement;

  if (!parent) return;

  const text = wmAudienceCleanText(parent.textContent).toLowerCase();
  const parentContainsOnlyAudienceField = text.includes("pitch audience") && parent.querySelectorAll("input,select,textarea").length === 1;

  if (parentContainsOnlyAudienceField) {
    wmAudienceHideElement(parent);
    return;
  }

  Array.from(parent.childNodes).forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;

    const nodeText = wmAudienceCleanText(node.textContent).toLowerCase();

    if (!nodeText.includes("pitch audience")) return;

    node.textContent = "";
  });

  wmAudienceHideElement(select);
}

function wmAudienceRemovePitchAudienceField(): void {
  if (!wmAudienceIsProductPitchPage()) return;

  const panel = wmAudienceFindPitchSetupPanel();

  if (!panel) return;

  const select = wmAudienceFindAudienceSelect(panel);

  if (!select) return;

  select.classList.add("wm-pitch-audience-field-removed");
  select.classList.add("wm-pitch-audience-select");
  select.tabIndex = -1;

  wmAudienceHideNearbyLabel(select);

  panel.classList.add("wm-product-pitch-audience-removed");
}

let wmAudienceRemovalQueued = false;

function wmAudienceScheduleRemoval(): void {
  if (wmAudienceRemovalQueued) return;

  wmAudienceRemovalQueued = true;

  window.requestAnimationFrame(() => {
    wmAudienceRemovalQueued = false;
    wmAudienceRemovePitchAudienceField();
  });
}

export function installProductPitchAudienceFieldRemoval(): void {
  if (typeof window === "undefined") return;

  const alreadyInstalled = document.body.dataset.wmProductPitchAudienceRemovalInstalled === "true";

  if (alreadyInstalled) return;

  document.body.dataset.wmProductPitchAudienceRemovalInstalled = "true";

  document.addEventListener("input", wmAudienceScheduleRemoval, true);
  document.addEventListener("change", wmAudienceScheduleRemoval, true);
  /* Click listener removed: it was collapsing native select dropdowns. */

  const observer = new MutationObserver(wmAudienceScheduleRemoval);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wmAudienceScheduleRemoval, { once: true });
    return;
  }

  wmAudienceScheduleRemoval();
}