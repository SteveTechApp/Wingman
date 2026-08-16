import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";
import { compareVerdictTier } from "./ComparePageNew.advanced";

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

describe("compareVerdictTier (explicit confidence tier)", () => {
  it("maps the engine's reported status to an explicit tier that never overstates the evidence", () => {
    expect(compareVerdictTier("match")).toEqual({ label: "Strong direction", tone: "strong" });
    expect(compareVerdictTier("partial")).toEqual({ label: "Plausible — confirm", tone: "confirm" });
    expect(compareVerdictTier("checks")).toEqual({ label: "Plausible — confirm", tone: "confirm" });
    expect(compareVerdictTier("no-match")).toEqual({ label: "No equivalent", tone: "none" });
    expect(compareVerdictTier("no-match", { reviewedBy: "Steve" })).toEqual({
      label: "No equivalent",
      tone: "none",
    });
  });

  it("keeps the evidence-pending case its own tier so the chip never contradicts the banner", () => {
    expect(compareVerdictTier("no-match", { evidencePending: true })).toEqual({
      label: "Evidence pending",
      tone: "pending",
    });
  });
});

describe("compare page verdict lead (beginner-first answer)", () => {
  it("answers in plain language: what the product is, the suggestion, and the checks", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Barco&sku=CLICKSHARE-CX-30&context=Wireless+presentation+system",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const verdict = await screen.findByLabelText("Compare verdict");

    // The verdict banner answers "is there anything similar?" in plain words.
    expect(verdict.querySelector(".compare-verdict-lead__banner strong")?.textContent).toMatch(
      /match|plausible|equivalent|similar/i,
    );

    // The explicit confidence tier sits above the heading, derived from the
    // same engine status as the heading - here the wireless case needs checks.
    expect(verdict.querySelector(".compare-confidence-tier")?.textContent).toMatch(
      /strong direction|plausible/i,
    );
    // The confirm tier carries the "!" glyph so the level reads without colour.
    expect(verdict.querySelector(".compare-confidence-tier__glyph")?.textContent).toBe("!");

    // "What this product is" - a plain-language sentence, not a spec dump.
    const brief = within(verdict).getByLabelText("What the competitor product is");
    expect(brief.textContent).toMatch(/is used to/i);
    expect(brief.textContent).toMatch(/CLICKSHARE-CX-30/i);

    // The single suggestion with a "Why this one" explanation.
    const suggestion = within(verdict).getByLabelText("WyreStorm suggestion");
    const skuHeading = suggestion.querySelector("h3");
    expect(skuHeading?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    expect(suggestion.textContent).toMatch(/Why this one/i);

    // The checks a rep must run before quoting.
    expect(within(verdict).getByLabelText("Before you quote")).not.toBeNull();

    // The deep technical comparison still exists below the answer.
    await waitFor(() => {
      expect(
        screen.queryByLabelText(/Main WyreStorm match:/i),
      ).not.toBeNull();
    });
  });

  it("answers honestly on the no-match path: what to tell the customer and where to go next", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Blustream&sku=ZZZ-NOT-A-REAL-SKU-999",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const verdict = await screen.findByLabelText("Compare verdict");

    // An unknown SKU means evidence is still being reviewed, not an invented answer.
    expect(verdict.querySelector(".compare-verdict-lead__banner strong")?.textContent).toMatch(
      /reviewed|equivalent|match/i,
    );

    // The explicit tier says "Evidence pending", not "No equivalent" - the
    // chip must never overstate certainty the banner itself disclaims. The
    // pending tone carries the "?" glyph so it reads without colour.
    expect(verdict.querySelector(".compare-confidence-tier")?.textContent).toContain("Evidence pending");
    expect(verdict.querySelector(".compare-confidence-tier__glyph")?.textContent).toBe("?");

    // "What this product is" still explains the competitor.
    expect(within(verdict).getByLabelText("What the competitor product is")).not.toBeNull();

    // The rep gets words to say and constructive next moves.
    expect(within(verdict).getByLabelText("What to tell the customer")).not.toBeNull();
    const next = within(verdict).getByLabelText("Where to go next");
    expect(next.textContent).toMatch(/customer|evidence|comparison/i);

    // The detailed no-match card still exists below with the reason and actions.
    expect(await screen.findByText("No suitable WyreStorm match found from the current data")).not.toBeNull();
    expect(screen.getByRole("button", { name: /run live lookup/i })).not.toBeNull();
  });
});
