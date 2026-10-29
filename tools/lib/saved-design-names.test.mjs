import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SAVED_DESIGN_NAME_FLOOR, savedDesignNameFailure } from "./saved-design-names.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const walk = readFileSync(path.join(here, "..", "browser-smoke-check.mjs"), "utf8");

const ROOM = "Northbridge Meeting Room Refresh";
const DESIGN = "Northbridge Meeting Room Refresh — east wing boardroom with dual 86 in displays and Dante audio";

describe("saved design name floor", () => {
  it("sits under the tightest either surface measures", () => {
    // The gallery card's narrowest phone prints 23 characters and the strip's
    // narrowest column keeps 40 since the two-column band stopped at 761px, so one
    // floor for both has to be under 23 — and high enough that a verb and a letter
    // cannot pass, which the old 12 was not.
    expect(SAVED_DESIGN_NAME_FLOOR).toBeLessThan(23);
    expect(SAVED_DESIGN_NAME_FLOOR).toBeGreaterThanOrEqual(16);
  });

  it("is the one number both readings hold", () => {
    // A surface that declares its own floor is the drift this module exists to
    // stop, and a green walk cannot see it: both surfaces would still pass while
    // one of them allowed a shorter name.
    expect(walk).not.toMatch(/DESIGN_NAME_CHARACTERS\s*=/);
    expect(walk).toContain("SAVED_DESIGN_NAME_FLOOR");
    expect(walk).toContain("savedDesignNameFailure");
  });

  it("counts the characters, the name's own length and the floor it was held to", () => {
    const message = savedDesignNameFailure({
      surface: "gallery card",
      room: ROOM,
      design: DESIGN,
      visible: 9,
      characters: 103,
      floor: SAVED_DESIGN_NAME_FLOOR,
      at: "360px",
    });

    expect(message).toContain(`The gallery card for ${ROOM} printed 9 of 103 characters of its saved design's name at 360px`);
    expect(message).toContain(`("${DESIGN}")`);
    expect(message).toContain(`has to keep at least ${SAVED_DESIGN_NAME_FLOOR}`);
    expect(message).toContain("how much of the design a rep can read before choosing between them");
  });

  it("names the surface it was taken on, so the two columns cannot be read as one", () => {
    const gallery = savedDesignNameFailure({ surface: "gallery card", room: ROOM, design: DESIGN, visible: 4, characters: 40, floor: SAVED_DESIGN_NAME_FLOOR, at: "1366px" });
    const strip = savedDesignNameFailure({ surface: "recent card", room: ROOM, design: DESIGN, visible: 4, characters: 40, floor: SAVED_DESIGN_NAME_FLOOR, at: "1366px" });

    expect(gallery).toContain("The gallery card for");
    expect(strip).toContain("The recent card for");
    // One wording, two surfaces: the claim after the numbers is the same sentence,
    // so a reader comparing the two failures is comparing the same promise.
    expect(gallery.replace("gallery card", "recent card")).toBe(strip);
    expect(gallery).not.toContain("three-column band");
  });
});
