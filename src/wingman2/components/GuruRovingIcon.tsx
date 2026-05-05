import { useEffect } from "react";

type Point = {
  x: number;
  y: number;
};

const STORAGE_KEY = "wingman:guru-roving-icon-position";
const ICON_SIZE = 78;
const EDGE_GAP = 14;
const DRAG_THRESHOLD = 6;

function defaultPoint(): Point {
  if (typeof window === "undefined") {
    return { x: 24, y: 140 };
  }

  return {
    x: Math.max(EDGE_GAP, window.innerWidth - ICON_SIZE - EDGE_GAP),
    y: Math.max(EDGE_GAP, window.innerHeight - ICON_SIZE - 96),
  };
}

function clampPoint(point: Point): Point {
  if (typeof window === "undefined") {
    return point;
  }

  const maxX = Math.max(EDGE_GAP, window.innerWidth - ICON_SIZE - EDGE_GAP);
  const maxY = Math.max(EDGE_GAP, window.innerHeight - ICON_SIZE - EDGE_GAP);

  return {
    x: Math.min(Math.max(point.x, EDGE_GAP), maxX),
    y: Math.min(Math.max(point.y, EDGE_GAP), maxY),
  };
}

function loadPoint(): Point {
  if (typeof window === "undefined") {
    return defaultPoint();
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return defaultPoint();
  }

  try {
    const parsed = JSON.parse(stored) as Partial<Point>;

    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return clampPoint({ x: parsed.x, y: parsed.y });
    }
  } catch {
    return defaultPoint();
  }

  return defaultPoint();
}

function savePoint(point: Point): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clampPoint(point)));
}

function isVisibleCandidate(node: HTMLElement): boolean {
  if (node.dataset.guruRovingClone === "true") {
    return false;
  }

  if (node.closest("[data-guru-roving-clone='true']")) {
    return false;
  }

  if (node.closest("[data-guru-panel='true']")) {
    return false;
  }

  const rect = node.getBoundingClientRect();

  if (rect.width > 220 || rect.height > 220) {
    return false;
  }

  return true;
}

function findGuruLauncher(): HTMLElement | null {
  const selectors = [
    "[data-guru-launcher]",
    ".wingman-guru-launcher",
    ".guru-floating-button",
    "button[aria-label*='Guru']",
    "button[aria-label*='guru']",
    "button[title*='Guru']",
    "button[title*='guru']",
    "img[alt*='Guru']",
    "img[alt*='guru']",
    "img[src*='guru']",
    "img[src*='Guru']",
    "img[src*='bot']",
    "img[src*='Bot']",
  ];

  for (const selector of selectors) {
    const matches = Array.from(document.querySelectorAll(selector));

    for (const match of matches) {
      const node = match as HTMLElement;
      const launcher = node.tagName.toLowerCase() === "img"
        ? node.closest("button,a,[role='button'],div")
        : node;

      if (!(launcher instanceof HTMLElement)) {
        continue;
      }

      if (!isVisibleCandidate(launcher)) {
        continue;
      }

      return launcher;
    }
  }

  return null;
}

function getExistingIconSource(launcher: HTMLElement | null): string {
  const image = launcher?.querySelector("img") as HTMLImageElement | null;

  if (image?.currentSrc) {
    return image.currentSrc;
  }

  if (image?.src) {
    return image.src;
  }

  return "/guru.png";
}

function hideOriginalLauncher(launcher: HTMLElement): void {
  launcher.dataset.guruOriginalHiddenByRover = "true";
  launcher.style.setProperty("display", "none", "important");
  launcher.style.setProperty("pointer-events", "none", "important");
}

function styleClone(button: HTMLButtonElement, point: Point): void {
  button.dataset.guruRovingClone = "true";
  button.type = "button";
  button.setAttribute("aria-label", "Open Guru assistant");
  button.title = "Guru assistant";

  button.style.setProperty("position", "fixed", "important");
  button.style.setProperty("left", "0px", "important");
  button.style.setProperty("top", "0px", "important");
  button.style.setProperty("right", "auto", "important");
  button.style.setProperty("bottom", "auto", "important");
  button.style.setProperty("width", `${ICON_SIZE}px`, "important");
  button.style.setProperty("height", `${ICON_SIZE}px`, "important");
  button.style.setProperty("z-index", "2147483000", "important");
  button.style.setProperty("display", "grid", "important");
  button.style.setProperty("place-items", "center", "important");
  button.style.setProperty("padding", "0", "important");
  button.style.setProperty("margin", "0", "important");
  button.style.setProperty("border", "0", "important");
  button.style.setProperty("outline", "0", "important");
  button.style.setProperty("background", "transparent", "important");
  button.style.setProperty("background-color", "transparent", "important");
  button.style.setProperty("box-shadow", "none", "important");
  button.style.setProperty("border-radius", "999px", "important");
  button.style.setProperty("cursor", "grab", "important");
  button.style.setProperty("touch-action", "none", "important");
  button.style.setProperty("user-select", "none", "important");
  button.style.setProperty("-webkit-user-select", "none", "important");
  button.style.setProperty("filter", "drop-shadow(0 18px 32px rgba(0, 0, 0, 0.45))", "important");
  button.style.setProperty("transform", `translate3d(${point.x}px, ${point.y}px, 0)`, "important");
}

function styleCloneImage(image: HTMLImageElement): void {
  image.draggable = false;
  image.alt = "Guru";
  image.style.setProperty("width", "100%", "important");
  image.style.setProperty("height", "100%", "important");
  image.style.setProperty("object-fit", "contain", "important");
  image.style.setProperty("display", "block", "important");
  image.style.setProperty("background", "transparent", "important");
  image.style.setProperty("background-color", "transparent", "important");
  image.style.setProperty("border", "0", "important");
  image.style.setProperty("box-shadow", "none", "important");
  image.style.setProperty("border-radius", "0", "important");
  image.style.setProperty("pointer-events", "none", "important");
}

export function GuruRovingIcon() {
  useEffect(() => {
    let originalLauncher: HTMLElement | null = findGuruLauncher();
    let point = loadPoint();

    const cloneButton = document.createElement("button");
    const cloneImage = document.createElement("img");
    const fallbackSources = ["/guru.png", "/Guru-Bot.png", "/guru-bot.png", "/wingman-logo.png"];
    let fallbackIndex = 0;

    cloneImage.src = getExistingIconSource(originalLauncher);
    cloneImage.onerror = () => {
      const nextSource = fallbackSources[fallbackIndex];

      fallbackIndex += 1;

      if (nextSource) {
        cloneImage.src = nextSource;
      }
    };

    cloneButton.appendChild(cloneImage);
    document.body.appendChild(cloneButton);

    styleClone(cloneButton, point);
    styleCloneImage(cloneImage);

    if (originalLauncher) {
      hideOriginalLauncher(originalLauncher);
    }

    let active = false;
    let moved = false;
    let suppressClick = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;
    let activePointerId = -1;

    const setPoint = (nextPoint: Point) => {
      point = clampPoint(nextPoint);
      cloneButton.style.setProperty("transform", `translate3d(${point.x}px, ${point.y}px, 0)`, "important");
    };

    const refreshOriginalLauncher = () => {
      const latestLauncher = findGuruLauncher();

      if (!latestLauncher) {
        return;
      }

      originalLauncher = latestLauncher;
      hideOriginalLauncher(latestLauncher);

      const latestImageSource = getExistingIconSource(latestLauncher);

      if (latestImageSource && cloneImage.src !== latestImageSource) {
        cloneImage.src = latestImageSource;
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      active = true;
      moved = false;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      originX = point.x;
      originY = point.y;

      cloneButton.style.setProperty("cursor", "grabbing", "important");
      cloneButton.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!active) {
        return;
      }

      if (activePointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
        moved = true;
      }

      setPoint({
        x: originX + deltaX,
        y: originY + deltaY,
      });

      event.preventDefault();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!active) {
        return;
      }

      if (activePointerId !== event.pointerId) {
        return;
      }

      active = false;
      activePointerId = -1;

      cloneButton.style.setProperty("cursor", "grab", "important");
      savePoint(point);

      try {
        cloneButton.releasePointerCapture(event.pointerId);
      } catch {
        activePointerId = -1;
      }

      if (moved) {
        suppressClick = true;
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      refreshOriginalLauncher();

      if (originalLauncher) {
        originalLauncher.click();
      }
    };

    const handleDoubleClick = (event: MouseEvent) => {
      const resetPoint = defaultPoint();

      setPoint(resetPoint);
      savePoint(resetPoint);

      event.preventDefault();
      event.stopPropagation();
    };

    const handleResize = () => {
      setPoint(point);
      savePoint(point);
    };

    cloneButton.addEventListener("pointerdown", handlePointerDown);
    cloneButton.addEventListener("pointermove", handlePointerMove);
    cloneButton.addEventListener("pointerup", handlePointerUp);
    cloneButton.addEventListener("pointercancel", handlePointerUp);
    cloneButton.addEventListener("click", handleClick);
    cloneButton.addEventListener("dblclick", handleDoubleClick);
    window.addEventListener("resize", handleResize);

    const refreshTimer = window.setInterval(refreshOriginalLauncher, 500);

    return () => {
      window.clearInterval(refreshTimer);

      cloneButton.removeEventListener("pointerdown", handlePointerDown);
      cloneButton.removeEventListener("pointermove", handlePointerMove);
      cloneButton.removeEventListener("pointerup", handlePointerUp);
      cloneButton.removeEventListener("pointercancel", handlePointerUp);
      cloneButton.removeEventListener("click", handleClick);
      cloneButton.removeEventListener("dblclick", handleDoubleClick);
      window.removeEventListener("resize", handleResize);

      cloneButton.remove();
    };
  }, []);

  return null;
}
