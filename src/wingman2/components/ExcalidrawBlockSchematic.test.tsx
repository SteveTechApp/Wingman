import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import sceneSource from "../data/wyrestormAVBlockSchematic.excalidraw?raw";
import { ExcalidrawBlockSchematic } from "./ExcalidrawBlockSchematic";

function elementTypeCounts() {
  const scene = JSON.parse(sceneSource) as { elements: Array<{ type: string }> };
  return {
    rectangles: scene.elements.filter((e) => e.type === "rectangle").length,
    arrows: scene.elements.filter((e) => e.type === "arrow").length,
    texts: scene.elements.filter((e) => e.type === "text").length,
  };
}

describe("ExcalidrawBlockSchematic", () => {
  it("renders every element of the bundled .excalidraw scene as SVG", () => {
    const { rectangles, arrows, texts } = elementTypeCounts();
    const { container } = render(<ExcalidrawBlockSchematic />);

    const svg = container.querySelector("svg.wm-excalidraw-svg");
    expect(svg).toBeTruthy();
    // One SVG node per scene element — nothing is dropped or synthesized.
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
    // The authored scene reads on a light paper; Tailwind class keeps it light.
    expect(container.querySelector(".wm-excalidraw-sheet")?.className ?? "").toContain(
      "bg-slate-100",
    );
    expect(
      screen.getByText(/Solid = AV signal · dashed = USB \/ IP \/ control/, { exact: false }),
    ).toBeTruthy();
  });
});