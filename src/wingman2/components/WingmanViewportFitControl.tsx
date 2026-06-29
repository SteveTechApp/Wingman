import { useEffect, useState } from "react";

type ScreenFitMode = "standard" | "fourk" | "auto";

type FitMetrics = {
  physicalTargetWidth: number;
  physicalTargetHeight: number;
  cssCanvasWidth: number;
  cssCanvasHeight: number;
  stageWidth: number;
  stageHeight: number;
  devicePixelRatio: number;
  cssScale: number;
  visualScale: number;
  label: string;
};

const STORAGE_KEY = "wingman-screen-fit-mode-v1";

const modes: Array<{ id: ScreenFitMode; label: string; helper: string }> = [
  {
    id: "standard",
    label: "2K 1920x1200",
    helper: "16:10 2K canvas, boosted on high-DPI displays"
  },
  {
    id: "fourk",
    label: "4K 3840x2400",
    helper: "16:10 4K canvas"
  },
  {
    id: "auto",
    label: "Auto",
    helper: "Chooses the nearest 16:10 canvas"
  }
];

function readMode(): ScreenFitMode {
  if (typeof window === "undefined") return "standard";

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "standard" || stored === "fourk" || stored === "auto") {
    return stored;
  }

  return "standard";
}

function getDevicePixelRatio() {
  if (typeof window === "undefined") return 1;

  return Math.max(1, Number(window.devicePixelRatio || 1));
}

function resolvePhysicalTarget(mode: ScreenFitMode, physicalWidth: number, physicalHeight: number) {
  if (mode === "fourk") {
    return {
      width: 3840,
      height: 2400,
      label: "4K 3840x2400"
    };
  }

  if (mode === "auto") {
    if (physicalWidth >= 3200 && physicalHeight >= 1900) {
      return {
        width: 3840,
        height: 2400,
        label: "4K 3840x2400"
      };
    }
  }

  return {
    width: 1920,
    height: 1200,
    label: "2K 1920x1200"
  };
}

function getStageSize() {
  if (typeof window === "undefined") {
    return { width: 1920, height: 1200 };
  }

  const main = window.document.querySelector(".wingman-app-main");

  if (main instanceof HTMLElement) {
    const rect = main.getBoundingClientRect();

    return {
      width: Math.max(320, rect.width),
      height: Math.max(320, rect.height)
    };
  }

  return {
    width: Math.max(320, window.innerWidth),
    height: Math.max(320, window.innerHeight)
  };
}

function calculateMetrics(mode: ScreenFitMode): FitMetrics {
  const dpr = getDevicePixelRatio();
  const stage = getStageSize();

  const viewportPhysicalWidth = Math.round(stage.width * dpr);
  const viewportPhysicalHeight = Math.round(stage.height * dpr);
  const target = resolvePhysicalTarget(mode, viewportPhysicalWidth, viewportPhysicalHeight);

  const cssCanvasWidth = target.width / dpr;
  const cssCanvasHeight = target.height / dpr;

  const rawCssScale = Math.min(stage.width / cssCanvasWidth, stage.height / cssCanvasHeight);
  const cssScale = Math.max(0.45, Math.min(rawCssScale, 2.5));
  const visualScale = cssScale * dpr;

  return {
    physicalTargetWidth: target.width,
    physicalTargetHeight: target.height,
    cssCanvasWidth,
    cssCanvasHeight,
    stageWidth: stage.width,
    stageHeight: stage.height,
    devicePixelRatio: dpr,
    cssScale,
    visualScale,
    label: target.label
  };
}

function applyMetrics(mode: ScreenFitMode, metrics: FitMetrics) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const cssScale = Number(metrics.cssScale.toFixed(4));
  const visualScale = Number(metrics.visualScale.toFixed(4));

  const scaledWidth = Math.floor(metrics.cssCanvasWidth * cssScale);
  const scaledHeight = Math.floor(metrics.cssCanvasHeight * cssScale);

  root.dataset.wingmanScreenFit = metrics.physicalTargetWidth >= 3840 ? "fourk" : "standard";
  root.dataset.wingmanScreenFitPreference = mode;
  root.dataset.wingmanCanvasScaling = "true";
  root.dataset.wingmanDprAwareScaling = "true";

  root.style.setProperty("--wm-target-label", metrics.label);
  root.style.setProperty("--wm-target-width", `${Math.round(metrics.cssCanvasWidth)}px`);
  root.style.setProperty("--wm-target-height", `${Math.round(metrics.cssCanvasHeight)}px`);
  root.style.setProperty("--wm-physical-target-width", `${metrics.physicalTargetWidth}px`);
  root.style.setProperty("--wm-physical-target-height", `${metrics.physicalTargetHeight}px`);
  root.style.setProperty("--wm-fit-scale", String(cssScale));
  root.style.setProperty("--wm-visual-scale", String(visualScale));
  root.style.setProperty("--wm-fit-scale-percent", `${Math.round(cssScale * 100)}%`);
  root.style.setProperty("--wm-visual-scale-percent", `${Math.round(visualScale * 100)}%`);
  root.style.setProperty("--wm-device-pixel-ratio", String(metrics.devicePixelRatio));
  root.style.setProperty("--wm-scaled-target-width", `${scaledWidth}px`);
  root.style.setProperty("--wm-scaled-target-height", `${scaledHeight}px`);
  root.style.setProperty("--wm-stage-width", `${Math.floor(metrics.stageWidth)}px`);
  root.style.setProperty("--wm-stage-height", `${Math.floor(metrics.stageHeight)}px`);
}

export function WingmanViewportFitControl() {
  const [mode, setMode] = useState<ScreenFitMode>(() => readMode());
  const [metrics, setMetrics] = useState<FitMetrics>(() => calculateMetrics(readMode()));

  useEffect(() => {
    let frame = 0;
    let observer: ResizeObserver | null = null;

    const measure = () => {
      window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        const nextMetrics = calculateMetrics(mode);
        setMetrics(nextMetrics);
        applyMetrics(mode, nextMetrics);
      });
    };

    measure();

    window.addEventListener("resize", measure);

    const main = window.document.querySelector(".wingman-app-main");

    if (main instanceof HTMLElement && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(main);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [mode]);

  const updateMode = (nextMode: ScreenFitMode) => {
    setMode(nextMode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
      window.dispatchEvent(new CustomEvent("wingman:screen-fit-mode-changed", { detail: nextMode }));
    }
  };

  const visualPercent = `${Math.round(metrics.visualScale * 100)}%`;
  const cssPercent = `${Math.round(metrics.cssScale * 100)}%`;

  return (
    <label
      className="wm-screen-fit-control"
      title={`Screen fit: ${metrics.label}. Visual scale: ${visualPercent}. CSS scale: ${cssPercent}. DPR: ${metrics.devicePixelRatio.toFixed(2)}. Workspace: ${Math.round(metrics.stageWidth)} x ${Math.round(metrics.stageHeight)} CSS px.`}
    >
      <span>Fit</span>
      <select value={mode} onChange={(event) => updateMode(event.target.value as ScreenFitMode)}>
        {modes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <small className="wm-screen-fit-scale">{visualPercent}</small>
    </label>
  );
}
