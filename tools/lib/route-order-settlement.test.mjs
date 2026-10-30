import { describe, expect, it } from "vitest";
import {
  ROUTE_ORDER_VIEWPORTS,
  routeOrderAnswers,
  routeOrderSettlementClause,
  routeOrderSettlementFailures,
} from "./route-order-settlement.mjs";
import { routeOrderPairKey } from "./route-stylesheet-order.mjs";

/** One subject-disjoint conflict as the order report builds it. */
function conflict(property, first, second, { rank = 2, specificity = 200 } = {}) {
  return {
    property,
    important: false,
    specificity,
    rank,
    beforeFirst: { selector: first, media: [] },
    beforeSecond: { selector: second, media: [] },
  };
}

function reportWith(conflicts) {
  return {
    totals: { subjectDisjoint: conflicts.length },
    pages: [{ route: "dashboard", file: "wingman-route-dashboard.css", conflicts }],
  };
}

const PAIR = conflict("margin-left", ".wingman-app-main > *", ".wingman-page-host");

function baselineWith({ pairs = [], settled = [] } = {}) {
  return {
    pages: [{ route: "dashboard", file: "wingman-route-dashboard.css", reason: "reviewed", pairs, settled }],
  };
}

/** The answers a page gives for those conflicts, as the read would return them. */
function readingsFor(conflicts, counts) {
  const answers = routeOrderAnswers(conflicts);
  return {
    dashboard: answers.map((answer, index) => ({
      ...answer,
      both: counts[index] ?? 0,
      unmatched: counts[index] === null,
    })),
  };
}

describe("route order settlement readings", () => {
  it("asks at the laptop and phone widths, so a breakpoint-only region is found", () => {
    expect(ROUTE_ORDER_VIEWPORTS.map((viewport) => viewport.width)).toEqual([1366, 390]);
  });

  it("keys each occurrence, so a repeated pair is two questions", () => {
    const answers = routeOrderAnswers([PAIR, PAIR]);

    expect(answers).toHaveLength(2);
    expect(answers[0].key).toBe(routeOrderPairKey(PAIR));
    expect(answers[1].key).toBe(answers[0].key);
    expect(answers.map((answer) => answer.index)).toEqual([0, 1]);
  });
});

describe("route order settlement failures", () => {
  it("accepts a page that cannot make its settled pair one element", () => {
    const report = reportWith([PAIR]);
    const baseline = baselineWith({ settled: [{ key: routeOrderPairKey(PAIR) }] });

    expect(routeOrderSettlementFailures({ report, baseline, readings: readingsFor([PAIR], [0]) }))
      .toEqual([]);
  });

  it("refuses a settled pair the page now mounts", () => {
    const report = reportWith([PAIR]);
    const baseline = baselineWith({ settled: [{ key: routeOrderPairKey(PAIR) }] });

    const [failure] = routeOrderSettlementFailures({ report, baseline, readings: readingsFor([PAIR], [1]) });

    // The pair was settled: no element matched both. A page that now renders one
    // has to bring it back as a decision rather than keep the settlement.
    expect(failure).toContain("settled a pair on dashboard that now reaches one element");
    expect(failure).toContain("1 element(s) match both");
  });

  it("names a pair nobody has answered for, and says which answer it is", () => {
    const report = reportWith([PAIR, conflict("margin-right", ".a", ".b")]);
    const baseline = baselineWith();

    const failures = routeOrderSettlementFailures({
      report,
      baseline,
      readings: readingsFor([PAIR, conflict("margin-right", ".a", ".b")], [1, 0]),
    });

    expect(failures).toHaveLength(2);
    // One element matches both, so it is a decision a person owes, not a settle.
    expect(failures[0]).toContain("makes a pair nobody has answered for");
    expect(failures[0]).toContain("belongs in `pairs` with a reason rather than in `settled`");
    // No element matches both, so the reading exists and only needs recording.
    expect(failures[1]).toContain("cannot make a pair one element and nobody has settled it");
    expect(failures[1]).toContain("--write");
  });

  it("accepts a pair the baseline pins, because that is a decision either way", () => {
    const report = reportWith([PAIR]);
    const baseline = baselineWith({
      pairs: [{ property: "margin-left", important: false, specificity: 200, first: ".wingman-app-main > *", second: ".wingman-page-host" }],
    });

    expect(routeOrderSettlementFailures({ report, baseline, readings: readingsFor([PAIR], [1]) }))
      .toEqual([]);
  });

  it("refuses a settled entry the split no longer reads", () => {
    const report = reportWith([PAIR]);
    const baseline = baselineWith({ settled: [{ key: "a | b" }] });

    const failures = routeOrderSettlementFailures({ report, baseline, readings: readingsFor([PAIR], [0]) });

    expect(failures.join("\n")).toContain("settles a pair on dashboard that the split no longer reads");
    expect(failures.join("\n")).toContain("A settled entry that stopped occurring has to leave the file.");
  });

  it("reports a selector it could not parse as a missing reading, not a settlement", () => {
    const report = reportWith([PAIR]);
    const baseline = baselineWith({ settled: [{ key: routeOrderPairKey(PAIR) }] });

    const [failure] = routeOrderSettlementFailures({ report, baseline, readings: readingsFor([PAIR], [null]) });

    expect(failure).toContain("could not be asked about");
    expect(failure).toContain("missing rather than settled");
  });

  it("counts what the page settled against what the split reports", () => {
    const report = reportWith([PAIR, conflict("margin-right", ".a", ".b")]);
    const readings = readingsFor([PAIR, conflict("margin-right", ".a", ".b")], [0, 1]);

    expect(routeOrderSettlementClause({ report, readings })).toBe(
      "1 of 2 subject-disjoint occurrence(s) cannot be one element on their route's page at 1366px and 390px.",
    );
  });
});
