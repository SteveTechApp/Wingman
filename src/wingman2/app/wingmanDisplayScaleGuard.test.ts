import { expect, it, vi } from "vitest";

it("coalesces scale mutations and does not feed unchanged style writes back into its observer", async () => {
  window.history.replaceState({}, "", "/wingman");
  let notify!: () => void;
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("MutationObserver", class {
    constructor(callback: MutationCallback) { notify = () => callback([], {} as MutationObserver); }
    observe() {}
  });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frames.push(callback); return frames.length; });
  const writes = vi.spyOn(document.documentElement.style, "setProperty");
  try {
    await import("./wingmanDisplayScaleGuard");
    expect(document.documentElement.style.getPropertyValue("--wm-fit-scale")).toBe("0.9");
    writes.mockClear();
    notify();
    notify();
    expect(frames).toHaveLength(1);
    frames.shift()!(0);
    expect(writes).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  }
});
