import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import sceneSource from "../data/wyrestormAVBlockSchematic.excalidraw?raw";
import { ExcalidrawBlockSchematic } from "./ExcalidrawBlockSchematic";

beforeEach(() => vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }));
afterEach(() => vi.unstubAllGlobals());

function elementTypeCounts() {
  const scene = JSON.parse(sceneSource) as { elements: Array<{ type: string }> };
  return {
    rectangles: scene.elements.filter((e) => e.type === "rectangle").length,
    arrows: scene.elements.filter((e) => e.type === "arrow").length,
    texts: scene.elements.filter((e) => Boolean((e as { text?: string }).text)).length,
  };
}

describe("ExcalidrawBlockSchematic", () => {
  it("renders every element of the bundled .excalidraw scene as SVG", () => {
    const { rectangles, arrows, texts } = elementTypeCounts();
    const { container } = render(<ExcalidrawBlockSchematic />);

    const svg = container.querySelector("svg.wm-excalidraw-svg");
    expect(svg).toBeTruthy();
    // Preserve all geometry and every label, including text attached to equipment blocks.
    expect(svg?.querySelectorAll("rect").length).toBe(rectangles);
    expect(svg?.querySelectorAll("line").length).toBe(arrows);
    expect(svg?.querySelectorAll("text").length).toBe(texts);
  });

  it("produces a finite viewBox that contains the whole scene", () => {
    const { container } = render(<ExcalidrawBlockSchematic />);
    const svg = container.querySelector("svg.wm-excalidraw-svg");
    const viewBox = svg?.getAttribute("viewBox")?.split(/\s+/).map(Number) ?? [];
    expect(viewBox).toHaveLength(4);
    expect(viewBox.every(Number.isFinite)).toBe(true);
    // Width and height must be positive and non-trivial.
    expect(viewBox[2]).toBeGreaterThan(200);
    expect(viewBox[3]).toBeGreaterThan(200);
  });

  it("renders the reference diagram on a light sheet with the legend note", () => {
    const { container } = render(<ExcalidrawBlockSchematic />);
    // The drawing viewer preserves the authored light paper.
    expect(container.querySelector(".wm-diagram-scroll")?.className ?? "").toContain(
      "is-light",
    );
    expect(
      screen.getByText(/Solid = AV signal · dashed = USB \/ IP \/ control/, { exact: false }),
    ).toBeTruthy();
  });
});
it("renders embedded equipment labels and multiline text in the reference drawing", () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const { container } = render(<ExcalidrawBlockSchematic />);
  expect(screen.getByRole("img", { name: "AV Block Schematic — WyreStorm Meeting Room" })).toBeInTheDocument();
  expect(container.querySelector("svg")?.textContent).toContain("USB PTZ camera");
  expect(container.querySelector("svg")?.textContent).toContain("(USB 3.0)");
  expect(container.querySelectorAll("tspan").length).toBeGreaterThan(19);
});
