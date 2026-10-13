const WINGMAN_SCALE_VARIABLES: Record<string, string> = {
  "--wm-fit-scale": "0.9",
  "--wm-visual-scale": "0.9",
  "--wm-visual-scale-percent": "90%",
  "--wm-app-scale": "0.9",
  "--wm-scaled-target-left": "0px",
  "--wm-scaled-target-top": "0px",
};

function clampWingmanDisplayScale(): void {
  const root = document.documentElement;
  const isWingmanRoute = window.location.pathname.startsWith("/wingman");

  if (!isWingmanRoute) {
    return;
  }

  Object.entries(WINGMAN_SCALE_VARIABLES).forEach(([name, value]) => {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  });

  for (const name of ["--wm-scaled-target-width", "--wm-scaled-target-height"]) {
    if (root.style.getPropertyValue(name)) root.style.removeProperty(name);
  }
}

clampWingmanDisplayScale();

let clampQueued = false;
function queueClamp(): void {
  if (clampQueued) return;
  clampQueued = true;
  window.requestAnimationFrame(() => {
    clampQueued = false;
    clampWingmanDisplayScale();
  });
}

window.addEventListener("resize", queueClamp);
window.addEventListener("orientationchange", queueClamp);

const wingmanScaleObserver = new MutationObserver(queueClamp);

wingmanScaleObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: [
    "style",
    "data-wingman-screen-fit",
    "data-wingman-canvas-scaling",
    "data-wingman-dpr-aware-scaling",
    "data-wingman-route",
  ],
});

export {};
