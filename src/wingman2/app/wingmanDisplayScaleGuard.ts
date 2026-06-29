const WINGMAN_SCALE_VARIABLES: Record<string, string> = {
  "--wm-fit-scale": "1",
  "--wm-visual-scale": "1",
  "--wm-visual-scale-percent": "100%",
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
    root.style.setProperty(name, value);
  });

  root.style.removeProperty("--wm-scaled-target-width");
  root.style.removeProperty("--wm-scaled-target-height");
}

clampWingmanDisplayScale();

window.addEventListener("resize", clampWingmanDisplayScale);
window.addEventListener("orientationchange", clampWingmanDisplayScale);

const wingmanScaleObserver = new MutationObserver(() => {
  window.requestAnimationFrame(clampWingmanDisplayScale);
});

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