import { describe, expect, it } from "vitest";
import {
  emptyRateCard,
  mergeRateCard,
  normalizeRateCard,
  rateCardKey,
  usableRates,
} from "./workspace-rate-card.mjs";

const BACK_BOX = "install-enclosure-back-box";
const OUTLET = "install-termination-cat6a-outlet";

describe("workspace installation rate card", () => {
  it("starts empty and drops anything the document could not print", () => {
    expect(emptyRateCard()).toEqual({ updatedAt: "", currency: "GBP", rates: {} });
    expect(normalizeRateCard("nope")).toEqual(emptyRateCard());
    expect(normalizeRateCard({ currency: "JPY", rates: { [BACK_BOX]: "120" } })).toMatchObject({
      currency: "GBP",
      rates: { [BACK_BOX]: "120" },
    });
    expect(usableRates({ [BACK_BOX]: "  ", [OUTLET]: "quote", mount: -5, box: 120 })).toEqual({ box: "120" });
    expect(usableRates({ x: "1".repeat(40) })).toEqual({});
  });

  it("merges a save over the baseline, so another wall's rates survive", () => {
    const first = mergeRateCard(emptyRateCard(), { rates: { [BACK_BOX]: "120" }, currency: "GBP" }, "2026-10-21T10:00:00.000Z");
    const second = mergeRateCard(first, { rates: { [OUTLET]: "35" }, currency: "GBP" }, "2026-10-22T09:00:00.000Z");

    expect(second.rates).toEqual({ [BACK_BOX]: "120", [OUTLET]: "35" });
    expect(second.updatedAt).toBe("2026-10-22T09:00:00.000Z");
  });

  it("never lets a blank cell erase a saved rate", () => {
    const saved = mergeRateCard(emptyRateCard(), { rates: { [BACK_BOX]: "120" }, currency: "GBP" }, "2026-10-21T10:00:00.000Z");
    const merged = mergeRateCard(saved, { rates: { [BACK_BOX]: "", unrelated: "" }, currency: "GBP" }, "2026-10-22T09:00:00.000Z");

    expect(merged.rates).toEqual({ [BACK_BOX]: "120" });
    // Nothing usable arrived, so the card is not re-dated as if it changed.
    expect(merged.updatedAt).toBe("2026-10-21T10:00:00.000Z");
  });

  it("keeps the saved currency unless the save names a supported one", () => {
    const saved = mergeRateCard(emptyRateCard(), { rates: { [BACK_BOX]: "120" }, currency: "USD" }, "2026-10-21T10:00:00.000Z");

    expect(saved.currency).toBe("USD");
    expect(mergeRateCard(saved, { rates: { [OUTLET]: "35" }, currency: "JPY" }).currency).toBe("USD");
  });

  it("files a card against the workspace and the rep, not the browser", () => {
    const auth = { workspace: { id: "ws_1" }, user: { id: "user_1" } };
    const otherRep = { workspace: { id: "ws_1" }, user: { id: "user_2" } };
    const otherWorkspace = { workspace: { id: "ws_2" }, user: { id: "user_1" } };

    expect(rateCardKey(auth)).toBe("ws_1:user_1");
    expect(rateCardKey(otherRep)).not.toBe(rateCardKey(auth));
    expect(rateCardKey(otherWorkspace)).not.toBe(rateCardKey(auth));
  });
});
