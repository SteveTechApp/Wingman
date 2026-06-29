const DASHBOARD_STANDALONE_ATTR = "data-wingman-dashboard-standalone";

function isDashboardRoute() {
  const path = window.location.pathname.replace(/\/+$/, "");
  const htmlRoute = document.documentElement.getAttribute("data-wingman-route");

  return path === "/wingman" || path === "/wingman/dashboard" || htmlRoute === "dashboard";
}

function applyDashboardStandaloneMode() {
  const html = document.documentElement;

  if (!isDashboardRoute()) {
    html.removeAttribute(DASHBOARD_STANDALONE_ATTR);
    return;
  }

  html.setAttribute(DASHBOARD_STANDALONE_ATTR, "true");

  html.removeAttribute("data-wingman-canvas-scaling");
  html.removeAttribute("data-wingman-screen-fit");
  html.removeAttribute("data-wingman-dpr-aware-scaling");

  html.style.setProperty("--wm-fit-scale", "1");
  html.style.setProperty("--wm-visual-scale", "1");
  html.style.setProperty("--wm-page-scale", "1");
  html.style.setProperty("--wm-screen-density", "1");
  html.style.setProperty("--wm-stage-width", "100vw");
  html.style.setProperty("--wm-stage-height", "100vh");
  html.style.setProperty("--wm-scaled-target-left", "0px");
  html.style.setProperty("--wm-scaled-target-top", "0px");
}

function scheduleDashboardStandaloneMode() {
  window.requestAnimationFrame(applyDashboardStandaloneMode);
}

applyDashboardStandaloneMode();

const observer = new MutationObserver(scheduleDashboardStandaloneMode);

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: [
    "data-wingman-route",
    "data-wingman-canvas-scaling",
    "data-wingman-screen-fit",
    "data-wingman-dpr-aware-scaling",
    "style",
  ],
});

window.addEventListener("resize", scheduleDashboardStandaloneMode);
window.addEventListener("popstate", scheduleDashboardStandaloneMode);
window.addEventListener("hashchange", scheduleDashboardStandaloneMode);

const originalPushState = window.history.pushState;
const originalReplaceState = window.history.replaceState;

window.history.pushState = function pushState(...args) {
  const result = originalPushState.apply(this, args);
  scheduleDashboardStandaloneMode();
  return result;
};

window.history.replaceState = function replaceState(...args) {
  const result = originalReplaceState.apply(this, args);
  scheduleDashboardStandaloneMode();
  return result;
};

export const WingmanDashboardStandaloneGuard = {
  marker: "WingmanDashboardStandaloneGuard",
  purpose: "Dashboard route opts out of canvas/screen-fit scaling so the landing page can match the standalone mock-up.",
} as const;