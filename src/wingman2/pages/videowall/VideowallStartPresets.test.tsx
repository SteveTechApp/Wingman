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

  it("groups the walls by construction and shows what each card sets", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    expect(screen.getByRole("region", { name: "LCD walls" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "LED walls" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Projection" })).toBeTruthy();

    const card = screen.getByTestId("videowall-preset-nine-feeds");
    expect(card.textContent).toContain("Nine feeds at once");
    expect(card.textContent).toContain("3 × 3 (9 panels)");
    expect(card.textContent).toContain("9 windows");
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
    expect(screen.getByTestId("videowall-preset-quad-canvas")).toBeTruthy();
    expect(screen.getByTestId("videowall-preset-led-floating-windows")).toBeTruthy();
    expect(screen.getByTestId("videowall-preset-nine-feeds")).toBeTruthy();
    expect(screen.queryByTestId("videowall-preset-led-ribbon")).toBeNull();
    expect(screen.getByTestId("videowall-preset-filter-summary").textContent).toMatch(/^\d+ of \d+ walls$/);

    fireEvent.click(screen.getByTestId("videowall-preset-filter-windows-9"));
    expect(screen.getByTestId("videowall-preset-nine-feeds")).toBeTruthy();
    expect(screen.queryByTestId("videowall-preset-quad-canvas")).toBeNull();
  });

  it("narrows on the transport the card names, without inventing a bucket", () => {
    render(<VideowallStartPresets onPick={vi.fn()} />);

    fireEvent.click(screen.getByTestId("videowall-preset-filter-transport-10g"));

    // 10GbE is the site's connection: every wall that needs no more than that fits.
    for (const preset of wallStartPresets) expect(screen.getByTestId(`videowall-preset-${preset.key}`)).toBeTruthy();

    fireEvent.click(screen.getByTestId("videowall-preset-filter-transport-1g"));
    const tenGig = wallStartPresets.filter((preset) => preset.transport === "10g").map((preset) => `videowall-preset-${preset.key}`);
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
    expect(screen.getByTestId("videowall-preset-quad-canvas")).toBeTruthy();
    // A wall that is not curated waits behind Show all.
    expect(screen.queryByTestId("videowall-preset-nine-feeds")).toBeNull();
    expect(screen.queryByTestId("videowall-preset-led-ribbon")).toBeNull();
    // The band still counts the family it stands for, not the rows under it.
    const lcd = wallStartPresetGroups.find((group) => group.family === "lcd")!;
    expect(screen.getByRole("region", { name: "LCD walls" }).textContent).toContain(String(lcd.presets.length));
    expect(screen.queryByTestId("videowall-preset-filter-summary")).toBeNull();

    const more = screen.getByTestId("videowall-preset-show-all");
    expect(more.textContent).toBe(`Show all ${wallStartPresets.length} walls`);
    expect(more.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(more);

    expect(screen.getByTestId("videowall-preset-nine-feeds")).toBeTruthy();
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

    const lcd = () => screen.getByRole("region", { name: "LCD walls" });
    const firstRow = () => lcd().querySelector("button.vw-preset-row")?.getAttribute("data-testid");
    // The catalogue's order, before the rep has an opinion.
    expect(firstRow()).toBe("videowall-preset-single-canvas");

    // per-panel is curated but sits last of the LCD walls, so the pin has to
    // move it rather than agree with the order it already had.
    fireEvent.click(screen.getByTestId("videowall-preset-pin-per-panel"));

    expect(firstRow()).toBe("videowall-preset-per-panel");
    const card = screen.getByTestId("videowall-preset-per-panel");
    expect(card.textContent).toContain("Pinned · ");
    expect(screen.getByTestId("videowall-preset-pin-per-panel").getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByTestId("videowall-preset-pin-per-panel"));

    expect(firstRow()).toBe("videowall-preset-single-canvas");
    expect(screen.getByTestId("videowall-preset-per-panel").textContent).not.toContain("Pinned");
  });

  it("offers the pin only where the shortlist is, not in the catalogue reading", () => {
    togglePinnedWallPreset("per-panel");
    render(<VideowallStartPresets onPick={vi.fn()} />);

    // The expert reading's order is the catalogue's, so a pin there would
    // reorder nothing and its control would be a promise the page cannot keep.
    expect(screen.queryByTestId("videowall-preset-pin-per-panel")).toBeNull();
    expect(screen.queryByRole("button", { name: /to my shortlist/ })).toBeNull();
    const lcd = screen.getByRole("region", { name: "LCD walls" });
    expect(lcd.querySelector("button.vw-preset-row")?.getAttribute("data-testid")).toBe(
      `videowall-preset-${wallStartPresetGroups.find((group) => group.family === "lcd")!.presets[0].key}`,
    );
  });

  it("marks the preset the current answers already match", () => {
    const nine = wallStartPresets.find((preset) => preset.key === "nine-feeds")!;
    render(<VideowallStartPresets requirements={nine.requirements} onPick={vi.fn()} />);

    expect(screen.getByTestId("videowall-preset-nine-feeds").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("videowall-preset-quad-canvas").getAttribute("aria-pressed")).toBe("false");
  });

  it("marks the card the answers started on, even after they were adjusted", () => {
    // The answers no longer match any card, but the design still came from this
    // one — which is what a rep returning to the start is asking.
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
    expect(screen.getByTestId("videowall-preset-quad-canvas").getAttribute("data-started")).toBeNull();
    expect(screen.getByTestId("videowall-preset-quad-canvas").textContent).not.toContain("Started here");
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
