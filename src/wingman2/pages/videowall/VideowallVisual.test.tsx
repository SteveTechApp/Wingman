import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { wallElevationGeometry } from "../../lib/wallElevation";
import { defaultWallRequirements, type WallRequirements } from "../../lib/videowallOptions";
import { VideowallVisual } from "./VideowallVisual";

// jsdom has no PointerEvent, and React only registers pointer listeners where
// the platform has one, so the seam drag would never reach the drawing in a
// test. A browser has it; the file gives the environment the same starting point.
if (typeof window !== "undefined" && !window.PointerEvent) {
  (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
}

function renderWall(overrides: Partial<WallRequirements>) {
  const { container } = render(<VideowallVisual requirements={{ ...defaultWallRequirements, ...overrides }} />);
  return container;
}

describe("VideowallVisual physical dimensions", () => {
  it("dimensions the wall and one panel in millimetres", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 1 });

    expect(container.querySelectorAll("[data-wall-dimension]")).toHaveLength(5);
    expect(container.querySelector("[data-wall-dimension='panel-width']")?.textContent).toContain("1,218 mm panel");
    expect(container.querySelector("[data-wall-dimension='wall-width']")?.textContent).toContain("4,872 mm wall");
    expect(container.querySelector("[data-wall-dimension='wall-height']")?.textContent).toContain("1,370 mm wall");
    // The wall floats on its mounting height, so the drawing dimensions the gap
    // to the floor as well as the wall itself.
    expect(container.querySelector("[data-wall-dimension='mounting-height']")?.textContent).toContain("900 mm to floor");
    expect(screen.getByText("Bottom edge 900 mm above the floor")).toBeTruthy();
    expect(screen.getByText("Wall 4,872 × 1,370 mm · 55 in panels at 1,218 × 685 mm")).toBeTruthy();
  });

  it("re-sizes the wall when the rep picks a larger panel", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 2, rows: 2, windows: 1, panelDiagonalInches: 75 });

    expect(container.querySelector("[data-wall-dimension='panel-width']")?.textContent).toContain("1,660 mm panel");
    expect(container.querySelector("[data-wall-dimension='wall-width']")?.textContent).toContain("3,320 mm wall");
  });

  it("lifts the wall to the height the rep records and can sit it on the floor", () => {
    const mounted = renderWall({ application: "lcd-loop", layout: "single", columns: 2, rows: 2, windows: 1, mountingHeightMm: 1200 });
    expect(mounted.querySelector("[data-wall-dimension='mounting-height']")?.textContent).toContain("1,200 mm to floor");
    expect(screen.getByText("Bottom edge 1,200 mm above the floor")).toBeTruthy();

    const standing = renderWall({ application: "lcd-loop", layout: "single", columns: 2, rows: 2, windows: 1, mountingHeightMm: 0 });
    expect(standing.querySelector("[data-wall-dimension='mounting-height']")).toBeNull();
    expect(screen.getByText("Bottom edge 0 mm above the floor")).toBeTruthy();
  });

  it("dimensions an LED wall without inventing a panel size", () => {
    const container = renderWall({ application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 1080, pixelPitchMm: 2.5 });

    expect(container.querySelectorAll("[data-wall-dimension]")).toHaveLength(3);
    expect(container.querySelector("[data-wall-dimension='wall-width']")?.textContent).toContain("9,600 mm wall");
    expect(container.querySelector("[data-wall-dimension='mounting-height']")?.textContent).toContain("900 mm to floor");
    expect(container.querySelector("[data-wall-dimension-label='panel']")).toBeNull();
  });
});

describe("VideowallVisual transport breach marker", () => {
  it("marks the panel whose measured run is over its limit", () => {
    const container = renderWall({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 2,
      sources: 4,
      windows: 4,
      measuredRuns: { "display-3": 9 },
    });

    // Only the panel the cable cannot reach is marked, with its own numbers.
    expect(container.querySelectorAll("[data-wall-breach]")).toHaveLength(1);
    const mark = container.querySelector("[data-wall-breach='display-3']");
    expect(mark).toBeTruthy();
    expect(mark?.querySelector("[data-wall-breach-label='display-3']")?.textContent).toBe("9 m > 5 m");
    expect(container.querySelector("[data-wall-breach='display-1']")).toBeNull();
    expect(container.querySelector("[data-wall-breach-link='display-3']")?.textContent).toContain("9 m run · 5 m limit");
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toContain("Panel 3: 9 m run exceeds the 5 m limit.");
  });

  it("marks panel 1 when the loop's first link is over, not the whole wall", () => {
    const container = renderWall({
      application: "lcd-loop",
      layout: "single",
      columns: 2,
      rows: 2,
      windows: 1,
      sources: 1,
      measuredRuns: { "display-1": 9 },
    });

    expect(container.querySelectorAll("[data-wall-breach]")).toHaveLength(1);
    expect(container.querySelector("[data-wall-breach='display-1']")).toBeTruthy();
  });

  it("marks a single-surface wall once when its only link is over", () => {
    const container = renderWall({
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 1080,
      mountingHeightMm: 900,
      // The LED canvas is a 1080p-class payload locally, so passive HDMI holds to 15 m.
      measuredRuns: { "display-1": 20 },
    });

    expect(container.querySelectorAll("[data-wall-breach]")).toHaveLength(1);
    expect(container.querySelector("[data-wall-breach='display-1'] [data-wall-breach-label]")?.textContent).toBe("20 m > 15 m");
  });

  it("keeps the alarm inside the panel it marks on a dense array", () => {
    const overrides = {
      application: "lcd-direct" as const,
      layout: "single" as const,
      columns: 4,
      rows: 4,
      sources: 1,
      windows: 1,
      measuredRuns: { "display-16": 9 },
    };
    const container = renderWall(overrides);
    const { layout } = wallElevationGeometry({ ...defaultWallRequirements, ...overrides });
    const cellWidth = layout.wall.width / layout.columns;
    const cellHeight = layout.wall.height / layout.rows;

    const tag = container.querySelector("[data-wall-breach='display-16'] [data-wall-breach-label='display-16']")?.parentElement;
    const [x, y] = (tag?.getAttribute("transform") ?? "").match(/-?[\d.]+/g)?.map(Number) ?? [];
    const rect = tag?.querySelector("rect");
    const tagWidth = Number(rect?.getAttribute("width"));
    const tagHeight = Number(rect?.getAttribute("height"));

    // Panel 16 is the bottom-right cell: its tag names the run without spilling
    // onto a neighbouring panel whose cable reaches.
    expect(x).toBeGreaterThanOrEqual(cellWidth * 3);
    expect(x + tagWidth).toBeLessThanOrEqual(cellWidth * 4);
    expect(y).toBeGreaterThanOrEqual(cellHeight * 3);
    expect(y + tagHeight).toBeLessThanOrEqual(cellHeight * 4);
    // The panel number owns the top-left corner, so the tag sits below it.
    expect(y).toBeGreaterThan(cellHeight * 3 + tagHeight);
  });

  it("leaves a wall whose runs fit unmarked", () => {
    const container = renderWall({ application: "lcd-direct", layout: "independent", columns: 2, rows: 2, sources: 4, windows: 4, measuredRuns: { "display-3": 3 } });

    expect(container.querySelector("[data-wall-breach]")).toBeNull();
    expect(container.querySelector("[data-wall-breach-link]")).toBeNull();
  });

  it("names a source run that is over its limit without marking a panel", () => {
    const container = renderWall({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 1,
      sources: 2,
      windows: 2,
      measuredRuns: { "source-1": 20 },
    });

    // A source run is off the wall drawing, so it is named in the meta line only.
    expect(container.querySelector("[data-wall-breach]")).toBeNull();
    expect(container.querySelector("[data-wall-breach-link='source-1']")?.textContent).toContain("20 m run · 5 m limit");
  });
});

describe("VideowallVisual mapping choice", () => {
  it("switches the drawing between fit and fill from the elevation itself", () => {
    const onMappingChange = vi.fn();
    const base = { application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 2, sources: 2 } as const;
    const { container, rerender } = render(
      <VideowallVisual requirements={{ ...defaultWallRequirements, ...base }} onMappingChange={onMappingChange} />,
    );

    expect(container.querySelectorAll("[data-wall-mapping-choice]")).toHaveLength(2);
    expect(container.querySelector("[data-wall-mapping-choice='fit']")?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-wall-bar]")).toHaveLength(2);
    expect(container.querySelector("[data-wall-crop]")).toBeNull();

    fireEvent.click(container.querySelector("[data-wall-mapping-choice='fill']")!);
    expect(onMappingChange).toHaveBeenCalledWith("fill");

    rerender(
      <VideowallVisual requirements={{ ...defaultWallRequirements, ...base, mapping: "fill" }} onMappingChange={onMappingChange} />,
    );
    expect(container.querySelector("[data-wall-mapping-choice='fill']")?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector("[data-wall-crop]")).toBeTruthy();
    expect(container.querySelector("[data-wall-bar]")).toBeNull();
  });

  it("offers no choice when the source shape already matches", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 2, rows: 2, windows: 1, sources: 1 });

    expect(container.querySelector("[data-wall-mapping-choice]")).toBeNull();
  });
});

describe("VideowallVisual mapping warning", () => {
  it("warns on the elevation when fill loses a large share of the picture", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 1, mapping: "fill" });
    const warning = container.querySelector("[data-wall-warning]");

    expect(warning).toBeTruthy();
    expect(warning?.getAttribute("data-wall-warning")).toBe("fill");
    // The live region is the sentence; the fix buttons beside it are not a status.
    expect(warning?.querySelector("[role='status']")).toBeTruthy();
    expect(warning?.textContent).toContain("Check the mapping");
    expect(warning?.textContent).toContain("Fill crops");
    expect(warning?.textContent).toContain("Fit would keep every pixel");
    expect(warning?.textContent).toContain("use the whole wall and picture");
  });

  it("names the bars a fitted source leaves when that is the costly choice", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1, mapping: "fit" });
    const warning = container.querySelector("[data-wall-warning]");

    expect(warning?.getAttribute("data-wall-warning")).toBe("fit");
    expect(warning?.textContent).toContain("of the wall blank");
    expect(warning?.textContent).toContain("Fill would cover it but crop");
  });

  it("says nothing when the source already matches the canvas", () => {
    const container = renderWall({ application: "lcd-loop", columns: 2, rows: 2 });
    expect(container.querySelector("[data-wall-warning]")).toBeNull();
  });

  it("keeps the warning beside the buttons that change the mapping", () => {
    const onMappingChange = vi.fn();
    const { container } = render(
      <VideowallVisual
        requirements={{ ...defaultWallRequirements, application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1, mapping: "fit" }}
        onMappingChange={onMappingChange}
      />,
    );

    fireEvent.click(container.querySelector("[data-wall-mapping-choice='fill']") as Element);
    expect(onMappingChange).toHaveBeenCalledWith("fill");
  });
});

describe("VideowallVisual mapping fixes", () => {
  const mismatched = { application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 1080, pixelPitchMm: 2.5, windows: 1, sources: 1 } as const;

  it("offers both snaps with a preview of the result", () => {
    const onRequirementsChange = vi.fn();
    const { container } = render(
      <VideowallVisual
        requirements={{ ...defaultWallRequirements, ...mismatched }}
        onRequirementsChange={onRequirementsChange}
      />,
    );

    const fixes = container.querySelectorAll("[data-wall-fix]");
    expect(fixes).toHaveLength(2);
    const preview = fixes[0].querySelector("img");
    expect(preview?.getAttribute("src")).toMatch(/^data:image\/svg\+xml;utf8,/);
    expect(preview?.getAttribute("alt")).toContain("snap canvas to source");
    expect(fixes[0].textContent).toContain("Snap canvas to source");
    expect(fixes[0].textContent).toContain("4,800 × 2,700 mm");

    fireEvent.click(fixes[0]);
    expect(onRequirementsChange).toHaveBeenCalledTimes(1);
    const next = onRequirementsChange.mock.calls[0][0];
    expect([next.ledCanvasWidth, next.ledCanvasHeight]).toEqual([1920, 1080]);
  });

  it("leaves no warning or fix once the snapped design is applied", () => {
    const { container, rerender } = render(
      <VideowallVisual requirements={{ ...defaultWallRequirements, ...mismatched }} onRequirementsChange={() => {}} />,
    );
    expect(container.querySelector("[data-wall-warning]")).toBeTruthy();

    rerender(
      <VideowallVisual
        requirements={{ ...defaultWallRequirements, ...mismatched, ledCanvasWidth: 3840, ledCanvasHeight: 2160 }}
        onRequirementsChange={() => {}}
      />,
    );
    expect(container.querySelector("[data-wall-warning]")).toBeNull();
    expect(container.querySelector("[data-wall-fix]")).toBeNull();
  });

  it("offers nothing where the fix could not be applied", () => {
    // No handler: the warning still explains the mapping, but there is nowhere to put a design change.
    const plain = render(<VideowallVisual requirements={{ ...defaultWallRequirements, ...mismatched }} />);
    expect(plain.container.querySelector("[data-wall-warning]")).toBeTruthy();
    expect(plain.container.querySelector("[data-wall-fix]")).toBeNull();

    // An LCD wall's shape is the array of panels it is built from.
    const lcd = render(
      <VideowallVisual
        requirements={{ ...defaultWallRequirements, application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 1 }}
        onRequirementsChange={() => {}}
      />,
    );
    expect(lcd.container.querySelector("[data-wall-warning]")).toBeTruthy();
    expect(lcd.container.querySelector("[data-wall-fix]")).toBeNull();
  });
});

describe("VideowallVisual mapping overlay", () => {
  it("hatches the bars a fitted source leaves on the canvas", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 2, sources: 2 });
    const svg = container.querySelector("svg");

    // The drawing box carries the scale figure's lane on its right and the
    // mounting gap below the wall.
    expect(svg?.getAttribute("viewBox")).toBe("0 0 2117 922");
    expect(container.querySelectorAll("[data-wall-bar]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-wall-band-label='bars']")).toHaveLength(2);
    expect(container.querySelector("[data-wall-content-frame]")).toBeTruthy();
    expect(container.querySelector("[data-wall-crop]")).toBeNull();
    expect(svg?.getAttribute("aria-label")).toContain("960 px bars left and right");
    expect(screen.getByText("960 px bars left and right")).toBeTruthy();
  });

  it("hatches the cropped overhang outside a dashed source frame", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 4, rows: 2, windows: 1, sources: 1 });

    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 2117 1147");
    expect(container.querySelector("[data-wall-crop]")).toBeTruthy();
    expect(container.querySelector("[data-wall-source-frame]")).toBeTruthy();
    expect(container.querySelectorAll("[data-wall-band-label='cropped']")).toHaveLength(2);
    expect(container.querySelector("[data-wall-bar]")).toBeNull();
    expect(screen.getByText("540 px cropped top and bottom")).toBeTruthy();
  });

  it("draws the scale figure beside the wall on the same floor line", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1, sources: 1 });
    const figure = container.querySelector("[data-scale-figure]");

    expect(figure).toBeTruthy();
    expect(figure?.querySelectorAll(".vw-wall-person")).toHaveLength(2);
    expect(figure?.querySelector(".vw-wall-door")).toBeTruthy();
    expect(figure?.querySelector(".vw-wall-ground")).toBeTruthy();
    expect(figure?.textContent).toContain("1,700 mm");
    // The doorway stands on the floor below the mounting gap, outside the
    // dimensions.
    const door = figure!.querySelector(".vw-wall-door")!;
    const geometry = wallElevationGeometry({ ...defaultWallRequirements, application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1, sources: 1 });
    expect(Number(door.getAttribute("y")) + Number(door.getAttribute("height"))).toBe(Math.round(geometry.scale!.floorY));
    expect(Number(door.getAttribute("x"))).toBeGreaterThanOrEqual(geometry.canvas.width);
    expect(container.querySelector("svg")?.getAttribute("aria-label")).toContain("doorway gives the scale");
  });

  it("leaves a matching canvas undecorated", () => {
    const container = renderWall({ application: "lcd-loop", layout: "single", columns: 2, rows: 2, windows: 1, sources: 1 });

    expect(container.querySelector("[data-wall-bar]")).toBeNull();
    expect(container.querySelector("[data-wall-crop]")).toBeNull();
    expect(container.querySelector("[data-wall-mapping]")).toBeNull();
  });
});

it("records a mapping snap and restores its dimensions on undo", () => {
  const initial: WallRequirements = { ...defaultWallRequirements, application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 1080, windows: 1, sources: 1 };
  const change = vi.fn();
  const { container, rerender } = render(<VideowallVisual requirements={initial} onRequirementsChange={change} />);
  fireEvent.click(container.querySelector("[data-wall-fix]")!);
  const snapped = change.mock.calls[0][0] as WallRequirements;
  expect(snapped.mappingHistory?.[0].appliedAt).toMatch(/^20/);
  expect(snapped.mappingHistory?.[0].before.ledCanvasWidth).toBe(3840);
  rerender(<VideowallVisual requirements={snapped} onRequirementsChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Undo mapping snap" }));
  expect(change.mock.calls[1][0].ledCanvasWidth).toBe(3840);
  expect(change.mock.calls[1][0].mappingHistory[0].undoneAt).toMatch(/^20/);
});
it("draws the surveyed blend on the screen it was measured on", () => {
  const container = renderWall({ application: "projection", projectors: 2, blendOverlapMm: 60, layout: "single", windows: 1 });

  expect(container.querySelectorAll("[data-wall-blend-band='60']")).toHaveLength(1);
  expect(container.querySelector("[data-wall-projector-seam]")).toBeNull();
  expect(screen.getByText("60 mm blend measured at survey")).toBeTruthy();
});

it("moves a seam for an unequal pair and states the shares", () => {
  const change = vi.fn();
  const { container } = render(
    <VideowallVisual
      requirements={{ ...defaultWallRequirements, application: "projection", projectors: 2, layout: "single", windows: 1 }}
      onRequirementsChange={change}
    />,
  );

  const seam = screen.getByRole("slider", { name: "Seam between Projector 1 and Projector 2" });
  expect(seam.getAttribute("aria-valuenow")).toBe("50");
  fireEvent.keyDown(seam, { key: "ArrowRight" });
  expect(change.mock.calls[0][0].projectorSplits).toEqual([0.51]);

  fireEvent.keyDown(seam, { key: "ArrowLeft", shiftKey: true });
  expect(change.mock.calls[1][0].projectorSplits).toEqual([0.45]);

  // The moved boundary is where the next render draws it.
  expect(container.querySelectorAll("[data-wall-boundary]")).toHaveLength(1);
});

it("drags a seam to where the pointer is, not to a fixed step", () => {
  const change = vi.fn();
  const { container } = render(
    <VideowallVisual
      requirements={{ ...defaultWallRequirements, application: "projection", projectors: 2, layout: "single", windows: 1 }}
      onRequirementsChange={change}
    />,
  );
  const frame = container.querySelector(".vw-wall-frame") as SVGRectElement;
  frame.getBoundingClientRect = () => ({ left: 100, top: 0, width: 800, height: 300, right: 900, bottom: 300, x: 100, y: 0, toJSON: () => ({}) }) as DOMRect;
  const seam = screen.getByRole("slider", { name: "Seam between Projector 1 and Projector 2" });

  act(() => {
    fireEvent.pointerDown(seam, { pointerId: 1 });
  });
  act(() => {
    fireEvent.pointerMove(seam, { pointerId: 1, clientX: 100 + 800 * 0.3 });
  });
  expect(change.mock.calls[0][0].projectorSplits).toEqual([0.3]);

  // Releasing ends the drag: a later pointer move over the drawing writes nothing more.
  act(() => {
    fireEvent.pointerUp(seam, { pointerId: 1 });
  });
  act(() => {
    fireEvent.pointerMove(seam, { pointerId: 1, clientX: 100 + 800 * 0.7 });
  });
  expect(change).toHaveBeenCalledTimes(1);
});

it("draws a moved seam at the rep's boundary and names the shares", () => {
  const { container } = render(
    <VideowallVisual
      requirements={{ ...defaultWallRequirements, application: "projection", projectors: 2, projectorSplits: [0.42], layout: "single", windows: 1 }}
      onRequirementsChange={() => {}}
    />,
  );

  expect(container.querySelector("[data-wall-projector-seam]")?.getAttribute("x1")).toBe(`${0.42 * 1600}`);
  expect(container.querySelector("[data-wall-image-shares]")?.textContent).toBe("Image shares 42% / 58%");
  expect(screen.getByRole("slider", { name: "Seam between Projector 1 and Projector 2" }).getAttribute("aria-valuenow")).toBe("42");
});

it("offers no seam control where the drawing cannot change the wall", () => {
  const container = renderWall({ application: "projection", projectors: 2, layout: "single", windows: 1 });

  expect(container.querySelector("[data-wall-seam-handle]")).toBeNull();
  expect(screen.queryByRole("slider")).toBeNull();
  expect(container.querySelectorAll("[data-wall-projector-seam]")).toHaveLength(1);
});

it("shows a seam and asks for the overlap while the screen is unmeasured", () => {
  const container = renderWall({ application: "projection", projectors: 2, layout: "single", windows: 1 });

  expect(container.querySelectorAll("[data-wall-projector-seam]")).toHaveLength(1);
  expect(container.querySelector("[data-wall-blend-band]")).toBeNull();
  expect(screen.getByText("Blend overlap confirmed at survey")).toBeTruthy();
});

it("offers a fitting mounting height when the top exceeds a known ceiling", () => {
  const change = vi.fn();
  render(<VideowallVisual requirements={{ ...defaultWallRequirements, application: "lcd-loop", columns: 2, rows: 2, mountingHeightMm: 900, roomHeightMm: 2100 }} onRequirementsChange={change} />);
  fireEvent.click(screen.getByRole("button", { name: "Set bottom edge to 730 mm" }));
  expect(change.mock.calls[0][0].mountingHeightMm).toBe(730);
});
