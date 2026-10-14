import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DiagramViewport } from "./DiagramViewport";

afterEach(() => vi.unstubAllGlobals());
describe("drawing viewer", () => {
  it("expands outside page containers, restores focus and supports actual-size scrolling", () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const { container } = render(<DiagramViewport title="Room drawing" width={1200} height={900}><svg viewBox="0 0 1200 900" /></DiagramViewport>);
    fireEvent.click(screen.getByRole("button", { name: "Actual size" }));
    expect(screen.getByRole("status")).toHaveTextContent("100%");
    const trigger = screen.getByRole("button", { name: "Full screen" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Room drawing" });
    expect(dialog.parentElement).toBe(document.body);
    expect(container.querySelector(".wm-diagram-viewer")).toBeNull();
    expect(screen.getByRole("button", { name: "Close full screen" })).toHaveFocus();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Full screen" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });
});
