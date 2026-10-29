import { describe, expect, it } from "vitest";
import {
  stepCardFailure,
  stepCardStateFailure,
  stepCardTreeReport,
} from "./proposal-step-cards.mjs";

const DESCRIBED = "step 5 (Review and export) card with the CRM send history open";

/** A card that lays its content out at its own width: nothing to report. */
function clean(overrides = {}) {
  return {
    card: { width: 338, scroll: 338 },
    content: 304,
    widest: 302,
    tree: [{ node: "div.step", width: 338, scroll: 338, display: "grid", columns: "none", overflowX: "visible" }],
    clipped: false,
    escaped: [],
    history: { rows: 5, open: true },
    ...overrides,
  };
}

describe("a step card that holds", () => {
  it("reports nothing", () => {
    expect(stepCardFailure(clean(), { at: "360px", described: DESCRIBED })).toBeNull();
    expect(stepCardStateFailure(clean(), {
      at: "360px",
      described: DESCRIBED,
      expectedRows: 5,
      withHistory: true,
    })).toBeNull();
  });

  it("reports nothing for a card that was never measured", () => {
    expect(stepCardFailure(null, { at: "360px", described: DESCRIBED })).toBeNull();
    expect(stepCardStateFailure(null, { at: "360px", described: DESCRIBED, expectedRows: 5 })).toBeNull();
  });

  it("leaves a card that scrolls exactly one pixel alone", () => {
    // The tolerance is the reading's own: a card one pixel wider than it says is
    // sub-pixel layout, not content the page host is going to cut.
    expect(stepCardFailure(clean({ card: { width: 338, scroll: 339 } }), { at: "390px", described: DESCRIBED }))
      .toBeNull();
  });
});

describe("content that left the card", () => {
  const escaped = [{ name: "div.wm-crm-share-panel", width: 420, past: 113, before: 0 }];

  it("names the outermost box, how wide it is and how far past the card it went", () => {
    const message = stepCardFailure(clean({ escaped }), { at: "390px", described: DESCRIBED });

    expect(message).toContain(`The response builder's ${DESCRIBED} left content outside itself at 390px`);
    expect(message).toContain("div.wm-crm-share-panel is 420px wide, 113px past the card's content box");
    expect(message).toContain("(1 box out)");
    // A rep reading the failure is told what the card owes, not only what it did.
    expect(message).toContain("Every box on a step card lays out at the width the card has");
  });

  it("counts the boxes and names a few more, without printing each one's boxes", () => {
    const message = stepCardFailure(clean({
      escaped: [
        { name: "div.one", width: 500, past: 200, before: 0 },
        { name: "div.two", width: 480, past: 180, before: 0 },
        { name: "div.three", width: 460, past: 160, before: 0 },
        { name: "div.four", width: 440, past: 140, before: 0 },
      ],
    }), { at: "360px", described: DESCRIBED });

    expect(message).toContain("(4 boxes out, also div.two, div.three, div.four)");
    expect(message).not.toContain("div.four is");
  });

  it("is reported before the card's own scroll reading, because the child is what to change", () => {
    const message = stepCardFailure(clean({
      card: { width: 338, scroll: 460 },
      escaped,
    }), { at: "360px", described: DESCRIBED });

    expect(message).toContain("left content outside itself");
    expect(message).not.toContain("scrolls sideways");
  });
});

describe("the card's own box", () => {
  it("fails a card that scrolls sideways beyond the tolerance", () => {
    const message = stepCardFailure(clean({ card: { width: 338, scroll: 500 } }), { at: "360px", described: DESCRIBED });

    expect(message).toBe(`The response builder's ${DESCRIBED} scrolls sideways at 360px (500 > 338).`);
  });

  it("names the chain of boxes when the card is wider than what clips it", () => {
    const message = stepCardFailure(clean({
      clipped: true,
      tree: [
        { node: "div.step", width: 500, scroll: 500, display: "grid", columns: "minmax(0, 1fr)", overflowX: "visible" },
        { node: "main.card", width: 368, scroll: 500, display: "block", columns: "none", overflowX: "hidden" },
      ],
    }), { at: "390px", described: DESCRIBED });

    expect(message).toContain(`is wider than the box that clips it at 390px`);
    // The ancestor that stopped giving it room is the one marked, and the card's
    // own grid columns are printed so the fix is visible in the report.
    expect(message).toContain("  500/500 grid [minmax(0, 1fr)] div.step");
    expect(message).toContain("  368/500 clipped block main.card");
  });
});

describe("the box chain", () => {
  it("prints width, scroll, clipping, display and columns only when a box has them", () => {
    const report = stepCardTreeReport([
      { node: "div.a", width: 300, scroll: 300, display: "grid", columns: "none", overflowX: "visible" },
      { node: "div.b", width: 300, scroll: 420, display: "block", columns: "1fr 1fr", overflowX: "auto" },
    ]);

    expect(report.split("\n")).toEqual([
      "  300/300 grid div.a",
      "  300/420 clipped block [1fr 1fr] div.b",
    ]);
  });

  it("has nothing to print for a card with no ancestors to describe", () => {
    expect(stepCardTreeReport()).toBe("");
  });
});

describe("the state the card was measured in", () => {
  it("fails a step whose send history never arrived, naming what the walk expected", () => {
    const message = stepCardStateFailure(clean({ history: { rows: 0, open: false } }), {
      at: "560px",
      described: DESCRIBED,
      expectedRows: 5,
      withHistory: true,
    });

    expect(message).toBe(
      `The response builder's ${DESCRIBED} held 0 CRM history rows at 560px; `
        + "the walk expected 5 on a card with the send view open.",
    );
  });

  it("fails a card that lost the expanded conversation, because the tallest block was not laid out", () => {
    const message = stepCardStateFailure(clean({ history: { rows: 5, open: false } }), {
      at: "360px",
      described: DESCRIBED,
      expectedRows: 5,
      withHistory: true,
    });

    expect(message).toContain("lost the expanded conversation at 360px");
    expect(message).toContain("the tallest block it holds was not laid out");
  });

  it("expects no rows on a step without the send view", () => {
    expect(stepCardStateFailure(clean({ history: { rows: 0, open: false } }), {
      at: "360px",
      described: "step 1 (Customer and project) card",
      expectedRows: 0,
      withHistory: false,
    })).toBeNull();
  });
});
