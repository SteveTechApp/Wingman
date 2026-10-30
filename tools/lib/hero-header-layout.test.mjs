import { describe, expect, it } from "vitest";
import {
  HERO_VIEWPORTS,
  heroContainmentFailure,
  heroMeasuredOn,
  readHeroActionRow,
} from "./hero-header-layout.mjs";

/**
 * The hero header's rules, held against boxes written for each shape.
 *
 * The walk proves these rules on three real surfaces at five widths, which is the tree
 * that keeps them green while it changes meaning: every hero fits its page here, the
 * action row is on one line everywhere, and the per-width contract holds on the one
 * header that has a row. None of that shows a header wider than its page host, a child
 * that escaped the content box, a copy pushed into the icon column, or a row that
 * wrapped inside a container — the states a rep's machine has to reach before the walk
 * says anything about them. So these specs hand the reading those boxes as data, and
 * one reading is asserted per shape.
 *
 * The boxes are the shape `measureHeroBoxes` returns: rounded integers from
 * `getBoundingClientRect`, a `hero` box, a `clip` host, a `content` box and `children`
 * with `buttons` on the third. `at`, `name` and `route` are what the walk passes, so the
 * sentences the specs hold are the sentences a failure prints.
 */

const box = (left, right, top, bottom) => ({
  left,
  right,
  top,
  bottom,
  width: right - left,
  height: bottom - top,
});

const child = (node, { left, right, top, bottom, label = "", buttons = [] }) => ({
  label,
  node,
  ...box(left, right, top, bottom),
  buttons,
});

/** Three buttons on one line, the row a desktop hero holds. */
const buttonsOnOneLine = (top = 52, left = 700) => [
  { label: "Save", ...box(left, left + 80, top, top + 36) },
  { label: "Print this page", ...box(left + 92, left + 260, top, top + 36) },
  { label: "Reset", ...box(left + 272, left + 340, top, top + 36) },
];

const ICON = child("span.icon", { left: 20, right: 60, top: 40, bottom: 96 });
const COPY = child("div.copy", { left: 74, right: 680, top: 40, bottom: 96, label: "Settings" });
const ROW = child("div.row", {
  left: 700,
  right: 1326,
  top: 40,
  bottom: 88,
  label: "Save Print this page Reset",
  buttons: buttonsOnOneLine(),
});
/** The same row below the copy, full width: the phone shape of the same header. */
const ROW_BELOW = child("div.row", {
  left: 20,
  right: 1326,
  top: 108,
  bottom: 156,
  label: "Save Print this page Reset",
  buttons: buttonsOnOneLine(120, 20),
});

/** A header as `measureHeroBoxes` reads it, with the parts a spec is not about filled in. */
function hero(overrides = {}) {
  return {
    display: "grid",
    template: "40px 606px 1fr",
    tracks: 3,
    content: { left: 20, right: 1326 },
    heroScroll: 0,
    children: [ICON, COPY, ROW],
    hero: box(0, 1346, 20, 116),
    clip: { ...box(0, 1346, 0, 900), node: "main.host (hidden)" },
    ...overrides,
  };
}

const OPTIONS = { at: "1366px", name: "Settings", route: "/wingman/settings" };

describe("heroContainmentFailure", () => {
  it("holds a header whose children sit inside it, and its own box inside the page host", () => {
    expect(heroContainmentFailure(hero(), OPTIONS)).toBe(null);
    // The two-child shape goes through the same rule: what a hero owes is the shape of
    // its children, not the sheet that laid them out.
    expect(heroContainmentFailure(hero({ children: [ICON, COPY], tracks: 2 }), OPTIONS)).toBe(null);
  });

  it("reports a header that does not mount the icon and the copy", () => {
    expect(heroContainmentFailure(hero({ children: [ICON] }), OPTIONS)).toBe(
      "The Settings hero on /wingman/settings mounts 1 children at 1366px; the shared hero shape starts with the icon and the copy.",
    );
    // No children at all is the same fault rather than a crash in the reading: a header
    // that mounts nothing is what an empty template renders.
    expect(heroContainmentFailure({ ...hero(), children: [] }, OPTIONS)).toContain("mounts 0 children");
    expect(heroContainmentFailure({ ...hero(), children: undefined }, OPTIONS)).toContain("mounts 0 children");
  });

  it("reports a copy pushed into the icon column", () => {
    const inside = child("div.copy", { left: 50, right: 680, top: 40, bottom: 96, label: "Settings" });
    expect(heroContainmentFailure(hero({ children: [ICON, inside, ROW] }), OPTIONS)).toBe(
      "The Settings hero on /wingman/settings starts its copy at 50px at 1366px, inside the icon column"
      + " (the icon ends at 60px): the hero template puts the copy in the second column.",
    );
  });

  it("reports a header hiding its own content", () => {
    expect(heroContainmentFailure(hero({ heroScroll: 7 }), OPTIONS)).toBe(
      "The Settings hero on /wingman/settings hides 7px of its own content at 1366px (40px 606px 1fr).",
    );
  });

  it("reports a header with no ancestor that clips it, because nothing can then be read", () => {
    expect(heroContainmentFailure(hero({ clip: null }), OPTIONS)).toBe(
      "The Settings hero on /wingman/settings has no ancestor that clips its overflow at 1366px,"
      + " so whether the header is drawn inside the page cannot be read.",
    );
  });

  it("reads the header's own box against the host that clips it, and names both", () => {
    const wide = hero({ hero: box(0, 1400, 20, 116) });
    expect(heroContainmentFailure(wide, OPTIONS)).toBe(
      "The Settings hero on /wingman/settings is 1400px wide at 1366px and runs 54px past"
      + " the page host that clips it (main.host (hidden), 1346px, 0-1346px):"
      + " a header lays out at the width the page gives it rather than widening the page.",
    );
    // A header drawn off the other edge is the same sentence said the other way: the
    // children still fit it, which is why the children's reading cannot answer this.
    const offset = hero({ hero: box(-10, 1336, 20, 116) });
    expect(heroContainmentFailure(offset, OPTIONS)).toContain("runs 10px before the page host that clips it");
  });

  it("names the child that runs furthest past the content box, with its own overrun", () => {
    const escaped = child("div.copy", { left: 74, right: 1400, top: 40, bottom: 96, label: "Settings" });
    expect(heroContainmentFailure(hero({ children: [ICON, escaped, ROW] }), OPTIONS)).toBe(
      "The Settings hero on /wingman/settings lets child 2 (\"Settings\", div.copy) run 74px past"
      + " its own content box (20-1326px) at 1366px.",
    );
  });

  it("names the widest of several escaped children and the rest without boxes", () => {
    const escapedCopy = child("div.copy", { left: 74, right: 1400, top: 40, bottom: 96, label: "Settings" });
    const escapedRow = child("div.row", {
      left: 700,
      right: 1500,
      top: 40,
      bottom: 88,
      label: "Save Print this page Reset",
      buttons: buttonsOnOneLine(),
    });
    expect(heroContainmentFailure(hero({ children: [ICON, escapedCopy, escapedRow] }), OPTIONS)).toBe(
      "The Settings hero on /wingman/settings lets child 3 (\"Save Print this page Reset\", div.row) run 174px past"
      + " its own content box (20-1326px) at 1366px, the widest of 2 children that leave it (child 2 (\"Settings\", div.copy)).",
    );
  });

  it("names the route once, and not at all when the surface's name already carries it", () => {
    expect(heroContainmentFailure({ ...hero(), children: [] }, { at: "360px", name: "Sales Helper", route: "/wingman/call-coach" }))
      .toContain("The Sales Helper hero on /wingman/call-coach mounts 0 children at 360px");
    // The manifest sweep calls a hero by its route, so the phrase must not print it twice.
    expect(heroContainmentFailure({ ...hero(), children: [] }, { at: "360px", name: "/wingman/settings (Settings)", route: "/wingman/settings" }))
      .toContain("The /wingman/settings (Settings) hero mounts 0 children at 360px");
  });
});

describe("readHeroActionRow", () => {
  it("says a two-child header has no row to hold, rather than failing it", () => {
    // A row appearing on one of those headers is a design decision, which the caller
    // prints; the reading's job is only to say whether there is one.
    expect(readHeroActionRow(hero({ children: [ICON, COPY], tracks: 2 }), OPTIONS)).toEqual({
      present: false,
      failure: null,
    });
  });

  it("holds a row in the third column, and the same row on a line of its own", () => {
    expect(readHeroActionRow(hero(), { ...OPTIONS, expectsColumn: true })).toEqual({ present: true, failure: null });
    const stacked = hero({ children: [ICON, COPY, ROW_BELOW] });
    expect(readHeroActionRow(stacked, { ...OPTIONS, expectsColumn: false })).toEqual({ present: true, failure: null });
    // With no per-width contract the layout-independent half still passes both shapes:
    // a column of its own or a line of its own, which is the promise to a rep.
    expect(readHeroActionRow(hero(), OPTIONS).failure).toBe(null);
    expect(readHeroActionRow(stacked, OPTIONS).failure).toBe(null);
  });

  it("rejects a third child in the strip beside the copy, whichever shape the header is", () => {
    const beside = child("div.row", {
      left: 600,
      right: 1326,
      top: 40,
      bottom: 88,
      label: "Save Print this page Reset",
      buttons: buttonsOnOneLine(52, 600),
    });
    expect(readHeroActionRow(hero({ children: [ICON, COPY, beside] }), OPTIONS).failure).toBe(
      "The Settings hero on /wingman/settings puts its third child at 600px, beside the copy"
      + " (which ends at 680px) and above its foot (96px), at 1366px: a third child takes a column of its own"
      + " or a line of its own, never the strip beside the copy.",
    );
  });

  it("reports a row whose buttons stacked, with the top each one landed on", () => {
    const buttons = buttonsOnOneLine();
    buttons[1] = { ...buttons[1], top: 94, bottom: 130, height: 36 };
    const wrapped = child("div.row", { left: 700, right: 1326, top: 40, bottom: 130, label: "Save Print this page Reset", buttons });
    expect(readHeroActionRow(hero({ children: [ICON, COPY, wrapped] }), OPTIONS).failure).toBe(
      "The Settings hero on /wingman/settings stacked the buttons of its action row at 1366px:"
      + " Save at 52px, Print this page at 94px, Reset at 52px.",
    );
  });

  it("reports a row that wrapped its buttons inside a container of its own", () => {
    // Every button's top is the same here, so the tops alone read as one line: the row's
    // own height is what says the strip is too narrow for what it holds.
    const taller = child("div.row", {
      left: 700,
      right: 1326,
      top: 40,
      bottom: 128,
      label: "Save Print this page Reset",
      buttons: buttonsOnOneLine(),
    });
    expect(readHeroActionRow(hero({ children: [ICON, COPY, taller] }), OPTIONS).failure).toContain(
      "stacked the buttons of its action row at 1366px: Save at 52px, Print this page at 52px, Reset at 52px.",
    );
  });

  it("reports a button that left the header", () => {
    const buttons = buttonsOnOneLine();
    buttons[2] = { ...buttons[2], right: 1400, width: 340 };
    const spilling = child("div.row", { left: 700, right: 1400, top: 40, bottom: 88, label: "Save Print this page Reset", buttons });
    expect(readHeroActionRow(hero({ children: [ICON, COPY, spilling] }), { ...OPTIONS, expectsColumn: true }).failure).toBe(
      "The Settings hero on /wingman/settings ran its action row past the header at 1366px: Reset.",
    );
  });

  it("holds the per-width contract: a third column above 981px", () => {
    const twoColumns = hero({ template: "40px 606px", tracks: 2 });
    expect(readHeroActionRow(twoColumns, { ...OPTIONS, expectsColumn: true }).failure).toBe(
      "The Settings hero on /wingman/settings should lay its action row out in a third column at 1366px;"
      + " its template is 40px 606px.",
    );

    const inIconColumn = hero({ template: "40px 606px 1fr", tracks: 3, children: [ICON, COPY, { ...ROW, left: 600 }] });
    expect(readHeroActionRow(inIconColumn, { ...OPTIONS, expectsColumn: true }).failure).toBe(
      "The Settings hero on /wingman/settings puts its action row at 600px at 1366px, where the copy ends at 680px:"
      + " a two-column hero hands the third child the icon column.",
    );

    const pastEdge = hero({ children: [ICON, COPY, { ...ROW, right: 1400 }] });
    expect(readHeroActionRow(pastEdge, { ...OPTIONS, expectsColumn: true }).failure).toBe(
      "The Settings hero on /wingman/settings runs its action row past the header's own edge at 1366px.",
    );
  });

  it("holds the per-width contract: a line of its own below 981px", () => {
    const sharingLine = hero({ children: [ICON, COPY, { ...ROW_BELOW, top: 40 }] });
    expect(readHeroActionRow(sharingLine, { ...OPTIONS, expectsColumn: false }).failure).toBe(
      "The Settings hero on /wingman/settings lets its action row share a line with the copy at 1366px;"
      + " below 981px it takes a line of its own under it.",
    );

    // The width is set beside the edge, as `getBoundingClientRect` reports it: a box
    // written with a stale width is a box no browser could return.
    const narrow = hero({ children: [ICON, COPY, { ...ROW_BELOW, right: 900, width: 880 }] });
    expect(readHeroActionRow(narrow, { ...OPTIONS, expectsColumn: false }).failure).toBe(
      "The action row of the Settings hero on /wingman/settings is 880px wide at 1366px, narrower than the header's"
      + " 1306px content box, so it is not on a line of its own.",
    );
  });
});

describe("HERO_VIEWPORTS", () => {
  it("promises the third column from 981px, and reads the band the shared rule alone covers", () => {
    expect(HERO_VIEWPORTS.map((viewport) => [viewport.width, viewport.thirdColumn])).toEqual([
      [360, false],
      [980, false],
      [1000, true],
      [1024, true],
      [1280, true],
    ]);
    // A walk at the named breakpoints only would read the contract in two places; the
    // band between them is where the shared rule is the only thing giving the row its
    // column, so a width inside it is not optional.
    const columnar = HERO_VIEWPORTS.filter((viewport) => viewport.thirdColumn);
    expect(columnar[0].width).toBe(1000);
    expect(columnar[0].width).toBeGreaterThan(980);
    expect(columnar[0].width).toBeLessThan(1024);
  });

  it("reads each width once, in ascending order, with a height to set it at", () => {
    const widths = HERO_VIEWPORTS.map((viewport) => viewport.width);
    expect([...new Set(widths)]).toHaveLength(widths.length);
    expect(widths).toEqual([...widths].sort((left, right) => left - right));
    expect(HERO_VIEWPORTS.every((viewport) => viewport.height > 0)).toBe(true);
  });
});

describe("heroMeasuredOn", () => {
  it("puts the route after the surface, and leaves it off when the name already has it", () => {
    expect(heroMeasuredOn({ name: "Settings", route: "/wingman/settings" })).toBe("Settings hero on /wingman/settings");
    expect(heroMeasuredOn({ name: "/wingman/settings (Settings)", route: "/wingman/settings" }))
      .toBe("/wingman/settings (Settings) hero");
    // The two-child passes name their surface and no route, which is the shape the
    // phrase has to keep working without.
    expect(heroMeasuredOn({ name: "Sales Helper" })).toBe("Sales Helper hero");
  });
});
