type FeatureTone =
  | "dashboard"
  | "projects"
  | "guru"
  | "discovery"
  | "catalog"
  | "proposal"
  | "navigator"
  | "compare"
  | "training"
  | "templates"
  | "import"
  | "videowall"
  | "workspace";

declare global {
  interface Window {
    __wmFeatureToneInstalled?: boolean;
    __wmFeatureToneCleanup?: () => void;
  }
}

function getFeatureFromPath(pathname: string): FeatureTone {
  const path = pathname.toLowerCase();

  if (path === "/" || path.includes("/app/dashboard")) return "dashboard";
  if (path.includes("/app/projects")) return "projects";
  if (path.includes("/guru")) return "guru";
  if (path.includes("/discovery")) return "discovery";
  if (path.includes("/catalog")) return "catalog";
  if (path.includes("/proposal")) return "proposal";
  if (path.includes("/navigator")) return "navigator";
  if (path.includes("/compare")) return "compare";
  if (path.includes("/competitor")) return "compare";
  if (path.includes("/training")) return "training";
  if (path.includes("/templates")) return "templates";
  if (path.includes("/import")) return "import";
  if (path.includes("/video-wall")) return "videowall";
  if (path.includes("/videowall")) return "videowall";
  if (path.includes("/room-wizard")) return "workspace";
  if (path.includes("/settings")) return "workspace";

  return "workspace";
}

function applyFeatureTone(): void {
  const feature = getFeatureFromPath(window.location.pathname);
  const root = document.documentElement;
  const shell = document.querySelector(".wm-shell-root");

  root.dataset.wmFeature = feature;

  if (shell instanceof HTMLElement) {
    shell.dataset.wmFeature = feature;
  }
}

export function installWingmanFeatureTone(): () => void {
  if (typeof window === "undefined") return () => {};
  if (typeof document === "undefined") return () => {};

  if (window.__wmFeatureToneInstalled) {
    return window.__wmFeatureToneCleanup ?? (() => {});
  }

  const sync = () => {
    applyFeatureTone();
  };

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  const patchedPushState: History["pushState"] = (...args: Parameters<History["pushState"]>) => {
    const result = originalPushState(...args);
    queueMicrotask(sync);
    return result;
  };

  const patchedReplaceState: History["replaceState"] = (...args: Parameters<History["replaceState"]>) => {
    const result = originalReplaceState(...args);
    queueMicrotask(sync);
    return result;
  };

  history.pushState = patchedPushState;
  history.replaceState = patchedReplaceState;

  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
  window.addEventListener("resize", sync);

  sync();

  const cleanup = () => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", sync);
    window.removeEventListener("hashchange", sync);
    window.removeEventListener("resize", sync);
    window.__wmFeatureToneInstalled = false;
    window.__wmFeatureToneCleanup = undefined;
  };

  window.__wmFeatureToneInstalled = true;
  window.__wmFeatureToneCleanup = cleanup;

  return cleanup;
}

export default installWingmanFeatureTone;