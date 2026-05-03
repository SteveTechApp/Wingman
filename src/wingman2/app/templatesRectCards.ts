const TEMPLATES_PATH_PATTERN = /(?:^|\/)(wingman\/templates|wingman\/room-templates|app\/tools\/templates|templates|room-templates)(?:\/|$)/i;
const BODY_CLASS = "wm-templates-rect-mode";

function isTemplatesPath(): boolean {
  return TEMPLATES_PATH_PATTERN.test(window.location.pathname);
}

function updateTemplatesRectMode(): void {
  document.body.classList.toggle(BODY_CLASS, isTemplatesPath());
}

let refreshTimer = 0;

function scheduleRefresh(): void {
  if (refreshTimer) {
    return;
  }

  refreshTimer = window.setTimeout(() => {
    refreshTimer = 0;
    updateTemplatesRectMode();
  }, 60);
}

function patchHistoryEvents(): void {
  const historyWithPatchFlag = window.history as History & {
    __wmTemplatesRectCardsPatched?: boolean;
  };

  if (historyWithPatchFlag.__wmTemplatesRectCardsPatched) {
    return;
  }

  historyWithPatchFlag.__wmTemplatesRectCardsPatched = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithTemplatesRectCards(...args: Parameters<History["pushState"]>) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };

  window.history.replaceState = function replaceStateWithTemplatesRectCards(...args: Parameters<History["replaceState"]>) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  patchHistoryEvents();

  window.addEventListener("popstate", scheduleRefresh);
  window.addEventListener("hashchange", scheduleRefresh);
  window.addEventListener("wm:navigation", scheduleRefresh);
  window.addEventListener("DOMContentLoaded", scheduleRefresh);

  scheduleRefresh();
}

export {};