import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import index from "../../../public/product-intelligence-index.json";
import ComparePageNew from "./ComparePageNew";
import { compareVerdictTier } from "./ComparePageNew.advanced";

vi.mock("../lib/productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

describe("compareVerdictTier", () => {
  it("maps engine status without overstating evidence", () => {
    expect(compareVerdictTier("match")).toEqual({
      label: "Strong direction",
      tone: "strong",
    });
    expect(compareVerdictTier("partial")).toEqual({
      label: "Plausible — confirm",
      tone: "confirm",
    });
    expect(compareVerdictTier("checks")).toEqual({
      label: "Plausible — confirm",
      tone: "confirm",
    });
    expect(compareVerdictTier("no-match")).toEqual({
      label: "No equivalent",
      tone: "none",
    });
  });

  it("keeps evidence-pending distinct", () => {
    expect(compareVerdictTier("no-match", { evidencePending: true })).toEqual({
      label: "Evidence pending",
      tone: "pending",
    });
  });
});

describe("compare page minimum verdict surface", () => {
  it("answers with one assessment plus competitor and WyreStorm cards", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Barco&sku=CLICKSHARE-CX-30&context=Wireless+presentation+system",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");
    const status = within(cards).getByRole("list", {
      name: "Comparison result status",
    });

    expect(status.textContent).toMatch(
      /Match|Partial match|Further checks required/i,
    );
    expect(within(cards).getByLabelText("Competitor product card")).not.toBeNull();
    expect(within(cards).getByLabelText("WyreStorm product card")).not.toBeNull();

    const technicalDetails = screen
      .getByText("Technical evidence & review")
      .closest("details") as HTMLDetailsElement | null;

    expect(technicalDetails?.open).toBe(false);
  });

  it("answers honestly on the no-match path and exposes evidence as the next step", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/wingman/compare?brand=Blustream&sku=ZZZ-NOT-A-REAL-SKU-999",
        ]}
      >
        <ComparePageNew />
      </MemoryRouter>,
    );

    const cards = await screen.findByLabelText("Compare product cards");
    const status = within(cards).getByRole("list", {
      name: "Comparison result status",
    });

    expect(within(status).getByText("No match")).not.toBeNull();
    expect(within(cards).getByLabelText("No WyreStorm product match")).not.toBeNull();

    fireEvent.click(screen.getByText("Technical evidence & review"));

    expect(await screen.findByText("Live lookup required")).not.toBeNull();
    expect(screen.getByRole("button", { name: /run live lookup/i })).not.toBeNull();
  });
});