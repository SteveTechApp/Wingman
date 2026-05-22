type AudienceMode = "trade" | "user" | "technical";

type AudienceModeConfig = {
  buttonText: string;
  storageValue: string;
  selectMatches: string[];
};

const AUDIENCE_STORAGE_KEY = "wingman.salesLanguageMode";

const AUDIENCE_MODES: Record<AudienceMode, AudienceModeConfig> = {
  trade: {
    buttonText: "Sell to Trade",
    storageValue: "trade",
    selectMatches: ["trade", "dealer", "installer"],
  },
  user: {
    buttonText: "Sell to User",
    storageValue: "user",
    selectMatches: ["user", "end user", "outcome", "experience"],
  },
  technical: {
    buttonText: "Sell to Technical Consultant",
    storageValue: "technical",
    selectMatches: ["technical", "consultant", "specification"],
  },
};

function normaliseText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function isWingmanShellLoaded(): boolean {
  return Boolean(document.querySelector(".wingman-shell"));
}

function isProductPitchPage(): boolean {
  const path = window.location.pathname.toLowerCase();
  const bodyText = normaliseText(document.body.textContent).toLowerCase();

  if (path.includes("product-pitch")) return true;
  if (path.includes("pitch") && bodyText.includes("create a one-page wyrestorm product pitch")) return true;
  if (bodyText.includes("create a one-page wyrestorm product pitch")) return true;

  return false;
}

function isProductPitchResultView(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("pitchView") === "result";
}

function modeFromText(text: string): AudienceMode | null {
  const lower = normaliseText(text).toLowerCase();

  if (lower.includes("sell to technical consultant")) return "technical";
  if (lower.includes("sell to trade")) return "trade";
  if (lower.includes("sell to user")) return "user";

  return null;
}

function modeFromStoredValue(value: string | null): AudienceMode | null {
  const lower = normaliseText(value).toLowerCase();

  if (lower === "technical") return "technical";
  if (lower === "trade") return "trade";
  if (lower === "user") return "user";

  return null;
}

function modeFromSelectedAudienceText(text: string): AudienceMode | null {
  const lower = normaliseText(text).toLowerCase();

  if (lower.includes("technical")) return "technical";
  if (lower.includes("consultant")) return "technical";
  if (lower.includes("trade")) return "trade";
  if (lower.includes("dealer")) return "trade";
  if (lower.includes("installer")) return "trade";
  if (lower.includes("user")) return "user";
  if (lower.includes("outcome")) return "user";
  if (lower.includes("experience")) return "user";

  return null;
}

function getAudienceCards(): HTMLElement[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("button,[role='button'],section,article,div"));
  const found = new Set<HTMLElement>();

  nodes.forEach((node) => {
    const text = normaliseText(node.textContent);

    if (text.length < 8) return;
    if (text.length > 190) return;

    const mode = modeFromText(text);

    if (!mode) return;

    const lower = text.toLowerCase();
    const matchCount = (Object.keys(AUDIENCE_MODES) as AudienceMode[]).reduce((count, key) => {
      if (lower.includes(AUDIENCE_MODES[key].buttonText.toLowerCase())) return count + 1;
      return count;
    }, 0);

    if (matchCount !== 1) return;

    const clickable = node.closest<HTMLElement>("button,[role='button']") ?? node;
    found.add(clickable);
    clickable.dataset.wmAudienceMode = mode;
  });

  return Array.from(found);
}

function findAudienceSelect(): HTMLSelectElement | null {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select"));

  return selects.find((select) => {
    const optionsText = Array.from(select.options).map((option) => {
      return normaliseText(option.textContent || option.value).toLowerCase();
    }).join(" ");

    if (!optionsText.includes("trade")) return false;
    if (!optionsText.includes("technical")) return false;

    const hasUserOption = optionsText.includes("user") || optionsText.includes("outcome") || optionsText.includes("experience");

    if (!hasUserOption) return false;

    return true;
  }) ?? null;
}

function setNativeSelectValue(select: HTMLSelectElement, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(select, value);
  }

  if (!descriptor?.set) {
    select.value = value;
  }

  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function findSelectOptionForMode(select: HTMLSelectElement, mode: AudienceMode): HTMLOptionElement | null {
  const config = AUDIENCE_MODES[mode];
  const options = Array.from(select.options);

  return options.find((option) => {
    const text = normaliseText(option.textContent || option.value).toLowerCase();

    return config.selectMatches.some((match) => {
      return text.includes(match);
    });
  }) ?? null;
}

function applyAudienceCardState(mode: AudienceMode): void {
  const cards = getAudienceCards();

  cards.forEach((card) => {
    const cardMode = card.dataset.wmAudienceMode as AudienceMode | undefined;
    const active = cardMode === mode;

    card.classList.toggle("wm-audience-card-active", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function applyAudienceMode(mode: AudienceMode): void {
  document.body.dataset.wingmanSalesMode = AUDIENCE_MODES[mode].storageValue;
  document.body.dataset.wmSalesMode = AUDIENCE_MODES[mode].storageValue;
  document.documentElement.dataset.wmSalesMode = AUDIENCE_MODES[mode].storageValue;

  localStorage.setItem(AUDIENCE_STORAGE_KEY, AUDIENCE_MODES[mode].storageValue);

  applyAudienceCardState(mode);

  const select = findAudienceSelect();

  if (!select) return;

  const option = findSelectOptionForMode(select, mode);

  if (!option) return;

  if (select.value === option.value) return;

  setNativeSelectValue(select, option.value);
}

function hydrateAudienceModeFromSelectOrStorage(): void {
  const select = findAudienceSelect();
  const selectedMode = modeFromSelectedAudienceText(select?.selectedOptions?.[0]?.textContent || select?.value || "");

  if (selectedMode) {
    applyAudienceCardState(selectedMode);
    document.body.dataset.wingmanSalesMode = AUDIENCE_MODES[selectedMode].storageValue;
    document.body.dataset.wmSalesMode = AUDIENCE_MODES[selectedMode].storageValue;
    document.documentElement.dataset.wmSalesMode = AUDIENCE_MODES[selectedMode].storageValue;
    localStorage.setItem(AUDIENCE_STORAGE_KEY, AUDIENCE_MODES[selectedMode].storageValue);
    return;
  }

  const storedMode = modeFromStoredValue(localStorage.getItem(AUDIENCE_STORAGE_KEY));

  if (!storedMode) return;

  applyAudienceMode(storedMode);
}

function handleAudienceClick(event: MouseEvent): void {
  if (!isWingmanShellLoaded()) return;

  const target = event.target;

  if (!(target instanceof HTMLElement)) return;

  const interactiveControl = target.closest("select,input,textarea,option,label");

  if (interactiveControl) return;

  const explicitCard = target.closest<HTMLElement>("[data-wm-audience-mode]");

  if (explicitCard) {
    const explicitMode = explicitCard.dataset.wmAudienceMode as AudienceMode | undefined;

    if (explicitMode === "trade" || explicitMode === "user" || explicitMode === "technical") {
      applyAudienceMode(explicitMode);

      window.setTimeout(() => applyAudienceMode(explicitMode), 40);
      window.setTimeout(() => applyAudienceMode(explicitMode), 160);

      return;
    }
  }

  const cards = getAudienceCards();
  const clickedCard = cards.find((card) => card.contains(target)) ?? null;

  if (!clickedCard) return;

  const mode = clickedCard.dataset.wmAudienceMode as AudienceMode | undefined;

  if (mode !== "trade" && mode !== "user" && mode !== "technical") return;

  applyAudienceMode(mode);

  window.setTimeout(() => applyAudienceMode(mode), 40);
  window.setTimeout(() => applyAudienceMode(mode), 160);
}
function extractSkuFromText(text: string): string {
  const match = normaliseText(text).match(/[A-Z0-9]{2,}(?:-[A-Z0-9]+)+/);
  return normaliseText(match?.[0]).toUpperCase();
}

function forceHideLandingPitchLeak(): void {
  if (!isProductPitchPage()) return;

  const shell = document.querySelector<HTMLElement>(".wingman-shell") ?? document.body;
  const resultView = isProductPitchResultView();

  const previouslyHidden = Array.from(shell.querySelectorAll<HTMLElement>(".wm-product-pitch-landing-only-hidden"));

  if (resultView) {
    previouslyHidden.forEach((element) => {
      element.classList.remove("wm-product-pitch-landing-only-hidden");
      element.hidden = false;
      element.style.removeProperty("display");
      element.style.removeProperty("visibility");
    });

    return;
  }

  const candidates = Array.from(shell.querySelectorAll<HTMLElement>("section,article,div")).filter((element) => {
    if (element.classList.contains("wm-product-pitch-empty-state")) return false;
    if (element.classList.contains("wm-product-pitch-result-empty")) return false;
    if (element.closest(".wm-product-pitch-empty-state")) return false;
    if (element.closest(".wm-product-pitch-result-empty")) return false;

    const text = normaliseText(element.textContent);
    const lower = text.toLowerCase();

    if (lower.includes("choose the product")) return false;
    if (lower.includes("pitch setup")) return false;
    if (lower.includes("create a one-page wyrestorm product pitch")) return false;

    const hasSku = Boolean(extractSkuFromText(text));
    const score = [
      "copy summary",
      "customer-safe product positioning",
      "overview",
      "positioning",
      "best fit",
      "talk track",
      "questions to ask",
      "feature cues",
      "useful feature points",
    ].reduce((count, term) => {
      if (lower.includes(term)) return count + 1;
      return count;
    }, 0);

    if (hasSku && score >= 1) return true;
    if (score >= 4) return true;

    return false;
  });

  candidates.forEach((element) => {
    element.classList.add("wm-product-pitch-landing-only-hidden");
    element.hidden = true;
    element.style.setProperty("display", "none", "important");
    element.style.setProperty("visibility", "hidden", "important");
  });
}

let reconcileQueued = false;

function reconcile(): void {
  reconcileQueued = false;

  if (!isWingmanShellLoaded()) return;

  hydrateAudienceModeFromSelectOrStorage();
  forceHideLandingPitchLeak();
}

function scheduleReconcile(): void {
  if (reconcileQueued) return;

  reconcileQueued = true;

  window.requestAnimationFrame(reconcile);
}

export function installProductPitchInteractionFix(): void {
  if (typeof window === "undefined") return;

  const alreadyInstalled = document.body.dataset.wmProductPitchInteractionFixInstalled === "true";

  if (alreadyInstalled) return;

  document.body.dataset.wmProductPitchInteractionFixInstalled = "true";

  document.addEventListener("click", handleAudienceClick, true);
  document.addEventListener("change", scheduleReconcile, true);
  document.addEventListener("input", scheduleReconcile, true);

  window.addEventListener("popstate", scheduleReconcile);
  window.addEventListener("hashchange", scheduleReconcile);

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