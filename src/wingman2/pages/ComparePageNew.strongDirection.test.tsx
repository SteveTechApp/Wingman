import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";

// The Compare page fetches the governed decision queue + approved decisions on
// mount; resolve them so the page settles inside the test (mirrors the other
// Compare page tests).
const {
  getWingmanSession,
  fetchCompetitorDecisionQueue,
  fetchApprovedCompetitorDecisions,
} = vi.hoisted(() => ({
  getWingmanSession: vi.fn().mockResolvedValue({
    ok: true,
    session: { workspaceRole: "sales", permissions: { canManageWorkspace: false } },
  }),
  fetchCompetitorDecisionQueue: vi.fn().mockResolvedValue({
    ok: true,
    total: 0,
    pending: 0,
    approved: 0,
    queue: [],
  }),
  fetchApprovedCompetitorDecisions: vi.fn().mockResolvedValue({
    ok: true,
    total: 0,
    approved: 0,
    decisions: [],
  }),
}));

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );
  return {
    ...actual,
    getWingmanSession,
    fetchCompetitorDecisionQueue,
    fetchApprovedCompetitorDecisions,
  };
});

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

// Fixture for the green "Strong direction" tier. Real catalogue data cannot
// reach it: the decision classifier always emits at least one "confirm X"
// verify item for every real pair (probed across the whole catalogue - zero
// clean GOOD MATCH decisions). This fixture forces ONE decision - NHD-500-TX
// for the Crestron DM-NVX-350 comparison - to be genuinely clean (GOOD MATCH,
// empty verify/blockers/systemRequirements). Everything else - the real engine
// pipeline, the real competitor resolution (DMNVX-350 is a verified-profile
// competitor, so no limited-data warning trips the status gate), the candidate
// build, the status ladder, the verdict lead and the tier chip - runs
// untouched. If the coupling fix (positioning caveat no longer forcing
// "checks") or the status ladder regresses, this test fails.
vi.mock("../lib/competitorCompareDecision", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/competitorCompareDecision")
  >("../lib/competitorCompareDecision");
  return {
    ...actual,
    classifyCompetitorCompareDecision: (
      input: import("../lib/competitorCompareDecision").CompareDecisionInput,
    ) => {
      const result = actual.classifyCompetitorCompareDecision(input);
      const sku = String(input?.wyrestorm?.sku ?? "").toUpperCase();
      if (sku !== "NHD-500-TX") return result;
      return {
        ...result,
        outcome: "GOOD MATCH" as const,
        confidence: 96,
        matches: [
          "Technology class matches.",
          "Product role matches.",
          "1Gb AV-over-IP endpoint with matching direction.",
        ],
        verify: [],
        gaps: [],
        blockers: [],
        systemRequirements: [],
        summary: "NHD-500-TX is a clean technical match for this AV-over-IP endpoint.",
        requirements: [{ name: "1G AV-over-IP endpoint", essential: true, met: true }],
        solutionType: "direct-replacement",
        evidenceCompleteness: 1,
        nextAction: "Use the matched direction in the project or proposal.",
      };
    },
  };
});

describe("compare page strong-direction render (green tier)", () => {
  it("renders 'Strong direction' with the match assessment when the engine decision is clean", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          // Crestron DM-NVX-350 resolves to a verified-profile competitor (no
          // limited-data warning), and NHD-500-TX is its real NetworkHD 500
          // lead - the fixture only makes that one decision clean.
          "/wingman/compare?brand=Crestron&sku=DMNVX-350&context=1G+AV-over-IP+transceiver",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const verdict = await screen.findByLabelText("Compare verdict");

    // The explicit confidence tier is green and says "Strong direction", not
    // the amber "Plausible — confirm" every real-data comparison shows.
    const tier = verdict.querySelector(".compare-confidence-tier");
    expect(tier?.textContent).toContain("Strong direction");
    expect(tier?.className).toContain("compare-confidence-tier--strong");
    // The glyph cue that reads without colour (check mark for the strong tone).
    expect(tier?.querySelector(".compare-confidence-tier__glyph")?.textContent).toBe("✓");

    // The prose heading matches the tier: a close match exists, not "confirm".
    // (Target the heading element: the banner's route strip also carries a
    // <strong> for the competitor name, which a loose descendant selector would
    // hit first.)
    expect(verdict.querySelector(".compare-verdict-lead__heading")?.textContent).toMatch(
      /close wyrestorm match exists/i,
    );

    // The suggestion card still names the WyreStorm product and why.
    const suggestion = within(verdict).getByLabelText("WyreStorm suggestion");
    expect(suggestion.textContent).toContain("NHD-500-TX");

    // The assessment rail agrees: "Match", not "Further checks required".
    const assessment = document.querySelector(".compare-reported-status-rail");
    expect(assessment?.textContent).toContain("Match");
  });
});
