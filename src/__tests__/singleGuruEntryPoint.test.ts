import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WingmanGuruFab } from "../wingman2/components/WingmanGuruFab";

const storageKey = "wingmanGuruPosition";

function installViewport() {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
}

function installButtonGeometry(button: HTMLButtonElement) {
  Object.defineProperty(button, "getBoundingClientRect", {
    configurable: true,
    value: () => {
      const left = Number.parseFloat(button.style.left || "0");
      const top = Number.parseFloat(button.style.top || "0");

      return {
        x: left,
        y: top,
        left,
        top,
        width: 74,
        height: 74,
        right: left + 74,
        bottom: top + 74,
        toJSON: () => undefined,
      };
    },
  });
}

function installPointerCapture(button: HTMLButtonElement) {
  const setPointerCapture = vi.fn();
  const releasePointerCapture = vi.fn();

  Object.defineProperty(button, "setPointerCapture", { configurable: true, value: setPointerCapture });
  Object.defineProperty(button, "releasePointerCapture", { configurable: true, value: releasePointerCapture });

  return { setPointerCapture, releasePointerCapture };
}

function firePointerEvent(
  button: HTMLButtonElement,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  options: {
    pointerId: number;
    pointerType: string;
    clientX: number;
    clientY: number;
    button?: number;
    buttons?: number;
    isPrimary?: boolean;
  },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });

  for (const [key, value] of Object.entries(options)) {
    Object.defineProperty(event, key, { configurable: true, value });
  }

  fireEvent(button, event);
}

describe("single Guru entry point", () => {
  beforeEach(() => {
    installViewport();
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("uses the AppShell Guru launcher and does not render the legacy helper from main", () => {
    const mainSource = readFileSync(join(process.cwd(), "src/main.tsx"), "utf8");
    const appShellSource = readFileSync(join(process.cwd(), "src/wingman2/layout/AppShell.tsx"), "utf8");
    const guruFabSource = readFileSync(join(process.cwd(), "src/wingman2/components/WingmanGuruFab.tsx"), "utf8");
    const cssSource = readFileSync(join(process.cwd(), "src/wingman2/styles/wingman-style-stack.css"), "utf8");

    expect(mainSource).not.toContain("GuruHelper");
    expect(mainSource).not.toContain("<GuruHelper />");

    expect(appShellSource).toContain("WingmanGuruFab");
    expect(appShellSource).toContain("WingmanGuruDrawer");

    expect((appShellSource.match(/<WingmanGuruFab/g) ?? []).length).toBe(1);
    expect((appShellSource.match(/<WingmanGuruDrawer/g) ?? []).length).toBe(1);

    expect(guruFabSource).toContain("wingman-guru-fab");
    expect(guruFabSource).toContain("data-context-transfer");
    expect(guruFabSource).toContain("setPointerCapture");
    expect(guruFabSource).toContain("releasePointerCapture");
    expect(guruFabSource).not.toContain("addEventListener(\"mousedown\"");
    expect(guruFabSource).not.toContain("onMouseDown");
    expect(guruFabSource).not.toContain("mouseDragId");
    expect(guruFabSource).not.toContain("wingman-guru-fab-status");
    expect(appShellSource).toContain("hasContextualTransfer={Boolean(guruSupportCue)}");

    expect(cssSource).toContain("WINGMAN GURU FLOATING LAUNCHER CANONICAL START");
    expect(cssSource).toContain("button.wingman-guru-fab");
    expect(cssSource).toContain("position: fixed");
    expect(cssSource).toContain("touch-action: none");
    expect(cssSource).toContain("cursor: grab");
    expect(cssSource).toContain("button.wingman-guru-fab:focus-visible");
    expect(cssSource).toContain("wingman-guru-fab-sweep");
    expect(cssSource).toContain("wingmanGuruSweep");
  });

  it("drags with pointer events, persists position and suppresses the drag click", () => {
    const onClick = vi.fn();
    render(createElement(WingmanGuruFab, { open: false, onClick }));

    const button = screen.getByRole("button", { name: "Open Guru technical assistant" }) as HTMLButtonElement;
    installButtonGeometry(button);
    const pointerCapture = installPointerCapture(button);

    const initialLeft = Number.parseFloat(button.style.left);
    const initialTop = Number.parseFloat(button.style.top);

    firePointerEvent(button, "pointerdown", {
      pointerId: 7,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      clientX: 900,
      clientY: 300,
    });
    firePointerEvent(button, "pointermove", {
      pointerId: 7,
      pointerType: "mouse",
      isPrimary: true,
      buttons: 1,
      clientX: 830,
      clientY: 342,
    });
    firePointerEvent(button, "pointerup", {
      pointerId: 7,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      clientX: 830,
      clientY: 342,
    });

    const nextLeft = Number.parseFloat(button.style.left);
    const nextTop = Number.parseFloat(button.style.top);

    expect(pointerCapture.setPointerCapture).toHaveBeenCalledWith(7);
    expect(pointerCapture.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(nextLeft).not.toBe(initialLeft);
    expect(nextTop).not.toBe(initialTop);

    const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}") as { left?: number; top?: number };
    expect(stored.left).toBe(nextLeft);
    expect(stored.top).toBe(nextTop);

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("opens on a normal click", () => {
    const onClick = vi.fn();
    render(createElement(WingmanGuruFab, { open: false, onClick }));

    fireEvent.click(screen.getByRole("button", { name: "Open Guru technical assistant" }));

    expect(onClick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(320);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("resets the saved position on double-click", () => {
    window.localStorage.setItem(storageKey, JSON.stringify({ left: 320, top: 220 }));

    render(createElement(WingmanGuruFab, { open: false, onClick: vi.fn() }));

    fireEvent.doubleClick(screen.getByRole("button", { name: "Open Guru technical assistant" }));

    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });
});
