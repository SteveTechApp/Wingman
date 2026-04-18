type ViewportMode = "desktop" | "mobile";
type RootVarMap = Record<string, string>;

const DESKTOP_VARS: RootVarMap = {
  "--wm-frame-ratio": "16 / 9",
  "--wm-frame-gutter": "24px",
  "--wm-frame-inline-size": "calc(100dvw - 48px)",
  "--wm-frame-block-size": "calc(100dvh - 48px)",
  "--wm-page-max-width": "calc(100dvw - 48px)",
  "--wm-app-scale": "1",
  "--wm-fit-radius": "24px",
  "--wm-fit-surface-pad": "14px",
};

const MOBILE_VARS: RootVarMap = {
  "--wm-frame-ratio": "1 / 1",
  "--wm-frame-gutter": "12px",
  "--wm-frame-inline-size": "min(calc(100dvw - 24px), 520px)",
  "--wm-frame-block-size": "min(calc(100dvw - 24px), calc(100dvh - 24px))",
  "--wm-page-max-width": "min(calc(100dvw - 24px), 520px)",
  "--wm-app-scale": "1",
  "--wm-fit-radius": "16px",
  "--wm-fit-surface-pad": "10px",
};

function isPhoneLikeViewport(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator === "undefined") return false;

  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const shortestSide = Math.min(width, height);

  const noHover = window.matchMedia("(hover: none)").matches;
  const coarsePointer =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(any-pointer: coarse)").matches;

  const userAgent = navigator.userAgent || "";
  const uaPhone = /\b(Android|webOS|iPhone|iPod|Windows Phone|Mobile)\b/i.test(userAgent);
  const uaTablet = /\b(iPad|Tablet)\b/i.test(userAgent);

  if (uaTablet) return false;
  if (shortestSide > 520) return false;
  if (uaPhone) return true;
  if (noHover && coarsePointer) return true;

  return false;
}

function applyRootVars(vars: RootVarMap): void {
  const root = document.documentElement;

  Object.entries(vars).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });
}

function syncViewportFitMode(): ViewportMode {
  const root = document.documentElement;
  const mode: ViewportMode = isPhoneLikeViewport() ? "mobile" : "desktop";

  root.dataset.wmViewportMode = mode;
  applyRootVars(mode === "mobile" ? MOBILE_VARS : DESKTOP_VARS);

  return mode;
}

export function installViewportFitMode(): () => void {
  if (typeof window === "undefined") return () => {};
  if (typeof document === "undefined") return () => {};

  const update = () => {
    syncViewportFitMode();
  };

  update();

  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);

  return () => {
    window.removeEventListener("resize", update);
    window.removeEventListener("orientationchange", update);
  };
}

export default installViewportFitMode;