import JSZip from "jszip";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import type { StoredProjectProposal, StoredVideowallSummary } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { buildDisplaySchedule, displayScalingLabel } from "./displaySchedule";
import { buildProposalHtml } from "./proposalExport";
import { buildProposalDocx } from "./proposalDocxExport";
import { createProposalWizardDefaults } from "./proposalWizard";
import { defaultWallRequirements, wallCanvasPlan, wallResolutionSummary, type WallRequirements } from "./videowallOptions";
import { wallPhysicalSize } from "./wallPhysicalSize";

/** The exact payload shape the video wall builder saves onto the project. */
function wallFor(overrides: Partial<WallRequirements>): StoredVideowallSummary {
  const requirements: WallRequirements = { ...defaultWallRequirements, ...overrides };
  const resolution = wallResolutionSummary(requirements);
  const plan = wallCanvasPlan(requirements);
  return {
    savedAt: "2026-10-19T00:00:00.000Z",
    wallType: requirements.application.startsWith("lcd") ? "lcd" : requirements.application,
    summary: {
      version: 2,
      requirements,
      resolution: {
        canvas: resolution.canvas,
        display: resolution.display,
        source: resolution.source,
        mapping: resolution.label,
      },
      canvasPlan: {
        canvas: plan.canvas,
        native: plan.native,
        perPanel: plan.perPanel,
        recommended: plan.recommended,
        rationale: plan.rationale,
        text: plan.text,
      },
    },
  };
}

function proposalWith(patch: Partial<StoredProjectProposal>): StoredProjectProposal {
  return {
    title: "Display schedule test",
    summary: "Confirm display sizing.",
    sections: [],
    products: [],
    assumptions: [],
    updatedAt: "2026-10-19T00:00:00.000Z",
    ...patch,
  };
}

function displayScopeProposal(): StoredProjectProposal {
  return proposalWith({
    applicationProposal: {
      vertical: "Government",
      application: "Control room",
      executiveSummary: "Operational control room.",
      customerNeed: "Maintain visibility.",
      solutionOverview: "Sources route to displays.",
      benefits: [],
      userJourney: [],
      technicalFacts: [],
      architectureDiagram: "",
      acceptanceCriteria: [],
      visualBriefs: [],
      verifiedDesignParameters: [],
      deploymentConditions: [],
      thirdPartyScope: [
        {
          category: "Displays",
          description: "Operator and overview displays",
          responsibility: "Integrator",
          status: "allowance",
          quantity: 4,
          notes: "Confirm size and mounting.",
        },
        {
          category: "Cabling",
          description: "Cabling and consumables",
          responsibility: "Integrator",
          status: "allowance",
          quantity: 1,
          notes: "",
        },
        {
          category: "Display",
          description: "Customer-supplied video wall",
          responsibility: "By others",
          status: "by-others",
          quantity: 2,
          notes: "",
        },
      ],
    },
  });
}

const bom = (rows: Partial<SalesBomRow>[]): SalesBomRow[] => rows.map((row, index) => ({
  item: index + 1,
  sku: row.sku ?? "SKU",
  description: row.description ?? "",
  role: row.role ?? "",
  qty: row.qty ?? 1,
  type: row.type ?? "Required",
  status: row.status ?? "included",
  evidence: row.evidence ?? "",
  notes: row.notes ?? "",
}));

describe("buildDisplaySchedule", () => {
  it("lists one native feed per panel for an independent LCD wall", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({ application: "lcd-direct", layout: "independent", columns: 2, rows: 2, displayResolution: "1080p", sources: 4 }),
    );

    expect(schedule?.source).toBe("video-wall");
    expect(schedule?.rows).toHaveLength(4);
    expect(schedule?.rows[0]).toEqual({
      screen: "Panel 1",
      size: "1,218 × 685",
      weight: "21.7 kg",
      resolution: "1920 × 1080",
      feeds: "1 per panel",
      scaling: "Native 1:1 per panel",
      notes: "Panel 1 of 4 in a 2 × 2 array",
      transport: "HDMI 2.0 copper (passive) · ≈5 m · 15 m passive limit",
      transportStatus: "ok",
    });
    // The schedule quotes the same millimetres the elevation caption prints.
    expect(schedule?.size).toBe("Wall 2,436 × 1,370 mm · 55 in panels at 1,218 × 685 mm");
    // Mass and the mounting opening follow that same panel size.
    expect(schedule?.mounting).toBe(
      "4 panels at 21.7 kg planning mass (87 kg total); keep 100 mm clear each side — 2,636 × 1,570 mm opening. Confirm mass and fixings with the panel datasheet.",
    );
    expect(schedule?.headline).toBe(
      "4 panel feeds at 1920 × 1080 each from a 3840 × 2160 source. 4 source links and 4 display links. Every link fits its transport.",
    );
    expect(schedule?.transportFlags).toEqual([]);
  });

  it("prints one row per feed for a grouped wall, with that feed's own cable", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({
        application: "lcd-grouped",
        layout: "single",
        columns: 3,
        rows: 3,
        windows: 1,
        displayFeeds: 3,
        sources: 2,
        displayResolution: "4k",
        sourceResolution: "4k60",
        sourceLocation: "local",
        // One feed measured longer, so the rows can only agree if each looks its
        // own cable up rather than taking the link at the same position.
        measuredRuns: { "feed-2": 30 },
      }),
    );

    expect(schedule?.source).toBe("video-wall");
    expect(schedule?.rows.map((row) => row.screen)).toEqual([
      "Feed 1 · panels 1–3",
      "Feed 2 · panels 4–6",
      "Feed 3 · panels 7–9",
    ]);
    expect(schedule?.rows[0].feeds).toBe("1 loop of 3");
    expect(schedule?.rows[1].notes).toContain("panels 4–6 on one head-end feed");
    expect(schedule?.rows[1].transport).toContain("30 m measured");
    expect(schedule?.rows[0].transport).not.toContain("30 m");
    expect(schedule?.rows[2].transport).not.toContain("30 m");
    // The feed count the wall is wired on, not one row per panel.
    expect(schedule?.headline).toContain("3 feeds drive 9 panels");
  });

  it("prints the scaled tile resolution, the looped feed count and the agreed crop", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1 }),
    );

    // 7680 × 6480 native array is scaled to fit one 4K output, so each tile
    // receives 1280 × 720 rather than the panel's native 3840 × 2160.
    expect(schedule?.rows).toHaveLength(6);
    expect(schedule?.rows[0]).toMatchObject({
      screen: "Panel 1",
      resolution: "1280 × 720",
      feeds: "1 looped tile",
      scaling: "Fill, edges cropped on a 2560 × 2160 canvas",
      notes: "Tile 1 of 6 · 1 window composed once on the canvas",
      transport: "HDMI 2.0 copper (passive) · ≈5 m · 15 m passive limit",
    });
    // Loop-through panels carry the chain allowance alongside the per-hop run.
    expect(schedule?.rows[5]).toMatchObject({
      screen: "Panel 6",
      transport: "HDMI loop-through (panel to panel) · ≈3 m per hop · ≈20 m chain · 15 m limit per hop",
      transportStatus: "ok",
    });
    expect(schedule?.headline).toBe(
      "One 2560 × 2160 canvas tiled across 6 panels at 1280 × 720 each. 4 source links and 6 display links. Every link fits its transport.",
    );
    expect(schedule?.basis).toContain("Program 2560 × 2160 (native array 7680 × 6480, each panel 1280 × 720)");
    expect(schedule?.basis).toContain("cropped left and right");
  });

  it("describes an LED canvas as one processor input", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({ application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 1080, windows: 2 }),
    );

    expect(schedule?.rows).toEqual([{
      screen: "LED canvas",
      // An LED wall has no panels, so its screen is the canvas it builds, and
      // the row carries the mass of the cabinets that build it.
      size: "9,600 × 2,700",
      weight: "778 kg",
      resolution: "3840 × 1080",
      feeds: "1 processor input",
      scaling: displayScalingLabel(wallCanvasPlan({ ...defaultWallRequirements, application: "led", ledCanvasWidth: 3840, ledCanvasHeight: 1080, windows: 2 }).recommended),
      notes: "2 × 2 cabinets mapped by the LED processor · 2 windows",
      transport: "HDMI 2.0 copper (passive) · ≈5 m · 15 m passive limit",
      transportStatus: "ok",
    }]);
    expect(schedule?.headline).toBe(
      "One 3840 × 1080 LED canvas carries the content from a 3840 × 2160 source. 4 source links and 1 display link. Every link fits its transport.",
    );
    expect(schedule?.mounting).toContain("778 kg planning mass for 25.92 m² of cabinets");
    expect(schedule?.mounting).toContain("9,800 × 2,900 mm opening");
  });

  it("describes a projection screen as a single native feed", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({ application: "projection", columns: 1, rows: 1, windows: 4 }),
    );

    expect(schedule?.rows).toEqual([{
      screen: "Projector",
      size: "1,218 × 685",
      // A projection screen's mass follows its surface, so no mass is derived
      // from its outline; the clearance still is.
      weight: "",
      resolution: "3840 × 2160",
      feeds: "1",
      scaling: "Native 1:1",
      notes: "4 windows on one screen · lens and geometry confirmed at survey",
      transport: "HDMI 2.0 copper (passive) · ≈5 m · 5 m passive limit · Watch",
      transportStatus: "watch",
    }]);
    expect(schedule?.headline).toBe(
      "One 3840 × 2160 projection screen from a 3840 × 2160 source. 4 source links and 1 display link. 1 needs a closer look.",
    );
    // A run sitting on the passive limit is a customer-facing limitation.
    expect(schedule?.transportFlags).toEqual([
      "Projector 1 — This run sits at the 5 m passive HDMI limit at this timing; specify an active or fibre cable for headroom.",
    ]);
    expect(schedule?.mounting).toBe(
      "keep 100 mm clear each side — 1,418 × 885 mm opening. Screen mass and fixing points come from the specified screen.",
    );
  });

  it("prints a measured run and flags the exact over-limit link", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({
        application: "lcd-direct",
        layout: "independent",
        columns: 2,
        rows: 1,
        sources: 1,
        displayResolution: "4k",
        measuredRuns: { "display-2": 9 },
      }),
    );

    expect(schedule?.rows[1]).toMatchObject({
      screen: "Panel 2",
      transport: "HDMI 2.0 copper (passive) · 9 m measured · 5 m passive limit · Over limit",
      transportStatus: "limit",
    });
    expect(schedule?.transportFlags).toContain(
      "Panel 2 — The measured 9 m run exceeds the 5 m passive HDMI limit at this timing; use an active cable, fibre or an extender.",
    );
    expect(schedule?.transportFlags.join(" ")).toContain("Panel 1 — ");
    expect(schedule?.headline).toContain("1 exceeds a transport limit");
    expect(schedule?.basis).toContain("1 of 3 links use a cable run measured on site");
  });

  it("folds a large array into a grouped row after twelve screens", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({ application: "lcd-direct", layout: "independent", columns: 4, rows: 4 }),
    );

    expect(schedule?.rows).toHaveLength(12);
    expect(schedule?.rows[11]).toMatchObject({
      screen: "Panels 12–16",
      feeds: "1 per panel",
      notes: "5 identical panel feeds",
      // The folded row keeps the transport of the link it summarises.
      transport: "HDMI 2.0 copper (passive) · ≈5 m · 5 m passive limit · Watch",
      transportStatus: "watch",
    });
  });

  it("falls back to the recorded display scope when no wall is saved", () => {
    const schedule = buildDisplaySchedule(displayScopeProposal(), []);

    expect(schedule?.source).toBe("scope");
    expect(schedule?.rows).toHaveLength(4);
    expect(schedule?.rows[0]).toEqual({
      screen: "Display 1",
      size: "",
      weight: "",
      resolution: "To confirm",
      feeds: "1",
      scaling: "Native 1:1, confirm at survey",
      notes: "Operator and overview displays",
      transport: "",
    });
    expect(schedule?.size).toBe("");
    expect(schedule?.mounting).toBe("");
    expect(schedule?.headline).toBe("4 displays in scope, each driven by one feed.");
    expect(schedule?.transportFlags).toEqual([]);
  });

  it("takes display quantities from the governed equipment schedule and ignores encoders", () => {
    const schedule = buildDisplaySchedule(
      proposalWith({}),
      bom([
        { sku: "NHD-600-TX", description: "NetworkHD 600 encoder", role: "Source endpoint", qty: 2 },
        { sku: "DISP-86", description: "86 inch 4K display", role: "Operator display", qty: 2 },
        { sku: "DISP-98", description: "98 inch signage screen", role: "Lobby screen", qty: 1 },
      ]),
    );

    expect(schedule?.source).toBe("equipment");
    expect(schedule?.rows).toHaveLength(3);
    expect(schedule?.rows[0].notes).toBe("DISP-86 — 86 inch 4K display");
    expect(schedule?.rows.map((row) => row.notes).join(" ")).not.toContain("encoder");
  });

  it("keeps the schedule while leaving transport blank for a summary without layout answers", () => {
    const saved = wallFor({ application: "lcd-direct", layout: "independent", columns: 2, rows: 2 });
    const summary = saved.summary as Record<string, unknown>;
    const requirements = summary.requirements as Record<string, unknown>;
    delete requirements.columns;
    delete requirements.rows;
    delete requirements.sources;

    const schedule = buildDisplaySchedule(proposalWith({}), [], { summary });

    expect(schedule?.rows).toHaveLength(1);
    expect(schedule?.rows[0]).toMatchObject({ screen: "Panel 1", transport: "" });
    expect(schedule?.rows[0]).not.toHaveProperty("transportStatus");
    expect(schedule?.transportFlags).toEqual([]);
    expect(schedule?.headline).not.toMatch(/NaN|undefined/);
  });

  it("returns no schedule when nothing describes a screen", () => {
    expect(buildDisplaySchedule(proposalWith({}), bom([{ sku: "NHD-600-TX", description: "NetworkHD 600 encoder", qty: 1 }]))).toBeNull();
  });
});

describe("survey installation detail in the proposal outputs", () => {
  const wall = wallFor({
    application: "lcd-direct",
    layout: "independent",
    columns: 2,
    rows: 1,
    sources: 1,
    linkDetails: {
      "source-1": { enclosure: "Rack shelf", entry: "Rack rear", termination: "HDMI faceplate" },
      "display-2": { enclosure: "Back box", mount: "Tilt bracket", entry: "Floor box", termination: "Cat6A outlet" },
    },
  });

  it("carries each surveyed link's housing, mount, termination and run entry", () => {
    const schedule = buildDisplaySchedule(proposalWith({}), [], wall)!;

    expect(schedule.install).toEqual({
      rows: [
        {
          id: "source-1",
          link: "Source 1",
          group: "source",
          enclosure: "Rack shelf",
          mount: "—",
          termination: "HDMI faceplate",
          entry: "Rack rear",
        },
        {
          id: "display-1",
          link: "Panel 1",
          group: "display",
          enclosure: "Not recorded",
          mount: "—",
          termination: "Not recorded",
          entry: "Not recorded",
        },
        {
          id: "display-2",
          link: "Panel 2",
          group: "display",
          enclosure: "Back box",
          mount: "Tilt bracket",
          termination: "Cat6A outlet",
          entry: "Floor box",
        },
      ],
      recorded: 2,
      linkCount: 3,
      text: "Site survey detail is recorded for 2 of 3 links. Missing display housing, run entry or termination: Panel 1. These details remain to be confirmed before installation.",
    });
  });

  it("prints the installation detail in the screen export", () => {
    const html = buildProposalHtml(proposalWith({}), [], [], null, wall);

    expect(html).toContain("<h3>Installation Detail</h3>");
    expect(html).toContain("2 of 3 links");
    expect(html).toContain(
      "<td>Source 1</td><td>Rack shelf</td><td>—</td><td>HDMI faceplate</td><td>Rack rear</td>",
    );
    expect(html).toContain(
      "<td>Panel 2</td><td>Back box</td><td>Tilt bracket</td><td>Cat6A outlet</td><td>Floor box</td>",
    );
    // Only links with something recorded are listed, so an empty row cannot be
    // mistaken for a survey result.
    expect(html).not.toContain("<td>Panel 1</td><td>—</td>");
  });

  it("names every missing link when the survey recorded no installation detail", () => {
    const plain = wallFor({ application: "lcd-direct", layout: "single", columns: 2, rows: 1 });
    const schedule = buildDisplaySchedule(proposalWith({}), [], plain)!;

    expect(schedule.install?.recorded).toBe(0);
    expect(
      schedule.install?.rows.every(
        (row) => row.enclosure === "Not recorded" && row.entry === "Not recorded" && row.termination === "Not recorded",
      ),
    ).toBe(true);
    expect(buildProposalHtml(proposalWith({}), [], [], null, plain)).toContain("Installation Detail");
  });
});

describe("display schedule in the proposal outputs", () => {
  const wall = wallFor({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1 });

  it("renders the table and each link's transport in the screen/HTML export", () => {
    const html = buildProposalHtml(displayScopeProposal(), [], [], null, wall);

    expect(html).toContain("<h2>Display Schedule</h2>");
    // The saved wall drawing accompanies the schedule.
    expect(html).toContain("<figure");
    expect(html).toContain('role="img"');
    expect(html).toContain('class="wall-elevation-panel"');
    expect(html).toContain("Wall elevation: 2 × 3 array");
    expect(html).toContain("<th>Screen</th><th>Size (mm)</th><th>Weight</th><th>Resolution</th><th>Feeds</th><th>Transport</th><th>Scaling</th><th>Notes</th>");
    expect(html).toContain("<td>Panel 1</td><td style=\"white-space:nowrap\">1,218 × 685</td><td style=\"white-space:nowrap\">21.7 kg</td><td>1280 × 720</td><td>1 looped tile</td><td>HDMI 2.0 copper (passive) · ≈5 m · 15 m passive limit</td><td>Fill, edges cropped on a 2560 × 2160 canvas</td>");
    // The panel mass and the opening the mounting surface must keep free print
    // with the schedule they were derived for.
    expect(html).toContain("<strong>Mounting:</strong> 6 panels at 21.7 kg planning mass (130 kg total); keep 100 mm clear each side — 2,636 × 2,255 mm opening.");
    // The table caption names the wall and its panels in millimetres.
    expect(html).toContain("<caption style=\"caption-side:top;text-align:left;padding:0 0 8px;font-size:12px;color:#475569;\">Wall 2,436 × 2,055 mm · 55 in panels at 1,218 × 685 mm</caption>");
    expect(html).toContain("<td>Panel 6</td>");
    expect(html).toContain("HDMI loop-through (panel to panel) · ≈3 m per hop · ≈20 m chain · 15 m limit per hop");
    // The cable column's numbers are explained in the survey sheet's own words,
    // so a reader of the proposal meets the same allowance, limit and in-design.
    expect(html).toContain("data-wall-cable-key");
    expect(html).toContain("<strong>Allowance</strong> — The cable length the design assumes for this link.");
    expect(html).toContain("<strong>Limit</strong> — The longest run this cable and transport carry.");
    expect(html).toContain("<strong>In design</strong> — The run the saved design already holds for this link");
    expect(html).toContain("<strong>Basis:</strong>");
    // Both mappings print beside each other, so the customer can compare them.
    expect(html).toContain("Source mapping options");
    expect(html).toMatch(/>Fit<\/p>/);
    // The pair names the design's choice and, from the captured plan, the one
    // Wingman recommends.
    expect(html).toMatch(/>Fill · in this design · recommended<\/p>/);
    expect(html).toContain('data-mapping-recommendation="fill"');
    expect(html).toContain("<strong>Recommendation: Fill.</strong>");
    expect(html).toContain("The captured plan shows one window at a time from 4 switchable sources");
    expect(html).toContain("360 px bars top and bottom");
    expect(html).toContain("640 px cropped left and right");
    // The agreed drawing plus the two compact previews, six panels each.
    expect(html.match(/class="wall-elevation-panel"/g)).toHaveLength(18);
    // The section sits with the technical substantiation, before the equipment list.
    expect(html.indexOf("<h2>Display Schedule</h2>")).toBeLessThan(html.indexOf("<h2>Equipment Schedule</h2>"));
  });

  it("quotes the same wall and panel millimetres as the dimensioned elevation", () => {
    const requirements = { ...defaultWallRequirements, application: "lcd-loop" as const, layout: "single" as const, columns: 2, rows: 3, windows: 1 };
    const html = buildProposalHtml(proposalWith({}), [], [], null, wallFor({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1 }));
    const size = wallPhysicalSize(requirements).text;

    expect(size).toBe("Wall 2,436 × 2,055 mm · 55 in panels at 1,218 × 685 mm");
    // The table caption, the row size and the elevation caption all print it.
    expect(html).toContain(`<caption style="caption-side:top;text-align:left;padding:0 0 8px;font-size:12px;color:#475569;">${size}</caption>`);
    expect(html).toContain("<figcaption style=\"margin-top:10px;font-size:12px;line-height:1.5;color:#475569;\">Wall elevation: 2 × 3 array");
    // The elevation caption states the same wall and panel size, sentence for sentence.
    expect(html).toContain(`. ${size}.`);
    expect(html).toContain("<td style=\"white-space:nowrap\">1,218 × 685</td>");
  });

  it("prints the wall's transport limits and keeps the column out of catalogue schedules", () => {
    const html = buildProposalHtml(proposalWith({}), [], [], null, wallFor({ application: "projection", columns: 1, rows: 1, windows: 4 }));

    expect(html).toContain("HDMI 2.0 copper (passive) · ≈5 m · 5 m passive limit · Watch");
    expect(html).toContain("<strong>Transport limits:</strong>");
    expect(html).toContain("Projector 1 — This run sits at the 5 m passive HDMI limit");

    // Without a saved wall there is no link estimate or drawing, so both are omitted.
    const catalogue = buildProposalHtml(displayScopeProposal(), []);
    expect(catalogue).toContain("<h2>Display Schedule</h2>");
    expect(catalogue).not.toContain("<th>Transport</th>");
    // No cable column means no key for one either.
    expect(catalogue).not.toContain("data-wall-cable-key");
    // No physical size means no derived mass or clearance either.
    expect(catalogue).not.toContain("<th>Weight</th>");
    expect(catalogue).not.toContain("<strong>Mounting:</strong>");
    // The document sheet always names the elevation parts, so the drawing is
    // absent when no element carries one of their classes.
    expect(catalogue).not.toContain('class="wall-elevation');
  });

  it("renders the same table in the DOCX export", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "display-schedule",
      projectName: "Display schedule",
      preparedBy: "Team",
      executiveSummary: "Summary",
      architectureNarrative: "Architecture",
    });
    const buffer = await Packer.toBuffer(buildProposalDocx(displayScopeProposal(), [], wizard, {}, wall));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Display Schedule");
    expect(text).toContain("Panel 1");
    expect(text).toContain("1280 × 720");
    expect(text).toContain("1 looped tile");
    // The millimetre column and the wall size agree with the HTML schedule.
    expect(text).toContain("Size (mm)");
    expect(text).toContain("Wall 2,436 × 2,055 mm · 55 in panels at 1,218 × 685 mm");
    expect(text).toContain("1,218 × 685");
    expect(text).toContain("Weight");
    expect(text).toContain("21.7 kg");
    expect(text).toContain("Mounting:");
    expect(text).toContain("2,636 × 2,255 mm opening");
    expect(text).toContain("HDMI 2.0 copper (passive) · ≈5 m · 15 m passive limit");
    expect(text).toContain("HDMI loop-through (panel to panel) · ≈3 m per hop · ≈20 m chain · 15 m limit per hop");
    expect(text).toContain("Fill, edges cropped on a 2560 × 2160 canvas");
    expect(text).toContain("Basis:");
  });

  it("lists the wall's transport limits in the DOCX export", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "display-transport",
      projectName: "Display transport",
      preparedBy: "Team",
      executiveSummary: "Summary",
      architectureNarrative: "Architecture",
    });
    const buffer = await Packer.toBuffer(buildProposalDocx(
      proposalWith({}),
      [],
      wizard,
      {},
      wallFor({ application: "projection", columns: 1, rows: 1, windows: 4 }),
    ));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Transport");
    expect(text).toContain("5 m passive limit · Watch");
    expect(text).toContain("Transport limits:");
    expect(text).toContain("Projector 1 — This run sits at the 5 m passive HDMI limit");
  });

  it("embeds the rasterised wall elevation in the DOCX export", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "display-elevation",
      projectName: "Display elevation",
      preparedBy: "Team",
      executiveSummary: "Summary",
      architectureNarrative: "Architecture",
    });
    // A 1 × 1 PNG stands in for the browser-rasterised elevation.
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (character) => character.charCodeAt(0));
    const buffer = await Packer.toBuffer(buildProposalDocx(
      proposalWith({}),
      [],
      wizard,
      { wallElevation: { data: png, type: "png", title: "Wall elevation", width: 1067, height: 900 } },
      wallFor({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1 }),
    ));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(xml).toContain("<w:drawing>");
    expect(Object.keys(zip.files).some((name) => name.startsWith("word/media/"))).toBe(true);
    expect(text).toContain("Wall elevation: 2 × 3 array");
    // The caption is the drawing's own (wallVisualLayout), so Word repeats the
    // panel count the elevation tiles rather than a second description of it.
    expect(text).toContain("One canvas spans all 6 panels");
  });

  it("prints both mappings side by side in the DOCX export", async () => {
    const wizard = createProposalWizardDefaults({
      projectId: "display-mapping",
      projectName: "Display mapping",
      preparedBy: "Team",
      executiveSummary: "Summary",
      architectureNarrative: "Architecture",
    });
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (character) => character.charCodeAt(0));
    const image = (title: string) => ({ data: png, type: "png" as const, title, width: 1067, height: 900 });
    const buffer = await Packer.toBuffer(buildProposalDocx(
      proposalWith({}),
      [],
      wizard,
      {
        wallElevation: image("Wall elevation"),
        wallPreviews: {
          chosen: "fit",
          options: [
            { value: "fit", consequence: "Leaves 25% of the wall as black bars, 360 px top and bottom.", image: image("Wall elevation, fit") },
            { value: "fill", consequence: "Loses 50% of the picture to the crop, 640 px left and right.", image: image("Wall elevation, fill") },
          ],
        },
      },
      wallFor({ application: "lcd-loop", layout: "single", columns: 2, rows: 3, windows: 1 }),
    ));
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file("word/document.xml")!.async("string");
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Source mapping options");
    expect(text).toContain("Fit · in this design");
    expect(text).toContain("Recommendation: Fill.");
    expect(text).toContain("one window at a time from 4 switchable sources");
    expect(text).toContain("Fill · recommended");
    expect(text).toContain("Leaves 25% of the wall as black bars, 360 px top and bottom.");
    expect(text).toContain("Fill");
    expect(text).toContain("Loses 50% of the picture to the crop, 640 px left and right.");
    // The lead states what the pair is for: one of these costs has to be paid.
    expect(text).toContain("this design uses Fit");
    // The agreed drawing and both previews are placed in the document, even
    // when identical fixture bytes let Word pack them as one media part.
    expect(xml.match(/<w:drawing>/g)).toHaveLength(3);
    expect(Object.keys(zip.files).filter((name) => name.startsWith("word/media/")).length).toBeGreaterThanOrEqual(2);
  });

  it("scales the derived mass and opening with the panel the rep chose", () => {
    const single = (diagonal: number) => buildDisplaySchedule(
      proposalWith({}),
      [],
      wallFor({ application: "lcd-direct", layout: "independent", columns: 1, rows: 1, panelDiagonalInches: diagonal }),
    )!;

    expect(single(55).rows[0].weight).toBe("21.7 kg");
    expect(single(86).rows[0].weight).toBe("53 kg");
    expect(single(55).mounting).toContain("1,418 × 885 mm opening");
    expect(single(86).mounting).toContain("2,104 × 1,271 mm opening");
  });

  it("omits the section when no screen can be described", () => {
    const html = buildProposalHtml(proposalWith({ summary: "No screens here." }), []);
    expect(html).not.toContain("<h2>Display Schedule</h2>");
  });
});
