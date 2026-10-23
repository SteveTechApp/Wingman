import { describe, expect, it } from "vitest";
import { wallLinkFromSearch } from "./wallLink";
import { DEFAULT_WALL_REVIEW_PASS, WALL_REVIEW_PASS_PARAM } from "./wallReviewPass";
import { WALL_SHARE_COPY_FAILED, wallShareClipboard, wallShareNote, wallSharePassName, wallShareSearch, wallSharedLinkNote } from "./wallShareLink";
import { wallPhysicalSize } from "./wallPhysicalSize";
import { WALL_PICK_PARAM } from "./wallPick";
import { defaultWallRequirements, type WallRequirements } from "./videowallOptions";

function wall(overrides: Partial<WallRequirements> = {}): WallRequirements {
  return { ...defaultWallRequirements, ...overrides };
}

describe("wallShareSearch", () => {
  it("carries the wall and the pass the rep is reading", () => {
    const design = wall({ application: "lcd-loop", layout: "single", columns: 4, rows: 1, windows: 1, sources: 2 });

    const shared = wallShareSearch("?view=expert", design, "transport");

    expect(shared.get(WALL_REVIEW_PASS_PARAM)).toBe("transport");
    // Every other parameter survives, so the link keeps the reading it was on.
    expect(shared.get("view")).toBe("expert");
    expect(wallLinkFromSearch(shared)?.columns).toBe(4);
  });

  it("drops the opening pass but still names the wall", () => {
    const shared = wallShareSearch("", wall({ columns: 2, rows: 2 }), DEFAULT_WALL_REVIEW_PASS);

    // A link to the default reading stays short; a link without the wall would
    // open whatever the recipient was last editing.
    expect(shared.get(WALL_REVIEW_PASS_PARAM)).toBeNull();
    expect(wallLinkFromSearch(shared)?.columns).toBe(2);
  });

  it("keeps the room's survey out of the link it builds", () => {
    const design = wall({
      measuredRuns: { "display-1": 9 },
      linkDetails: { "display-1": { enclosure: "Back box" } },
    });

    const shared = wallLinkFromSearch(wallShareSearch("", design, "wall"));

    expect(shared?.measuredRuns).toEqual({});
    expect(shared?.linkDetails).toEqual({});
  });

  it("replaces a wall the current address already names", () => {
    const first = wallShareSearch("", wall({ columns: 2, rows: 2 }), "wall");
    const second = wallShareSearch(first, wall({ columns: 4, rows: 1 }), "wall");

    expect(wallLinkFromSearch(second)?.columns).toBe(4);
  });

  it("carries the design the rep picked beside the wall and the pass", () => {
    const shared = wallShareSearch("", wall({ sources: 1 }), "transport", "mx-0404-scl");

    // A rep who chose another architecture is sending that design, not the one
    // Wingman would lead with for the same answers.
    expect(shared.get(WALL_PICK_PARAM)).toBe("mx-0404-scl");
    expect(shared.get(WALL_REVIEW_PASS_PARAM)).toBe("transport");
    expect(wallLinkFromSearch(shared)?.sources).toBe(1);
  });

  it("leaves the recommendation out and clears a pick the address already held", () => {
    const shared = wallShareSearch("?pick=nhd150", wall(), "wall", null);

    // The recipient's catalogue decides what leads for these answers; a stale
    // id would claim a design nobody chose this time.
    expect(shared.get(WALL_PICK_PARAM)).toBeNull();
  });
});

describe("wallShareNote", () => {
  it("names the design, the pass and what the link leaves behind", () => {
    const note = wallShareNote(wall({ columns: 3, rows: 2, sources: 4 }), "transport");

    expect(note).toContain("the 3 × 2 array with 4 sources");
    expect(note).toContain("opening on the transport and survey pass");
    // The link is a brief, not a recording; the confirmation says so.
    expect(note).toContain("Survey measurements stay with the room");
  });

  it("names the display with the same phrase the pasted line carries", () => {
    const design = wall({ columns: 2, rows: 2, sources: 2, panelDiagonalInches: 65 });

    // The rep reads the display in the confirmation and then sees the paste
    // quote the same size, so a copied link cannot describe two different walls.
    expect(wallShareNote(design, "wall")).toContain(", 65 in panels,");
    expect(wallShareNote(design, "wall")).toContain(wallPhysicalSize(design).basis);
    expect(wallShareClipboard({ requirements: design, pass: "wall", address: "https://wingman.test/wall" })).toContain(
      wallPhysicalSize(design).basis,
    );
  });

  it("names an LED pitch or a projector image instead of calling every wall a panel", () => {
    expect(wallShareNote(wall({ application: "led", pixelPitchMm: 1.9 }), "wall")).toContain(", 1.9 mm pixel pitch,");
    expect(wallShareNote(wall({ application: "projection", projectors: 2, panelDiagonalInches: 86 }), "wall")).toContain(
      ", 86 in images,",
    );
  });

  it("names the default pass and counts one source in the singular", () => {
    expect(wallShareNote(wall({ sources: 1 }), DEFAULT_WALL_REVIEW_PASS)).toContain("with 1 source,");
    expect(wallShareNote(wall({ sources: 1 }), DEFAULT_WALL_REVIEW_PASS)).toContain("opening on the design pass");
    expect(wallSharePassName("wall")).toBe("wall");
  });

  it("names the design the link carries when the rep picked one", () => {
    const note = wallShareNote(wall({ columns: 2, rows: 2, sources: 1 }), "decision", "MX-0404-SCL");

    expect(note).toContain("carrying MX-0404-SCL as the chosen design");
  });

  it("does not claim a chosen design when the link carries the recommendation", () => {
    expect(wallShareNote(wall(), "decision", null)).not.toContain("chosen design");
    expect(wallShareNote(wall(), "decision")).not.toContain("chosen design");
  });

  it("says the copy failed rather than looking as though it worked", () => {
    expect(WALL_SHARE_COPY_FAILED).toContain("Could not copy the link");
  });
});

describe("wallSharedLinkNote", () => {
  const address = "https://wingman.test/wingman/videowall?pass=transport";

  it("names the arriving wall with the display phrase the confirmation and paste quote", () => {
    const design = wall({ columns: 3, rows: 2, sources: 4, panelDiagonalInches: 65 });
    const note = wallSharedLinkNote(design);

    // The rep reads one size across the banner, the copy confirmation and the
    // line that gets pasted, so the shared wall cannot be described two ways.
    expect(note).toContain("the 3 × 2 array");
    expect(note).toContain(wallPhysicalSize(design).basis);
    expect(note).toContain(", 65 in panels.");
    expect(wallShareNote(design, "wall")).toContain(wallPhysicalSize(design).basis);
    expect(wallShareClipboard({ requirements: design, pass: "wall", address })).toContain(wallPhysicalSize(design).basis);
    // Still a note rather than a recording.
    expect(note).toContain("Survey measurements stay with the room");
  });

  it("quotes the surface the shared wall is built on, not a panel it has none of", () => {
    expect(wallSharedLinkNote(wall({ application: "led", pixelPitchMm: 1.9 }))).toContain("1.9 mm pixel pitch");
    expect(
      wallSharedLinkNote(wall({ application: "projection", projectors: 2, panelDiagonalInches: 86 })),
    ).toContain("86 in images");
  });
});

describe("wallShareClipboard", () => {
  const address = "https://wingman.test/wingman/videowall?pass=transport";

  it("names the project, the display, the panel and the address in one pasteable line", () => {
    const line = wallShareClipboard({ project: "Acme Boardroom", requirements: wall({ panelDiagonalInches: 55 }), pass: "transport", address });

    // A bare URL says nothing in chat until someone clicks it, so the line
    // carries who the wall is for, what they will be looking at, and which
    // panel of the review it opens.
    expect(line).toBe("Acme Boardroom — video wall, 55 in panels (transport and survey panel): " + address);
  });

  it("names the panel size this design carries, not a default one", () => {
    expect(wallShareClipboard({ project: "Acme Boardroom", requirements: wall({ panelDiagonalInches: 65 }), pass: "wall", address })).toBe(
      "Acme Boardroom — video wall, 65 in panels (wall panel): " + address,
    );
  });

  it("names the surface an LED or projection wall is built on instead of calling it a panel", () => {
    // The size phrase is the proposal's mounting basis, so an LED canvas quotes
    // its pitch and a projector pair quotes the image each one throws.
    expect(wallShareClipboard({ requirements: wall({ application: "led", pixelPitchMm: 1.9 }), pass: "decision", address })).toContain(
      "1.9 mm pixel pitch",
    );
    expect(wallShareClipboard({ requirements: wall({ application: "projection", projectors: 2, panelDiagonalInches: 86 }), pass: "decision", address })).toContain(
      "86 in images",
    );
  });

  it("says the wall has no project yet instead of inventing one", () => {
    expect(wallShareClipboard({ project: "   ", requirements: wall(), pass: "decision", address })).toBe(
      "New video wall, 55 in panels (design panel): " + address,
    );
    expect(wallShareClipboard({ requirements: wall(), pass: "decision", address })).toContain(
      "New video wall, 55 in panels (design panel): ",
    );
  });
});
