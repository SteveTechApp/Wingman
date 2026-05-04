import {
  DEFAULT_SALES_CONVERSATION_TONE_ID,
  LEGACY_SALES_CONVERSATION_STORAGE_KEYS,
  normalizeSalesConversationToneId,
  SALES_CONVERSATION_TYPE_STORAGE_KEY,
  salesConversationToneOptions,
  type SalesConversationToneId,
} from "../lib/salesConversationTone";

type SalesMode = {
  id: SalesConversationToneId;
  label: string;
  description: string;
};

const salesModes: SalesMode[] = salesConversationToneOptions.map((option) => ({
  id: option.id,
  label: option.label,
  description: option.shortDescription,
}));

let installed = false;
let refreshQueued = false;

function isSalesModeId(value: unknown): value is SalesConversationToneId {
  return salesConversationToneOptions.some((option) => option.id === value);
}

function getSavedSalesMode(): SalesConversationToneId {
  const saved = window.localStorage.getItem(SALES_CONVERSATION_TYPE_STORAGE_KEY);

  if (saved) {
    return normalizeSalesConversationToneId(saved);
  }

  for (const key of LEGACY_SALES_CONVERSATION_STORAGE_KEYS) {
    const legacy = window.localStorage.getItem(key);

    if (legacy) {
      return normalizeSalesConversationToneId(legacy);
    }
  }

  return DEFAULT_SALES_CONVERSATION_TONE_ID;
}

function applySalesMode(modeId: SalesConversationToneId): void {
  window.localStorage.setItem(SALES_CONVERSATION_TYPE_STORAGE_KEY, modeId);
  document.body.dataset.wingmanSalesMode = modeId;

  document.body.classList.remove(
    "wm-sales-mode-trade",
    "wm-sales-mode-user",
    "wm-sales-mode-consultant",
    "wm-sales-mode-warm",
    "wm-sales-mode-problem",
    "wm-sales-mode-value",
    "wm-sales-mode-expert",
    "wm-sales-mode-handoff"
  );

  document.body.classList.add(`wm-sales-mode-${modeId}`);

  window.dispatchEvent(
    new CustomEvent("wingman:sales-mode-change", {
      detail: {
        mode: modeId
      }
    })
  );

  refreshToolbarState();
}

function createToolbar(): HTMLElement {
  const toolbar = document.createElement("div");
  toolbar.className = "wm-sales-mode-global";
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", "Wingman sales conversation type");

  const label = document.createElement("div");
  label.className = "wm-sales-mode-global__label";
  label.textContent = "Conversation type";

  const buttons = document.createElement("div");
  buttons.className = "wm-sales-mode-global__buttons";

  for (const mode of salesModes) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wm-sales-mode-global__button";
    button.dataset.salesMode = mode.id;
    button.setAttribute("aria-label", `${mode.label}: ${mode.description}`);
    button.addEventListener("click", () => applySalesMode(mode.id));

    const top = document.createElement("span");
    top.className = "wm-sales-mode-global__button-label";
    top.textContent = mode.label;

    const bottom = document.createElement("span");
    bottom.className = "wm-sales-mode-global__button-description";
    bottom.textContent = mode.description;

    button.appendChild(top);
    button.appendChild(bottom);
    buttons.appendChild(button);
  }

  toolbar.appendChild(label);
  toolbar.appendChild(buttons);

  return toolbar;
}

function refreshToolbarState(): void {
  const active = getSavedSalesMode();
  const toolbar = document.querySelector(".wm-sales-mode-global");

  if (!(toolbar instanceof HTMLElement)) {
    return;
  }

  const buttons = Array.from(toolbar.querySelectorAll("button[data-sales-mode]")).filter(
    (node): node is HTMLButtonElement => node instanceof HTMLButtonElement
  );

  for (const button of buttons) {
    const isActive = button.dataset.salesMode === active;
    button.classList.toggle("wm-sales-mode-global__button--active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function getMountTarget(): HTMLElement {
  const fromMain = document.querySelector(".wingman-app-main");

  if (fromMain instanceof HTMLElement) {
    return fromMain;
  }

  const fromMainTag = document.querySelector("main");

  if (fromMainTag instanceof HTMLElement) {
    return fromMainTag;
  }

  const fromRoot = document.getElementById("root");

  if (fromRoot instanceof HTMLElement) {
    return fromRoot;
  }

  return document.body;
}

function mountToolbar(): void {
  const existing = document.querySelector(".wm-sales-mode-global");

  if (document.body.dataset.wmRoute === "dashboard") {
    if (existing instanceof HTMLElement) {
      existing.remove();
    }

    return;
  }

  if (existing instanceof HTMLElement) {
    refreshToolbarState();
    return;
  }

  const target = getMountTarget();
  const toolbar = createToolbar();
  target.prepend(toolbar);
  refreshToolbarState();
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function hideLegacySalesPanels(): void {
  if (document.body.dataset.wmRoute === "dashboard") {
    return;
  }

  const candidates = Array.from(document.querySelectorAll("section, article, aside, div")).filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );

  for (const candidate of candidates) {
    if (candidate.classList.contains("wm-sales-mode-global") || candidate.closest(".wm-sales-mode-global")) {
      continue;
    }

    const text = normalizeText(candidate.textContent);
    const rect = candidate.getBoundingClientRect();

    if (
      !text.includes("sales language mode") &&
      !text.includes("sales conversation type") &&
      !text.includes("choose who you are selling to") &&
      !text.includes("keep the opening easy")
    ) {
      continue
    }

    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    if (rect.width > window.innerWidth * 0.95) {
      continue;
    }

    if (rect.height > 320) {
      continue;
    }

    candidate.style.display = "none";
  }
}

function refreshSalesModeUiNow(): void {
  mountToolbar();
  hideLegacySalesPanels();
  refreshToolbarState();
}

function queueRefreshSalesModeUi(): void {
  if (refreshQueued) {
    return;
  }

  refreshQueued = true;

  window.requestAnimationFrame(() => {
    refreshQueued = false;
    refreshSalesModeUiNow();
  });
}

function patchHistoryMethod(methodName: "pushState" | "replaceState"): void {
  const historyRecord = window.history as unknown as Record<string, (...args: unknown[]) => unknown>;
  const original = historyRecord[methodName].bind(window.history);

  historyRecord[methodName] = (...args: unknown[]) => {
    const result = original(...args);
    window.setTimeout(queueRefreshSalesModeUi, 0);
    return result;
  };
}

export function installWingmanSalesMode(): void {
  if (installed) {
    return;
  }

  installed = true;

  applySalesMode(getSavedSalesMode());
  queueRefreshSalesModeUi();

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  const observer = new MutationObserver(() => {
    queueRefreshSalesModeUi();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener("wingman:sales-mode-request", (event) => {
    const requested = event instanceof CustomEvent ? event.detail?.mode : null;

    if (!requested) {
      return;
    }

    const normalized = normalizeSalesConversationToneId(requested);

    if (isSalesModeId(normalized)) {
      applySalesMode(normalized);
    }
  });

  window.addEventListener("load", queueRefreshSalesModeUi);
  window.addEventListener("popstate", queueRefreshSalesModeUi);
  window.addEventListener("hashchange", queueRefreshSalesModeUi);
}
