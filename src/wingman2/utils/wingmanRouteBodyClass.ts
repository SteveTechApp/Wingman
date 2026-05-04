let wingmanRouteBodyClassInstalled = false;

function syncWingmanRouteBodyClass(): void {
  const path = window.location.pathname.toLowerCase();

  const isDiscoveryRoute =
    path.includes("/wingman/discovery") ||
    path.includes("/app/tools/discovery") ||
    path.endsWith("/discovery");

  document.body.classList.toggle("wm-route-discovery", isDiscoveryRoute);
}

function patchHistoryMethod(methodName: "pushState" | "replaceState"): void {
  const historyRecord = window.history as unknown as Record<string, (...args: unknown[]) => unknown>;
  const original = historyRecord[methodName].bind(window.history);

  historyRecord[methodName] = (...args: unknown[]) => {
    const result = original(...args);
    window.setTimeout(syncWingmanRouteBodyClass, 0);
    return result;
  };
}

export function installWingmanRouteBodyClass(): void {
  if (wingmanRouteBodyClassInstalled) {
    return;
  }

  wingmanRouteBodyClassInstalled = true;

  syncWingmanRouteBodyClass();

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("popstate", syncWingmanRouteBodyClass);
  window.addEventListener("hashchange", syncWingmanRouteBodyClass);
}