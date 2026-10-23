import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultWallRequirements } from "./videowallOptions";
import { wallTransportPlan, type WallTransportPlan } from "./videowallTransport";
import { buildWallSurveyWorksheet, printWallSurveyWorksheet } from "./wallSurveyWorksheet";

function requirements(overrides: Partial<typeof defaultWallRequirements> = {}) {
  return { ...defaultWallRequirements, ...overrides };
}

function plan(overrides: Partial<typeof defaultWallRequirements> = {}): WallTransportPlan {
  return wallTransportPlan(requirements(overrides));
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("wall measurement worksheet", () => {
  it("prints the agreed wall with one row per physical link", () => {
    const design = requirements({ layout: "independent", columns: 4, rows: 4, sources: 1 });
    const html = buildWallSurveyWorksheet(design, wallTransportPlan(design), { generatedAt: "2026-10-20T09:00:00Z" });

    expect(html).toContain("Wall measurement worksheet");
    expect(html).toContain("@page { size: A4 portrait");
    expect(html).toContain("<svg");
    expect(html).toContain("Wall elevation:");

    // A folded transport table still yields one row per link on paper.
    expect(html).not.toContain("Panel 12–16");
    expect(count(html, 'class="box"')).toBe(17);
    expect(count(html, 'class="id"')).toBe(17);
    expect(html).toContain("display-16");
    expect(html).toContain("Sources → head end");
    expect(html).toContain("Head end → displays");
    expect(html).toContain("generated 20 October 2026");
  });

  it("leaves a writing box for every run, with nothing to type on", () => {
    const html = buildWallSurveyWorksheet(requirements(), plan({ measuredRuns: { "display-1": 9 } }));

    expect(html).not.toContain("<input");
    expect(html).not.toContain("<textarea");
    // The recorded value is reference only; the box beside it stays blank.
    expect(html).toContain('<td class="num recorded">9 m</td>');
    expect(html).toContain("1 of 8 links already hold a recorded run");
    expect(count(html, 'class="box"')).toBe(8);
  });

  it("says nothing about recorded runs when none exist", () => {
    const html = buildWallSurveyWorksheet(requirements(), plan());
    expect(html).not.toContain("already hold a recorded run");
    expect(html).toContain("a blank keeps the design allowance.");
  });

  it("explains allowance, limit and in-design on the sheet itself", () => {
    const html = buildWallSurveyWorksheet(requirements(), plan());

    // A surveyor reads this page in the room with the builder closed, so the
    // three numbers beside each link carry their own definition.
    expect(html).toContain("data-wall-column-key");
    expect(count(html, "data-column-key=")).toBe(3);
    expect(html).toContain("<dt>Allowance</dt><dd>The cable length the design assumes for this link. A blank box keeps it.</dd>");
    expect(html).toContain("<dt>Limit</dt><dd>The longest run this cable and transport carry.");
    expect(html).toContain("<dt>In design</dt>");
    expect(html).toContain("for reference only");

    // It explains columns the table prints, and sits with them: after the
    // writing note, before the first row.
    expect(html).toContain('<th scope="col">Allowance</th>');
    expect(html).toContain('<th scope="col">Limit</th>');
    expect(html).toContain('<th scope="col">In design</th>');
    expect(html.indexOf("data-wall-column-key")).toBeGreaterThan(html.indexOf("Capture every run"));
    expect(html.indexOf("data-wall-column-key")).toBeLessThan(html.indexOf("<thead>"));
  });

  it("prints display-end boxes on display links and no install cells on source links", () => {
    const design = requirements({ columns: 2, rows: 1, sources: 1 });
    const html = buildWallSurveyWorksheet(design, wallTransportPlan(design));
    const displays = wallTransportPlan(design).allLinks.filter((link) => link.group === "display").length;

    expect(count(html, 'class="detail-box"')).toBe(displays * 4);
    expect(count(html, 'data-detail="enclosure"')).toBe(displays);
    expect(count(html, 'data-detail="display-mount"')).toBe(displays);
    expect(count(html, 'data-detail="termination"')).toBe(displays);
    expect(count(html, 'data-detail="entry"')).toBe(displays);
    expect(count(html, 'class="detail-field"')).toBe(displays * 4);
    expect(html).toContain("record the display housing");
    expect(html).toContain("Record the mount once on the display row");
    expect(html).toContain("run entry");
    expect(html).not.toContain("already carry install detail");
  });

  it("prints recorded install detail and one display mount faintly in its box and escapes it", () => {
    const design = requirements({
      columns: 2,
      rows: 1,
      sources: 1,
      linkDetails: {
        "display-2": { enclosure: "Back box", termination: "HDMI faceplate" },
        "source-1": { enclosure: "   " },
      },
      displayMounts: { "display-2": "Arm <b>&" },
    });
    const html = buildWallSurveyWorksheet(design, wallTransportPlan(design));

    expect(html).toContain('<span class="detail-box" data-detail="enclosure">Back box</span>');
    expect(html).toContain('<span class="detail-box" data-detail="display-mount">Arm &lt;b&gt;&amp;</span>');
    expect(html).toContain('<span class="detail-box" data-detail="termination">HDMI faceplate</span>');
    // A whitespace-only cell is not detail: the box stays empty and uncounted.
    expect(html).toContain('<span class="detail-box" data-detail="enclosure"></span>');
    expect(html).toContain("1 of 3 display links already carry display-end detail");
  });

  it("prints the project name and escapes it", () => {
    const html = buildWallSurveyWorksheet(requirements(), plan(), { projectName: "Boardroom & Co <east>" });
    expect(html).toContain("<title>Wall measurement worksheet — Boardroom &amp; Co &lt;east&gt;</title>");
    expect(html).toContain("<dd>Boardroom &amp; Co &lt;east&gt;</dd>");
  });

  it("sizes the drawing to the wall and keeps its dimensions in the caption", () => {
    const wall = buildWallSurveyWorksheet(requirements(), plan());
    // A 16:9 wall is 103 mm wide at the 58 mm drawing height.
    expect(wall).toContain('class="drawing" style="width:103mm"');
    // Dimension lines would print at roughly 1.5 mm beside the panels, so the
    // drawing shows the array and the caption states the millimetres.
    expect(wall).not.toContain("wall-elevation-dimension");
    // The compact drawing also leaves out the scale figure and its lane.
    expect(wall).not.toContain("data-scale-figure");
    expect(wall).toContain("Wall 2,436 × 1,370 mm");

    const wide = requirements({ layout: "independent", columns: 8, rows: 1, sources: 1 });
    expect(buildWallSurveyWorksheet(wide, wallTransportPlan(wide))).toContain('class="drawing" style="width:150mm"');
  });

  it("prints the drawing key so the sheet explains its own numbers", () => {
    const html = buildWallSurveyWorksheet(requirements(), plan());

    // The surveyor reads this drawing on site, so it carries the same key the
    // builder's chips and the printed proposal show.
    expect(html).toContain("data-wall-key-list");
    expect(count(html, 'data-wall-key="panel"')).toBe(1);
    expect(count(html, 'data-wall-key="window"')).toBe(1);
    expect(html).toContain("Small numbers are panels");
    expect(html).toContain("Large numbers are the source each window carries");
    // It belongs to the drawing: after the elevation, before its caption.
    expect(html.indexOf("data-wall-key-list")).toBeGreaterThan(html.indexOf("<svg"));
    expect(html.indexOf("data-wall-key-list")).toBeLessThan(html.indexOf("<figcaption>"));
  });

  it("leaves the panel entry off a drawing that numbers no panels", () => {
    // A canvas and an array too dense to number draw no panel labels, so the
    // sheet must not promise a number it does not print.
    for (const overrides of [
      { application: "led", columns: 4, rows: 2, windows: 1 },
      { layout: "independent", columns: 4, rows: 4, sources: 1 },
    ] as const) {
      const design = requirements(overrides);
      const html = buildWallSurveyWorksheet(design, wallTransportPlan(design));
      expect(html).toContain('data-wall-key="window"');
      expect(html).not.toContain('data-wall-key="panel"');
    }
  });

  it("prints the boundary between the images a projector pair throws", () => {
    const design = requirements({ application: "projection", projectors: 2, layout: "single", windows: 1, sources: 2 });
    const html = buildWallSurveyWorksheet(design, wallTransportPlan(design));

    // The surveyor stands in front of the screen, so the sheet has to show the
    // seam between the two images rather than one unbroken surface.
    expect(html).toContain('data-projector-slices="2"');
    expect(count(html, "data-projector-slice=")).toBe(2);
    expect(html).toContain(">P1</text>");
    expect(html).toContain(">P2</text>");
  });

  it("prints the mapped result when the source shape differs from the canvas", () => {
    const design = requirements({ application: "lcd-loop", columns: 4, rows: 2, windows: 1 });
    const html = buildWallSurveyWorksheet(design, wallTransportPlan(design));
    expect(html).toContain("Content shape differs from the canvas");
  });
});

describe("printing the worksheet", () => {
  afterEach(() => vi.useRealTimers());

  function fakeWindow() {
    return { document: { write: vi.fn(), close: vi.fn() }, print: vi.fn() } as unknown as Window;
  }

  it("writes the sheet into a new tab and opens the print dialog", () => {
    const printWindow = fakeWindow();
    const open = vi.spyOn(window, "open").mockReturnValue(printWindow);
    vi.useFakeTimers();

    printWallSurveyWorksheet(requirements(), plan(), { projectName: "East wall" });

    expect(open).toHaveBeenCalledTimes(1);
    const written = (printWindow.document.write as unknown as { mock: { calls: string[][] } }).mock.calls[0][0];
    expect(written).toContain("Wall measurement worksheet");
    expect(written).toContain("East wall");
    expect(printWindow.document.close).toHaveBeenCalledTimes(1);
    expect(printWindow.print).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    expect(printWindow.print).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it("names the fix when the browser blocks the tab", () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    expect(() => printWallSurveyWorksheet(requirements(), plan())).toThrow(
      "Allow pop-ups for this site to print the measurement worksheet.",
    );
    open.mockRestore();
  });
});
