import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { wallStartPresetGroups, wallStartPresetShortlist, wallStartPresets } from "../../lib/videowallDecision";
import { resetPinnedWallPresetsCache, togglePinnedWallPreset } from "../../lib/wallPinnedPresets";
import {
  resetWallStartingPointsCache,
  savedWallStartingPoints,
  saveWallStartingPoint,
} from "../../lib/wallStartingPoints";
import { defaultWallRequirements } from "../../lib/videowallOptions";
import { VideowallStartPresets } from "./VideowallStartPresets";

describe("VideowallStartPresets", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetWallStartingPointsCache();
    resetPinnedWallPresetsCache();
  });

  it("does not list stock LCD variations beside the wall type and connection questions", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    expect(screen.queryByRole("region", { name: "LCD walls" })).toBeNull();
    expect(screen.getByRole("region", { name: "LED walls" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Projection" })).toBeTruthy();
    for (const preset of wallStartPresetGroups.find((group) => group.family === "lcd")!.presets) {
      expect(screen.queryByTestId(`videowall-preset-${preset.key}`)).toBeNull();
    }
  });

  it("keeps rep-saved LCD walls available as personal starting points", () => {
    saveWallStartingPoint({
      ...defaultWallRequirements,
      application: "lcd-loop",
      columns: 3,
      rows: 2,
      sources: 4,
      windows: 4,
      layout: "quad",
    });
    const mine = savedWallStartingPoints()[0];
    render(<VideowallStartPresets onPick={vi.fn()} />);
    expect(screen.getByTestId(`videowall-preset-${mine.key}`)).toBeTruthy();
    expect(screen.getByRole("region", { name: "LCD walls" })).toBeTruthy();
  });

  it("offers both LED multiview walls on the card facts", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    const floating = screen.getByTestId("videowall-preset-led-floating-windows");
    expect(floating.textContent).toContain("3840 × 2160 canvas");
    expect(floating.textContent).toContain("4 windows");

    const fixed = screen.getByTestId("videowall-preset-led-fixed-windows");
    expect(fixed.textContent).toContain("3840 × 2160 canvas");
    expect(fixed.textContent).toContain("16 windows");
  });
  it("offers the two-projector wall and the design it reaches", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    const card = screen.getByTestId("videowall-preset-projector-pair");
    expect(card.textContent).toContain("One wide picture across two projectors");
    // The facts line the card promises come from the brief and the engine.
    expect(card.textContent).toContain("2 × 86 in projectors");
    expect(card.textContent).toContain("Local matrix");
  });
  it("hands back the chosen preset's whole brief", () => {
    const onPick = vi.fn();
    render(<VideowallStartPresets onPick={onPick} />);

    fireEvent.click(screen.getByTestId("videowall-preset-led-ribbon"));

    expect(onPick).toHaveBeenCalledWith(wallStartPresets.find((preset) => preset.key === "led-ribbon"));
  });

  it("shows a rep's own wall beside the shipped walls, and can forget it", () => {
    saveWallStartingPoint({
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 2160,
      layout: "custom",
      customMode: "floating",
      windows: 4,
      sources: 4,
      sourceResolution: "4k30",
    });
    const mine = savedWallStartingPoints()[0];
    render(<VideowallStartPresets onPick={vi.fn()} />);

    const card = screen.getByTestId(`videowall-preset-${mine.key}`);
    expect(card.textContent).toContain("Saved ·");
    expect(card.textContent).toContain("4 windows");
    // It sits in the LED group, ahead of the shipped walls it was adjusted from.
    const led = screen.getByRole("region", { name: "LED walls" });
    expect(led.querySelector("button")?.getAttribute("data-testid")).toBe(`videowall-preset-${mine.key}`);

    fireEvent.click(screen.getByRole("button", { name: /Remove starting point/ }));
    expect(screen.queryByTestId(`videowall-preset-${mine.key}`)).toBeNull();
    expect(savedWallStartingPoints()).toEqual([]);
  });

  it("narrows the cards to the walls that carry at least the chosen count", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    fireEvent.click(screen.getByTestId("videowall-preset-filter-windows-4"));

    // Four windows is a floor: a nine-window wall can still show four.
    expect(screen.getByTestId("videowall-preset-led-floating-windows")).toBeTruthy();
    expect(screen.queryByTestId("videowall-preset-nine-feeds")).toBeNull();
    expect(screen.queryByTestId("videowall-preset-led-ribbon")).toBeNull();
    expect(screen.getByTestId("videowall-preset-filter-summary").textContent).toMatch(/^\d+ of \d+ walls$/);

    fireEvent.click(screen.getByTestId("videowall-preset-filter-windows-16"));
    expect(screen.getByTestId("videowall-preset-led-fixed-windows")).toBeTruthy();
    expect(screen.queryByTestId("videowall-preset-nine-feeds")).toBeNull();
  });

  it("narrows on the transport the card names, without inventing a bucket", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    fireEvent.click(screen.getByTestId("videowall-preset-filter-transport-10g"));

    // 10GbE is the site's connection: every wall that needs no more than that fits.
    for (const preset of wallStartPresets.filter((item) => item.family !== "lcd")) expect(screen.getByTestId(`videowall-preset-${preset.key}`)).toBeTruthy();

    fireEvent.click(screen.getByTestId("videowall-preset-filter-transport-1g"));
    const tenGig = wallStartPresets.filter((preset) => preset.family !== "lcd" && preset.transport === "10g").map((preset) => `videowall-preset-${preset.key}`);
    expect(tenGig.length).toBeGreaterThan(0);
    for (const key of tenGig) expect(screen.queryByTestId(key)).toBeNull();
    expect(screen.getByTestId("videowall-preset-led-canvas")).toBeTruthy();
  });

  it("narrows on the source count", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    fireEvent.click(screen.getByTestId("videowall-preset-filter-sources-16"));

    expect(screen.getByTestId("videowall-preset-led-fixed-windows")).toBeTruthy();
    expect(screen.queryByTestId("videowall-preset-nine-feeds")).toBeNull();
  });

  it("says so when no wall carries the combination, and clears back to every wall", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    fireEvent.click(screen.getByTestId("videowall-preset-filter-windows-16"));
    fireEvent.click(screen.getByTestId("videowall-preset-filter-transport-local"));

    expect(screen.getByTestId("videowall-preset-empty").textContent).toContain("No wall carries that combination");
    expect(screen.queryByTestId("videowall-preset-led-fixed-windows")).toBeNull();

    fireEvent.click(screen.getByTestId("videowall-preset-filter-clear"));
    expect(screen.queryByTestId("videowall-preset-empty")).toBeNull();
    expect(screen.getByTestId("videowall-preset-led-fixed-windows")).toBeTruthy();
  });

  it("folds the guided step to the curated walls until the rest is asked for", () => {
    render(<VideowallStartPresets shortlist showFilter={false} onPick={vi.fn()} />);

    // The curated walls are on screen, whatever their position in the family.
    for (const preset of wallStartPresetShortlist) {
      expect(screen.getByTestId(`videowall-preset-${preset.key}`)).toBeTruthy();
    }
    expect(screen.queryByRole("region", { name: "LCD walls" })).toBeNull();
    // A wall that is not curated waits behind Show all.
    expect(screen.queryByTestId("videowall-preset-nine-feeds")).toBeNull();
    expect(screen.queryByTestId("videowall-preset-led-ribbon")).toBeNull();
    expect(screen.queryByRole("region", { name: "LCD walls" })).toBeNull();
    expect(screen.queryByTestId("videowall-preset-filter-summary")).toBeNull();

    const more = screen.getByTestId("videowall-preset-show-all");
    expect(more.textContent).toBe(`Show all ${wallStartPresets.filter((preset) => preset.family !== "lcd").length} walls`);
    expect(more.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(more);

    expect(screen.queryByTestId("videowall-preset-nine-feeds")).toBeNull();
    expect(screen.getByTestId("videowall-preset-led-ribbon")).toBeTruthy();
    expect(screen.getByTestId("videowall-preset-show-all").getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("videowall-preset-show-all").textContent).toBe("Show fewer walls");
  });

  it("keeps a rep's own wall folded in, which the catalogue's order does not", () => {
    saveWallStartingPoint({
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 2160,
      layout: "custom",
      customMode: "floating",
      windows: 4,
      sources: 4,
      sourceResolution: "4k30",
    });
    const mine = savedWallStartingPoints()[0];
    render(<VideowallStartPresets shortlist showFilter={false} onPick={vi.fn()} />);

    // A starting point the rep saved is a wall they came back for, so folding
    // the list to the catalogue's common walls must not bury it.
    expect(screen.getByTestId(`videowall-preset-${mine.key}`)).toBeTruthy();
  });

  it("leads the guided step with the walls the rep pinned", () => {
    render(<VideowallStartPresets shortlist showFilter={false} onPick={vi.fn()} />);

    // The list starts without stock LCD variations; pinning an LCD example
    // explicitly brings that one back as the rep's own starting point.
    expect(screen.queryByRole("region", { name: "LCD walls" })).toBeNull();
    fireEvent.click(screen.getByTestId("videowall-preset-pin-led-canvas"));
    const card = screen.getByTestId("videowall-preset-led-canvas");
    expect(card.textContent).toContain("Pinned · ");
    expect(screen.getByTestId("videowall-preset-pin-led-canvas").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByTestId("videowall-preset-pin-led-canvas"));

    expect(screen.getByRole("region", { name: "LED walls" })).toBeTruthy();
    expect(screen.getByTestId("videowall-preset-led-canvas").textContent).not.toContain("Pinned");
  });

  it("offers the pin only where the shortlist is, not in the catalogue reading", () => {
    togglePinnedWallPreset("per-panel");
    render(<VideowallStartPresets onPick={vi.fn()} />);

    // The expert reading's order is the catalogue's, so a pin there would
    // reorder nothing and its control would be a promise the page cannot keep.
    expect(screen.queryByTestId("videowall-preset-pin-per-panel")).toBeNull();
    expect(screen.queryByRole("button", { name: /to my shortlist/ })).toBeNull();
    expect(screen.getByRole("region", { name: "LCD walls" }).querySelector("button.vw-preset-row")?.getAttribute("data-testid"))
      .toBe("videowall-preset-per-panel");
  });

  it("marks the preset the current answers already match", () => {
    const led = wallStartPresets.find((preset) => preset.key === "led-canvas")!;
    render(<VideowallStartPresets requirements={led.requirements} onPick={vi.fn()} />);

    expect(screen.getByTestId("videowall-preset-led-canvas").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("videowall-preset-led-ribbon").getAttribute("aria-pressed")).toBe("false");
  });

  it("marks the card the answers started on, even after they were adjusted", () => {
    // A design opened from a legacy LCD preset still shows its starting point,
    // even though the stock LCD catalogue is no longer offered by default.
    render(
      <VideowallStartPresets
        requirements={{ ...defaultWallRequirements, columns: 4, rows: 2, sources: 6, windows: 5 }}
        startedKey="nine-feeds"
        onPick={vi.fn()}
      />,
    );

    const started = screen.getByTestId("videowall-preset-nine-feeds");
    expect(started.getAttribute("data-started")).toBe("true");
    expect(started.textContent).toContain("Started here · ");
    // It is not the same fact as "these answers are this card".
    expect(started.getAttribute("aria-pressed")).toBe("false");
    // And no other card claims it.
    expect(screen.queryByTestId("videowall-preset-quad-canvas")).toBeNull();
  });

  it("marks a card the rep saved themselves the same way", () => {
    saveWallStartingPoint({
      ...defaultWallRequirements,
      application: "led",
      ledCanvasWidth: 3840,
      ledCanvasHeight: 2160,
      layout: "custom",
      customMode: "floating",
      windows: 4,
      sources: 4,
      sourceResolution: "4k30",
    });
    const mine = savedWallStartingPoints()[0];
    render(<VideowallStartPresets startedKey={mine.key} onPick={vi.fn()} />);

    const card = screen.getByTestId(`videowall-preset-${mine.key}`);
    expect(card.getAttribute("data-started")).toBe("true");
    // The saved mark and the started mark both read, in that order.
    expect(card.textContent).toContain("Started here · Saved · ");
  });
});
