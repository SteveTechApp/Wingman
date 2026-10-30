import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WALL_ENTRY_NAME, WALL_ENTRY_SENTENCE_NAME } from "../wingman2/lib/wallEntry";

/**
 * The instructions that send a rep to the wall page from inside a project.
 *
 * Six places do it: the starting points the Discovery route offers, its wall
 * handoff card, the two panels the project record keeps for the survey and the
 * transport, the install cells the proposal and the template review each mount,
 * and the validator's line that stands in for those cells where they cannot be
 * typed. Every one of them used
 * to call the page `builder` — its working name in the code, which no rep has
 * ever read — while the page they arrived on said `Video wall designer` in its
 * own chrome. A rep who follows an instruction has to arrive at the thing it
 * named.
 *
 * Read as source rather than rendered, because these surfaces are a page, a
 * record's panels and a validator's copy: the sentence a rep reads is one string
 * in all of them, and the point is that none of them writes its own.
 */
const PRINTING_INSTRUCTION_SURFACES = [
  "src/wingman2/pages/OpportunitiesPage.tsx",
  "src/wingman2/pages/DiscoveryPage.tsx",
  "src/wingman2/pages/project/WallSurveyPhotoReview.tsx",
  "src/wingman2/pages/project/WallTransportReview.tsx",
  "src/wingman2/components/WallSurveyGapFixes.tsx",
  "src/wingman2/lib/proposalExportValidation.ts",
];

/**
 * The panel that decides whether the validator's line or the install cells
 * stand. It prints no instruction of its own, so it is out of the list above,
 * but it quotes that line and can therefore put the page's old name in front of
 * a rep just as easily.
 */
const QUOTING_SURFACE = "src/wingman2/components/TemplateExportValidation.tsx";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

/**
 * The route's two names: the one its page chrome prints, and the short one its
 * nav form keeps. Both are read from the manifest the app reads them from.
 */
function videowallRoute() {
  const manifest = JSON.parse(source("src/wingman2/app/route-manifest.json")) as Array<{
    key: string;
    label: string;
    navLabel: string;
  }>;

  return manifest.find((route) => route.key === "videowall")!;
}

describe("the wall page's instructions", () => {
  it("print the entry's name wherever a rep is sent to it", () => {
    // The sentence form is the name with the article a sentence needs, so a
    // surface prints the name itself or that form and there is no second casing
    // to keep in step.
    expect(WALL_ENTRY_SENTENCE_NAME).toBe(`the ${WALL_ENTRY_NAME}`);

    for (const path of PRINTING_INSTRUCTION_SURFACES) {
      const text = source(path);

      expect(text, `${path} should print the entry's own name`).toMatch(/WALL_ENTRY_(SENTENCE_)?NAME/);
    }
  });

  it("never call the page by its working name", () => {
    for (const path of [...PRINTING_INSTRUCTION_SURFACES, QUOTING_SURFACE]) {
      // The working name reads well in code and names nothing a rep can find on
      // the page they land on, which is the drift this holds shut.
      expect(source(path), `${path} should not call the page its working name`).not.toMatch(/wall builder/i);
    }
  });

  it("name the page the way the page's own chrome does", () => {
    // The label is what prints on arrival, so it is the name every instruction
    // above promises. Renaming the entry breaks all of them at once, which is
    // why the pairing is asserted rather than assumed.
    expect(videowallRoute().label).toBe(WALL_ENTRY_NAME);
  });

  /**
   * The one link into the page that keeps its own words, held here so it stays a
   * decision rather than an exception someone tidies away.
   *
   * Discovery's journey strip is a list of destinations, not an instruction
   * offering the wall job, and it names each route the way the app knows it rather
   * than the way the manifest `label` prints — the rule, with the routes whose two
   * names differ, is recorded in `features/navigation/featureJourney.ts`. So its
   * entry for this route names the route in the short form the nav row would keep
   * ("Video Wall") instead of the page's own name, which a rep reads in the chrome
   * they land on either way. Aligning this entry to `WALL_ENTRY_NAME` therefore
   * fails: what the strip promises is a destination, and a page name in a list of
   * destinations reads as a second name for the same route.
   */
  it("names the wall route in the journey strip the short way, not the page's way", () => {
    const strip = source("src/wingman2/features/navigation/featureJourney.ts");

    expect(strip, "the strip's entry should name the route in its short form")
      .toMatch(new RegExp(`label: "Open ${videowallRoute().navLabel}"`));
    expect(strip, "the strip names a destination, so it must not print the page's name")
      .not.toContain("WALL_ENTRY_NAME");
    // The page's working name in code is not a rep-facing name on any surface,
    // the strip included.
    expect(strip).not.toMatch(/wall builder/i);
  });
});
