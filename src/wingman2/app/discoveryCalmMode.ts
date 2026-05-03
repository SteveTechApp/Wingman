const DISCOVERY_BODY_CLASS = "wm-discovery-calm";

const discoveryPathPattern = /(?:^|\/)(wingman\/discovery|app\/tools\/discovery|discovery)(?:\/|$)/i;

function isDiscoveryPath(): boolean {
  return discoveryPathPattern.test(window.location.pathname);
}

function updateDiscoveryBodyClass(): void {
  document.body.classList.toggle(DISCOVERY_BODY_CLASS, isDiscoveryPath());
}

function markDiscoveryElements(): void {
  if (!isDiscoveryPath()) {
    return;
  }

  const root = document.querySelector("main");

  if (!root) {
    return;
  }

  root.querySelectorAll("button").forEach((button) => {
    const label = (button.textContent ?? "").replace(/\s+/g, " ").trim();

    if (/^add path:/i.test(label)) {
      button.classList.add("wm-discovery-add-path-btn");
    }

    if (/^\d+\s+[A-Za-z]/.test(label)) {
      button.classList.add("wm-discovery-step-chip");
    }
  });

  root.querySelectorAll("section, article, div").forEach((element) => {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();

    if (text.includes("Signal path:") && text.includes("Design note:")) {
      element.classList.add("wm-discovery-path-summary");
    }

    if (text.includes("PATH NOTES") && element.querySelector("textarea") && element.querySelector("select")) {
      element.classList.add("wm-discovery-signal-card");
    }
  });
}

let rafHandle = 0;

function scheduleDiscoveryCalmRefresh(): void {
  if (rafHandle) {
    return;
  }

  rafHandle = window.requestAnimationFrame(() => {
    rafHandle = 0;
    updateDiscoveryBodyClass();
    markDiscoveryElements();
  });
}

function patchHistoryEvents(): void {
  const historyWithPatchFlag = window.history as History & { __wmDiscoveryCalmPatched?: boolean };

  if (historyWithPatchFlag.__wmDiscoveryCalmPatched) {
    return;
  }

  historyWithPatchFlag.__wmDiscoveryCalmPatched = true;

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function pushStateWithDiscoveryCalm(...args) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };

  window.history.replaceState = function replaceStateWithDiscoveryCalm(...args) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event("wm:navigation"));
    return result;
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  patchHistoryEvents();

  window.addEventListener("popstate", scheduleDiscoveryCalmRefresh);
  window.addEventListener("hashchange", scheduleDiscoveryCalmRefresh);
  window.addEventListener("wm:navigation", scheduleDiscoveryCalmRefresh);
  window.addEventListener("DOMContentLoaded", scheduleDiscoveryCalmRefresh);

  const observer = new MutationObserver(scheduleDiscoveryCalmRefresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  scheduleDiscoveryCalmRefresh();
}

export {};