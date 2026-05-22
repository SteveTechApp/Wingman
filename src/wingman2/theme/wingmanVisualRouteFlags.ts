function routeFromPath(pathname: string): string {
  const path = pathname.toLowerCase();

  if (path.includes("/compare")) return "compare";
  if (path.includes("/competitor")) return "compare";
  if (path.includes("/product-pitch")) return "product-pitch";
  if (path.includes("/finder")) return "finder";
  if (path.includes("/discovery")) return "discovery";
  if (path.includes("/templates")) return "templates";
  if (path.includes("/video-wall")) return "video-wall";
  if (path.includes("/sales-language")) return "sales-language";
  if (path.includes("/proposal")) return "proposal";
  if (path.includes("/projects")) return "projects";
  if (path.includes("/document-ingest")) return "document-ingest";
  if (path.includes("/product-families")) return "product-families";
  if (path.includes("/live-call-cards")) return "live-call-cards";
  if (path.includes("/support")) return "support";
  if (path.includes("/dashboard")) return "dashboard";
  if (path.includes("/wingman")) return "dashboard";

  return "unknown";
}

function applyVisualRouteFlag(): void {
  const route = routeFromPath(window.location.pathname);

  document.body.dataset.wmVisualRoute = route;
  document.documentElement.dataset.wmVisualRoute = route;
}

function patchHistoryMethod(methodName: "pushState" | "replaceState"): void {
  const original = window.history[methodName];

  window.history[methodName] = function patchedHistoryMethod(...args) {
    const result = original.apply(this, args);

    window.requestAnimationFrame(applyVisualRouteFlag);

    return result;
  };
}

export function installWingmanVisualRouteFlags(): void {
  if (typeof window === "undefined") return;

  const alreadyInstalled = document.body.dataset.wmVisualRouteFlagsInstalled === "true";

  if (alreadyInstalled) return;

  document.body.dataset.wmVisualRouteFlagsInstalled = "true";

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("popstate", applyVisualRouteFlag);
  window.addEventListener("hashchange", applyVisualRouteFlag);

  document.addEventListener(
    "click",
    () => {
      window.requestAnimationFrame(applyVisualRouteFlag);
      window.setTimeout(applyVisualRouteFlag, 80);
    },
    true
  );

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyVisualRouteFlag, { once: true });
    return;
  }

  applyVisualRouteFlag();
}