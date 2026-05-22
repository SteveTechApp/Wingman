type WingmanRouteId =
  | "dashboard"
  | "projects"
  | "discovery"
  | "finder"
  | "productFamilies"
  | "productPitch"
  | "compare"
  | "templates"
  | "videowall"
  | "proposal"
  | "salesHelper"
  | "callCards"
  | "ingest"
  | "support"
  | "guru"
  | "unknown";

let installed = false;

const routeMatchers: Array<{ id: WingmanRouteId; patterns: string[] }> = [
  { id: "dashboard", patterns: ["/wingman/dashboard", "/dashboard"] },
  { id: "projects", patterns: ["/wingman/projects", "/projects"] },
  { id: "discovery", patterns: ["/wingman/discovery", "/app/tools/discovery", "/discovery"] },
  { id: "finder", patterns: ["/wingman/finder", "/app/tools/catalog", "/finder", "/catalog"] },
  { id: "productFamilies", patterns: ["/wingman/product-families", "/product-families"] },
  { id: "productPitch", patterns: ["/wingman/product-pitch", "/product-pitch"] },
  { id: "compare", patterns: ["/wingman/compare", "/app/tools/compare", "/compare"] },
  { id: "templates", patterns: ["/wingman/templates", "/app/tools/templates", "/templates"] },
  { id: "videowall", patterns: ["/wingman/videowall", "/videowall"] },
  { id: "proposal", patterns: ["/wingman/proposal", "/app/tools/proposal", "/proposal"] },
  { id: "salesHelper", patterns: ["/wingman/sales-helper", "/wingman/saleshelper", "/sales-helper", "/saleshelper"] },
  { id: "callCards", patterns: ["/wingman/call-cards", "/wingman/callcards", "/call-cards", "/callcards"] },
  { id: "ingest", patterns: ["/wingman/ingest", "/ingest"] },
  { id: "support", patterns: ["/wingman/support", "/support"] },
  { id: "guru", patterns: ["/wingman/guru", "/app/tools/guru", "/guru"] }
];

function detectWingmanRoute(pathname: string): WingmanRouteId {
  const path = pathname.toLowerCase();

  for (const route of routeMatchers) {
    for (const pattern of route.patterns) {
      if (path.includes(pattern.toLowerCase())) {
        return route.id;
      }
    }
  }

  return "unknown";
}

function applyWingmanRouteIdentity(): void {
  const routeId = detectWingmanRoute(window.location.pathname);

  document.body.dataset.wmRoute = routeId;

  const classNames = [
    "wm-route-dashboard",
    "wm-route-projects",
    "wm-route-discovery",
    "wm-route-finder",
    "wm-route-productFamilies",
    "wm-route-productPitch",
    "wm-route-compare",
    "wm-route-templates",
    "wm-route-videowall",
    "wm-route-proposal",
    "wm-route-salesHelper",
    "wm-route-callCards",
    "wm-route-ingest",
    "wm-route-support",
    "wm-route-guru",
    "wm-route-unknown"
  ];

  for (const className of classNames) {
    document.body.classList.remove(className);
  }

  document.body.classList.add(`wm-route-${routeId}`);
  document.body.classList.add("wm-brand-active");
}

function patchHistoryMethod(methodName: "pushState" | "replaceState"): void {
  const historyRecord = window.history as unknown as Record<string, (...args: unknown[]) => unknown>;
  const original = historyRecord[methodName].bind(window.history);

  historyRecord[methodName] = (...args: unknown[]) => {
    const result = original(...args);
    window.setTimeout(applyWingmanRouteIdentity, 0);
    return result;
  };
}

export function installWingmanVisualIdentity(): void {
  if (installed) {
    return;
  }

  installed = true;

  applyWingmanRouteIdentity();
  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("load", applyWingmanRouteIdentity);
  window.addEventListener("popstate", applyWingmanRouteIdentity);
  window.addEventListener("hashchange", applyWingmanRouteIdentity);
}
