import { useEffect } from "react";

const SCALE_ATTRIBUTES = [
  "data-wingman-screen-fit",
  "data-wingman-canvas-scaling",
];

const SCALE_PROPERTIES = [
  "--wm-target-width",
  "--wm-target-height",
  "--wm-physical-target-width",
  "--wm-physical-target-height",
  "--wm-stage-width",
  "--wm-stage-height",
  "--wm-fit-scale",
  "--wm-visual-scale",
  "--wm-page-scale",
  "--wm-screen-density",
  "--wm-fit-scale-percent",
  "--wm-visual-scale-percent",
  "--wm-scaled-target-left",
  "--wm-scaled-target-top",
];

export function resetWingmanViewportScaling(): void {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  for (const attribute of SCALE_ATTRIBUTES) {
    root.removeAttribute(attribute);
  }

  for (const property of SCALE_PROPERTIES) {
    root.style.removeProperty(property);
  }
}

export function WingmanViewportFitControl(): null {
  useEffect(() => {
    resetWingmanViewportScaling();

    const timeout = window.setTimeout(resetWingmanViewportScaling, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}

export default WingmanViewportFitControl;