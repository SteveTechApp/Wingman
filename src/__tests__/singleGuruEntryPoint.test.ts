// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WingmanGuruFab } from "../wingman2/components/WingmanGuruFab";

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
});

type PointerOptions = {
  clientX: number;
  clientY: number;
  pointerId?: number;
  button?: number;
};

function pointerEvent(type: string, options: PointerOptions) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: options.clientX,
    clientY: options.clientY,
    button: options.button ?? 0,
  });

  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    pointerType: { value: "mouse" },
    isPrimary: { value: true },
  });

  return event;
}

describe("single Guru entry point", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1200,
    });

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });

    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });

    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => true),
    });

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    vi.useRealTimers();
  });

  it("renders a dedicated moving layer so Guru idle motion does not depend only on CSS media settings", async () => {
    await act(async () => {
      root.render(
        createElement(WingmanGuruFab, {
          open: false,
          onClick: vi.fn(),
        }),
      );
    });

    const motionLayer = container.querySelector<HTMLElement>(".wingman-guru-fab-motion");
    const sweep = container.querySelector<HTMLElement>(".wingman-guru-fab-sweep");
    const glow = container.querySelector<HTMLElement>(".wingman-guru-fab-glow");

    expect(motionLayer).not.toBeNull();
    expect(sweep).not.toBeNull();
    expect(glow).not.toBeNull();
    expect(motionLayer?.style.willChange).toBe("transform");
  });

  it("moves with pointer events, persists its position and suppresses the drag click", async () => {
    const onClick = vi.fn();

    await act(async () => {
      root.render(
        createElement(WingmanGuruFab, {
          open: false,
          onClick,
        }),
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      "button.wingman-guru-fab",
    );

    expect(button).not.toBeNull();

    if (!button) {
      throw new Error("Guru launcher was not rendered.");
    }

    Object.defineProperty(button, "getBoundingClientRect", {
      configurable: true,
      value: () => {
        const left = Number.parseFloat(button.style.left) || 100;
        const top = Number.parseFloat(button.style.top) || 180;

        return {
          x: left,
          y: top,
          left,
          top,
          right: left + 72,
          bottom: top + 72,
          width: 72,
          height: 72,
          toJSON: () => ({}),
        };
      },
    });

    const initialLeft = Number.parseFloat(button.style.left);
    const initialTop = Number.parseFloat(button.style.top);

    await act(async () => {
      button.dispatchEvent(
        pointerEvent("pointerdown", {
          clientX: initialLeft + 10,
          clientY: initialTop + 10,
        }),
      );

      button.dispatchEvent(
        pointerEvent("pointermove", {
          clientX: initialLeft + 70,
          clientY: initialTop + 55,
        }),
      );

      button.dispatchEvent(
        pointerEvent("pointerup", {
          clientX: initialLeft + 70,
          clientY: initialTop + 55,
        }),
      );
    });

    expect(Number.parseFloat(button.style.left)).toBeGreaterThan(initialLeft);
    expect(Number.parseFloat(button.style.top)).toBeGreaterThan(initialTop);
    expect(window.localStorage.getItem("wingmanGuruPosition")).not.toBeNull();

    await act(async () => {
      button.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );

      vi.advanceTimersByTime(300);
    });

    expect(onClick).not.toHaveBeenCalled();
  });

  it("opens Guru on a normal click", async () => {
    const onClick = vi.fn();

    await act(async () => {
      root.render(
        createElement(WingmanGuruFab, {
          open: false,
          onClick,
        }),
      );
    });

    const button = container.querySelector<HTMLButtonElement>(
      "button.wingman-guru-fab",
    );

    expect(button).not.toBeNull();

    if (!button) {
      throw new Error("Guru launcher was not rendered.");
    }

    await act(async () => {
      button.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
        }),
      );

      vi.advanceTimersByTime(300);
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
