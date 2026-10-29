import { describe, expect, it } from "vitest";
import {
  GALLERY_CARD_VIEWPORTS,
  GALLERY_CONFLICT_FIELDS,
  GALLERY_ROW_STATES,
  GALLERY_TEMPLATE_NAMES,
} from "./gallery-row-states.mjs";

/**
 * What the walk relies on but a green run cannot read.
 *
 * `assertGalleryCardActions` seeds every state by its list order and measures
 * whatever the plan declares, so a list that quietly loses its banner, its short
 * name or a breakpoint pair would still measure a page — just not the one the
 * pass is for. These readings are about the shape of the data, which is the half
 * a browser cannot answer.
 */
describe("the gallery row-state seed data", () => {
  const withDesigns = GALLERY_ROW_STATES.filter((state) => state.designs.length > 0);

  it("names every row once, by a key and a room", () => {
    const keys = GALLERY_ROW_STATES.map((state) => state.key);
    const rooms = GALLERY_ROW_STATES.map((state) => state.room);
    const roomIds = GALLERY_ROW_STATES.map((state) => state.roomId);

    // The pass looks cards up by room label and keeps its readings by key, so a
    // duplicate in either is one state measured twice and the other never.
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(rooms).size).toBe(rooms.length);
    expect(new Set(roomIds).size).toBe(roomIds.length);
  });

  it("gives the banner to the row with the most designs, because the banner rides the widest row", () => {
    const banners = GALLERY_ROW_STATES.filter((state) => state.banner);

    expect(banners).toHaveLength(1);
    const widest = Math.max(...withDesigns.map((state) => state.designs.length));
    expect(banners[0].designs).toHaveLength(widest);
  });

  it("holds one short name meant to share the pair's line, and it is a row of one entry", () => {
    const sharing = GALLERY_ROW_STATES.filter((state) => state.sharesLine);

    // Two of them would have each other to share the design line with, which is the
    // `two-short` row and the opposite reading from a name beside the pair.
    expect(sharing).toHaveLength(1);
    expect(sharing[0].designs).toHaveLength(1);
  });

  it("brings the room a state has no starter example for, and lands it on that room", () => {
    for (const state of GALLERY_ROW_STATES) {
      if (state.project) expect(state.project.id).toBe(state.roomId);
      // A card with nothing to open is a state only the store can show, so a row
      // with no designs and no project would seed nothing and then time out looking
      // for a card the page has no reason to draw.
      if (!state.designs.length) expect(state.project).toBeDefined();
    }
  });

  it("keeps every design name distinct, because the pass finds an entry by its name", () => {
    const names = GALLERY_ROW_STATES.flatMap((state) => state.designs);

    expect(new Set(names).size).toBe(names.length);
  });

  it("declares a band count for every state as a whole number of lines", () => {
    for (const state of GALLERY_ROW_STATES) {
      expect(Number.isInteger(state.rowLines)).toBe(true);
      expect(state.rowLines).toBeGreaterThan(0);
      // The clause is printed in the run summary, where the widths beside it are read
      // off the page; a headline that remembered a width would be a stale reading
      // printed as a live one.
      expect(state.headline).toBeTruthy();
      expect(state.headline).not.toMatch(/\d+px/);
    }
  });

  it("seeds long names from one room, which is the row the entry floor is argued from", () => {
    const banner = GALLERY_ROW_STATES.find((state) => state.banner);

    expect(banner.designs).toBe(GALLERY_TEMPLATE_NAMES);
    expect(new Set(banner.designs).size).toBe(banner.designs.length);
  });
});

describe("the gallery viewport plan", () => {
  const declared = GALLERY_CARD_VIEWPORTS.filter((viewport) => viewport.columns !== undefined);

  it("plans widths widest first, each one once, each with a height", () => {
    for (let index = 1; index < GALLERY_CARD_VIEWPORTS.length; index += 1) {
      expect(GALLERY_CARD_VIEWPORTS[index].width).toBeLessThan(GALLERY_CARD_VIEWPORTS[index - 1].width);
      expect(GALLERY_CARD_VIEWPORTS[index].height).toBeGreaterThan(0);
    }
  });

  it("puts a breakpoint's two widths one pixel apart, or neither width is measured as a pair", () => {
    // The pairs are what the sharing promise is asked against: 1151/1150 and
    // 761/760. A breakpoint that moved out from between them would leave both halves
    // reading the same column count and the card the pair exists for unmeasured —
    // green, and about a layout no rep has.
    for (let index = 1; index < declared.length; index += 1) {
      const previous = declared[index - 1];
      const current = declared[index];
      if (previous.columns === current.columns) continue;
      expect(previous.width - current.width).toBe(1);
    }
  });

  it("only ever loses columns as the widths narrow", () => {
    for (let index = 1; index < declared.length; index += 1) {
      expect(declared[index].columns).toBeLessThanOrEqual(declared[index - 1].columns);
    }
    // One to three is what the gallery actually lays out; a plan that declared four
    // would be asserting a layout the page never reaches.
    for (const viewport of declared) expect([1, 2, 3]).toContain(viewport.columns);
  });

  it("reads the declared band count only where the card is widest for two columns", () => {
    const shaped = GALLERY_CARD_VIEWPORTS.filter((viewport) => viewport.rowShape);

    expect(shaped).toHaveLength(1);
    const widestTwoColumn = Math.max(
      ...declared.filter((viewport) => viewport.columns === 2).map((viewport) => viewport.width),
    );
    expect(shaped[0].width).toBe(widestTwoColumn);
    expect(shaped[0].columns).toBe(2);
  });

  it("holds the other two-column width to that shape, and the one-column block under it as a ceiling", () => {
    for (const viewport of GALLERY_CARD_VIEWPORTS) {
      if (!viewport.shape) continue;
      expect(viewport.columns).toBeDefined();
      // `same` is the band's own count at a narrower card; `atMost` is the top of the
      // single-column block, where a row needing more bands is a rule spending a line.
      expect(viewport.shape).toBe(viewport.columns === 2 ? "same" : "atMost");
      expect(viewport).not.toHaveProperty("rowShape");
    }
  });

  it("ends at the phone width the pass takes its narrowest readings at", () => {
    const narrowest = GALLERY_CARD_VIEWPORTS.at(-1);

    // `cardLabelAt360` and each row's 360px band count are read by width, so losing
    // this end would print zeroes rather than fail.
    expect(narrowest.width).toBe(360);
  });

  it("names the conflict's lanes in the form the banner prints", () => {
    // Two labels and "+1 more" is the longest banner a card ever carries.
    expect(GALLERY_CONFLICT_FIELDS).toHaveLength(3);
    expect(new Set(GALLERY_CONFLICT_FIELDS).size).toBe(3);
  });
});
