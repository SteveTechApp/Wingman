import { describe, expect, it } from "vitest";
import {
  attributeScopesDisjoint,
  compareRuleOrder,
  describeRuleOrderSummary,
  mediaConditionsOverlap,
  orderEquivalenceFailure,
  routeKeysOf,
  routeScopesDisjoint,
  selectorSpecificity,
  styleRuleBranches,
  summarizeRuleOrder,
} from "./style-order-equivalence.mjs";

const sheet = (file, text) => ({ file, text });

const ROUTES = [
  { key: "compare", segment: "compare" },
  { key: "projects", segment: "projects" },
  { key: "salesHelper", segment: "sales-helper" },
];

const CARD_FIRST = sheet("first.css", ".card { padding: 10px; }");
const CARD_SECOND = sheet("second.css", ".card { padding: 20px; }");

describe("rule-order equivalence", () => {
  it("reports nothing when a move keeps the rules in the same order", () => {
    const result = compareRuleOrder({
      before: [CARD_FIRST, CARD_SECOND],
      after: [sheet("combined.css", ".card { padding: 10px; } .card { padding: 20px; }")],
    });

    expect(result.conflicts).toEqual([]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(orderEquivalenceFailure(result)).toEqual([]);
  });

  it("reports the tie a flip decides, naming the property and both selectors", () => {
    const result = compareRuleOrder({
      before: [CARD_FIRST, CARD_SECOND],
      after: [CARD_SECOND, CARD_FIRST],
    });

    expect(result.conflicts).toHaveLength(1);
    const [conflict] = result.conflicts;
    expect(conflict.property).toBe("padding");
    expect(conflict.beforeFirst.selector).toBe(".card");
    expect(conflict.beforeSecond.selector).toBe(".card");
    expect(conflict.likelySameElement).toBe(true);
    expect(conflict.sharedSubjectClasses).toEqual(["card"]);

    const [failure] = orderEquivalenceFailure(result);
    expect(failure).toContain("`padding`");
    expect(failure).toContain(".card");
  });

  it("ignores a flip the more specific rule already outranked", () => {
    const result = compareRuleOrder({
      before: [sheet("a.css", ".shell .card { padding: 10px; }"), sheet("b.css", ".card { padding: 20px; }")],
      after: [sheet("b.css", ".card { padding: 20px; }"), sheet("a.css", ".shell .card { padding: 10px; }")],
    });

    expect(result.conflicts).toEqual([]);
  });

  it("ignores a flip between rules that declare different properties", () => {
    const result = compareRuleOrder({
      before: [sheet("a.css", ".card { padding: 10px; }"), sheet("b.css", ".card { color: red; }")],
      after: [sheet("b.css", ".card { color: red; }"), sheet("a.css", ".card { padding: 10px; }")],
    });

    expect(result.conflicts).toEqual([]);
  });

  it("ignores a flip between an important and a normal declaration", () => {
    const result = compareRuleOrder({
      before: [
        sheet("a.css", ".card { color: red !important; }"),
        sheet("b.css", ".card { color: blue; }"),
      ],
      after: [
        sheet("b.css", ".card { color: blue; }"),
        sheet("a.css", ".card { color: red !important; }"),
      ],
    });

    expect(result.conflicts).toEqual([]);
  });

  it("ignores a flip across media queries that cannot both apply", () => {
    const result = compareRuleOrder({
      before: [
        sheet("a.css", "@media (max-width: 600px) { .card { padding: 10px; } }"),
        sheet("b.css", "@media (min-width: 900px) { .card { padding: 20px; } }"),
      ],
      after: [
        sheet("b.css", "@media (min-width: 900px) { .card { padding: 20px; } }"),
        sheet("a.css", "@media (max-width: 600px) { .card { padding: 10px; } }"),
      ],
    });

    expect(result.conflicts).toEqual([]);
    expect(mediaConditionsOverlap(["@media (max-width: 600px)"], ["@media (min-width: 900px)"])).toBe(false);
  });

  it("reports a flip across media queries that overlap", () => {
    const result = compareRuleOrder({
      before: [
        sheet("a.css", "@media (max-width: 900px) { .card { padding: 10px; } }"),
        sheet("b.css", "@media (max-width: 600px) { .card { padding: 20px; } }"),
      ],
      after: [
        sheet("b.css", "@media (max-width: 600px) { .card { padding: 20px; } }"),
        sheet("a.css", "@media (max-width: 900px) { .card { padding: 10px; } }"),
      ],
    });

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].property).toBe("padding");
    expect(mediaConditionsOverlap(["@media (max-width: 600px)"], ["@media (max-width: 900px)"])).toBe(true);
  });

  it("names rules that only exist on one side of the move", () => {
    const result = compareRuleOrder({
      before: [sheet("old.css", ".gone { padding: 10px; }")],
      after: [sheet("new.css", ".arrived { padding: 10px; }")],
    });

    const failures = orderEquivalenceFailure(result);
    expect(failures).toHaveLength(2);
    expect(failures[0]).toContain(".gone");
    expect(failures[1]).toContain(".arrived");
  });

  it("reads a two-route :is() group split into one copy per page as the same rules", () => {
    const grouped = 'html:is([data-wingman-route="salesHelper"], [data-wingman-route="callCoach"]) .wm-sh-page { padding: 28px; }';
    const salesCopy = 'html[data-wingman-route="salesHelper"] .wm-sh-page { padding: 28px; }';
    const coachCopy = 'html[data-wingman-route="callCoach"] .wm-sh-page { padding: 28px; }';

    const result = compareRuleOrder({
      before: [sheet("overrides.css", grouped)],
      after: [sheet("sales-helper.css", salesCopy), sheet("call-coach.css", coachCopy)],
    });

    expect(result.removed).toEqual([]);
    expect(result.added).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.afterUnits).toHaveLength(2);
  });

  it("treats two branches of one rule as one position, not an ordering", () => {
    const result = compareRuleOrder({
      before: [sheet("a.css", ".one, .two { padding: 10px; }"), sheet("b.css", ".one { padding: 20px; }")],
      after: [sheet("a.css", ".one, .two { padding: 10px; }"), sheet("b.css", ".one { padding: 20px; }")],
    });

    expect(result.conflicts).toEqual([]);
  });

  it("reports a flip between subjects sharing no class, because one element can carry both", () => {
    const result = compareRuleOrder({
      before: [sheet("a.css", ".alpha { color: red; }"), sheet("b.css", ".beta { color: blue; }")],
      after: [sheet("b.css", ".beta { color: blue; }"), sheet("a.css", ".alpha { color: red; }")],
    });

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].sharedSubjectClasses).toEqual([]);
    expect(result.conflicts[0].likelySameElement).toBe(false);
    // Soundness: an unrelated-looking pair is still a decision that changed, so
    // the verdict may not call the move proven by dropping it.
    expect(orderEquivalenceFailure(result)).toHaveLength(1);
    expect(summarizeRuleOrder(result).proven).toBe(false);
    // Triage may read the likely set alone; that is a reading order, not a pass.
    expect(orderEquivalenceFailure(result, { scope: "likely" })).toEqual([]);
  });

  it("reads both route spellings as one key, so a mixed pair is provably disjoint", () => {
    const result = compareRuleOrder({
      routes: ROUTES,
      before: [
        sheet("a.css", 'html[data-wingman-route="projects"] .wm-page-hero { min-height: 190px; }'),
        sheet("b.css", ".wm-route-compare main > .wm-page-hero { min-height: 240px; }"),
      ],
      after: [
        sheet("b.css", ".wm-route-compare main > .wm-page-hero { min-height: 240px; }"),
        sheet("a.css", 'html[data-wingman-route="projects"] .wm-page-hero { min-height: 190px; }'),
      ],
    });

    // One session is one route: no element is under both, so the flip cannot
    // decide anything. Without the mapping this pair reads as a real conflict.
    expect(result.conflicts).toEqual([]);

    const unmapped = compareRuleOrder({
      before: [
        sheet("a.css", 'html[data-wingman-route="projects"] .wm-page-hero { min-height: 190px; }'),
        sheet("b.css", ".wm-route-compare main > .wm-page-hero { min-height: 240px; }"),
      ],
      after: [
        sheet("b.css", ".wm-route-compare main > .wm-page-hero { min-height: 240px; }"),
        sheet("a.css", 'html[data-wingman-route="projects"] .wm-page-hero { min-height: 190px; }'),
      ],
    });
    expect(unmapped.conflicts).toHaveLength(1);
  });

  it("keeps a pair on one route a conflict, however each side spells it", () => {
    const result = compareRuleOrder({
      routes: ROUTES,
      before: [
        sheet("a.css", '[data-wingman-route="compare"] .card { color: red; }'),
        sheet("b.css", ".wm-route-compare .card { color: blue; }"),
      ],
      after: [
        sheet("b.css", ".wm-route-compare .card { color: blue; }"),
        sheet("a.css", '[data-wingman-route="compare"] .card { color: red; }'),
      ],
    });

    expect(result.conflicts).toHaveLength(1);
    expect(routeKeysOf('.wm-route-compare .card', ROUTES)).toEqual(["compare"]);
    expect(routeScopesDisjoint(".wm-route-compare .card", ".wm-route-projects .card", ROUTES)).toBe(true);
  });

  it("suppresses a flip only where the two scopes provably cannot meet", () => {
    const result = compareRuleOrder({
      before: [
        sheet("a.css", 'html[data-wingman-route="salesHelper"] .card { padding: 10px; }'),
        sheet("b.css", 'html[data-wingman-route="callCoach"] .card { padding: 20px; }'),
      ],
      after: [
        sheet("b.css", 'html[data-wingman-route="callCoach"] .card { padding: 20px; }'),
        sheet("a.css", 'html[data-wingman-route="salesHelper"] .card { padding: 10px; }'),
      ],
    });

    expect(result.conflicts).toEqual([]);
    expect(summarizeRuleOrder(result).proven).toBe(true);
  });

  it("sorts the review list by how likely the subjects are one element", () => {
    const rules = [
      ".card.primary { color: red; }",
      ".card.secondary { color: blue; }",
      "button { color: green; }",
      "button { color: teal; }",
      ".one { color: black; }",
      ".two { color: white; }",
    ];

    // Reversing the sheet flips every tie at once: a shared class, a shared
    // element, and two class-only subjects with nothing in common.
    const result = compareRuleOrder({
      before: [sheet("one.css", rules.join("\n"))],
      after: [sheet("one.css", [...rules].reverse().join("\n"))],
    });

    expect(result.conflicts.map((conflict) => conflict.rank)).toEqual([0, 1, 2]);
    expect(result.conflicts[0].sharedSubjectClasses).toEqual(["card"]);
    expect(result.conflicts[1].sharedSubjectElement).toBe(true);
    expect(result.conflicts[2].sharedSubjectClasses).toEqual([]);
    expect(result.conflicts[2].sharedSubjectElement).toBe(false);
  });
});

describe("rule-order verdict", () => {
  it("proves a move that only re-binds rules to files in the same order", () => {
    const result = compareRuleOrder({
      before: [sheet("one.css", ".a { color: red; } .b { padding: 2px; }")],
      after: [sheet("x.css", ".a { color: red; }"), sheet("y.css", ".b { padding: 2px; }")],
    });

    const summary = summarizeRuleOrder(result);
    expect(summary).toEqual({
      rules: 2,
      rulesAfter: 2,
      added: 0,
      removed: 0,
      conflicts: 0,
      likelyConflicts: 0,
      proven: true,
    });
    expect(describeRuleOrderSummary(summary)).toContain("order preserved");
  });

  it("refuses the verdict when a rule appears or disappears, even with no flip", () => {
    const result = compareRuleOrder({
      before: [sheet("one.css", ".a { color: red; } .b { padding: 2px; }")],
      after: [sheet("one.css", ".a { color: red; }")],
    });

    const summary = summarizeRuleOrder(result);
    expect(summary.removed).toBe(1);
    expect(summary.conflicts).toBe(0);
    expect(summary.proven).toBe(false);
    expect(describeRuleOrderSummary(summary)).toContain("1 removed");
  });

  it("names the flipped pairs in the summary sentence, and the likely share of them", () => {
    const result = compareRuleOrder({
      before: [CARD_FIRST, CARD_SECOND],
      after: [CARD_SECOND, CARD_FIRST],
    });

    const summary = summarizeRuleOrder(result);
    expect(summary.conflicts).toBe(1);
    expect(summary.likelyConflicts).toBe(1);
    expect(summary.proven).toBe(false);
    expect(describeRuleOrderSummary(summary)).toContain("1 order-decidable pair(s) flipped");
    expect(describeRuleOrderSummary(summary)).toContain("1 with subjects that can be one element");
  });
});

describe("selector specificity", () => {
  it("counts ids, classes and elements the way the cascade does", () => {
    expect(selectorSpecificity("#id .card p").score).toBe(selectorSpecificity(".other #id p").score);
    expect(selectorSpecificity("#id")).toBeDefined();
    expect(selectorSpecificity("#id").score).toBe(10000);
    expect(selectorSpecificity(".card p").score).toBe(101);
    expect(selectorSpecificity("p").score).toBe(1);
  });

  it("gives :where() no weight and :is() its most specific argument", () => {
    expect(selectorSpecificity(":where(#id) .card").score).toBe(100);
    expect(selectorSpecificity(":is(.a, #b)").score).toBe(10000);
    expect(selectorSpecificity(":is(.a, .b)").score).toBe(100);
    expect(selectorSpecificity(":not(.a)").score).toBe(100);
  });

  it("leaves an :is() group with unequal arguments whole", () => {
    expect(styleRuleBranches(":is(.a, #b) .card")).toEqual([":is(.a, #b) .card"]);
    expect(styleRuleBranches(":is(.a, .b) .card")).toEqual([".a .card", ".b .card"]);
  });

  it("reads every declaration of a branch, last one per property winning the tie", () => {
    const result = compareRuleOrder({
      before: [
        sheet("a.css", ".card { color: red; color: purple; }"),
        sheet("b.css", ".card { color: blue; }"),
      ],
      after: [
        sheet("b.css", ".card { color: blue; }"),
        sheet("a.css", ".card { color: red; color: purple; }"),
      ],
    });

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].beforeFirst.declarations).toHaveLength(1);
    expect(result.conflicts[0].beforeFirst.declarations[0].value).toBe("purple");
  });

  it("counts a specificity tie the cascade can decide, and a gap it cannot", () => {
    expect(selectorSpecificity(".shell .card").score).toBe(selectorSpecificity(".card .body").score);
    expect(selectorSpecificity(".shell .card").score).not.toBe(selectorSpecificity(".card").score);
  });

  it("does not guess when either side is unmapped or names two routes", () => {
    expect(routeScopesDisjoint(".wm-route-mystery .card", ".wm-route-compare .card", ROUTES)).toBe(false);
    expect(routeKeysOf(".wm-route-compare .wm-route-projects .card", ROUTES)).toHaveLength(2);
    expect(routeScopesDisjoint(".wm-route-compare .wm-route-projects .card", ".wm-route-compare .x", ROUTES)).toBe(false);
    expect(routeScopesDisjoint(".wm-route-compare .card", ".wm-route-projects .card", [])).toBe(false);
  });

  it("calls two values of one attribute disjoint, and a shared value not", () => {
    expect(
      attributeScopesDisjoint(
        'html[data-wingman-route="salesHelper"] .wm-sh-page',
        'html[data-wingman-route="callCoach"] .wm-sh-page',
      ),
    ).toBe(true);
    expect(
      attributeScopesDisjoint(
        'html[data-wingman-route="compare"] .card',
        'html[data-wingman-route="compare"] .other',
      ),
    ).toBe(false);
  });
});
