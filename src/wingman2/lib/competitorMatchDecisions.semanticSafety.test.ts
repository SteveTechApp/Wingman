import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";
import index from "../../../public/product-intelligence-index.json";
import { describe, expect, it, vi } from "vitest";

vi.mock("./productIntelligenceIndexCache", () => ({
  loadProductIntelligenceIndex: vi.fn().mockResolvedValue(index),
}));

import {
  runSpecShowdown,
  type ShowdownMatch,
  type SpecSheet,
} from "./compareSpecEngine";

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function fanout(sheet: SpecSheet): number | null {
  return sheet.mirroredOut ?? sheet.physicalOut ?? sheet.hdmiOut;
}

function transportGap(match: ShowdownMatch): boolean {
  return match.verdicts.some(
    (verdict) => verdict.field === "transport" && verdict.verdict === "gap",
  );
}

const approvedRows = (competitorCatalogRaw as Row[]).filter(
  (row) =>
    text(row.status).toLowerCase() === "approved" &&
    text(row.brand) &&
    text(row.sku),
);

describe("competitor decision semantic safety", () => {
  it("never leads with insufficient mandatory topology or routed capacity", async () => {
    const failures: string[] = [];

    for (const row of approvedRows) {
      const brand = text(row.brand);
      const sku = text(row.sku);
      const result = await runSpecShowdown(brand, sku);

      if (result.coverage !== "found" || result.matches.length === 0) continue;

      const competitor = result.competitor;
      const lead = result.matches[0];
      const offered = lead.sheet;

      if (competitor.specClass === "DISTRIBUTION") {
        const requiredFanout = fanout(competitor);
        const offeredFanout = fanout(offered);

        if (
          requiredFanout != null &&
          (offeredFanout == null || offeredFanout < requiredFanout)
        ) {
          failures.push(
            `${brand} ${sku}: distribution requires ${requiredFanout} outputs but lead ${offered.sku} evidences ${offeredFanout ?? "unknown"}`,
          );
        }

        // Some "splitter" products also switch between multiple sources.
        // Those cannot be replaced by a one-input DA simply because fan-out
        // matches.
        if (
          competitor.routedIn != null &&
          competitor.routedIn > 1 &&
          (offered.routedIn == null || offered.routedIn < competitor.routedIn)
        ) {
          failures.push(
            `${brand} ${sku}: switched distribution requires ${competitor.routedIn} selectable inputs but lead ${offered.sku} evidences ${offered.routedIn ?? "unknown"}`,
          );
        }
      }

      if (
        competitor.specClass === "MATRIX" ||
        competitor.specClass === "PRESENTATION"
      ) {
        if (
          competitor.routedIn != null &&
          (offered.routedIn == null || offered.routedIn < competitor.routedIn)
        ) {
          failures.push(
            `${brand} ${sku}: requires ${competitor.routedIn} routed inputs but lead ${offered.sku} evidences ${offered.routedIn ?? "unknown"}`,
          );
        }

        if (
          competitor.routedOut != null &&
          (offered.routedOut == null || offered.routedOut < competitor.routedOut)
        ) {
          failures.push(
            `${brand} ${sku}: requires ${competitor.routedOut} routed outputs but lead ${offered.sku} evidences ${offered.routedOut ?? "unknown"}`,
          );
        }
      }

      if (transportGap(lead) && lead.decision !== "architecture-alternative") {
        failures.push(
          `${brand} ${sku}: ${offered.sku} has a transport/architecture gap but decision is ${lead.decision}`,
        );
      }
    }

    expect(failures).toEqual([]);
  }, 30000);

  it("keeps the reviewed hybrid and HDBaseT distribution edge cases safe", async () => {
    const sy = await runSpecShowdown("SY Electronics", "HDBT-231-100");
    expect(sy.coverage).toBe("found");
    if (sy.coverage === "found") {
      // It is a 2-input switcher feeding a mirrored 4-output distribution
      // topology. No single-product answer may silently drop the source
      // switching requirement.
      for (const match of sy.matches) {
        expect(match.sheet.routedIn).not.toBeNull();
        expect(match.sheet.routedIn!).toBeGreaterThanOrEqual(2);
        expect(fanout(match.sheet)).not.toBeNull();
        expect(fanout(match.sheet)!).toBeGreaterThanOrEqual(4);
      }
    }

    for (const [brand, sku] of [
      ["Kramer", "VM-4HDT"],
      ["Crestron", "DM-DA4-4K-C"],
    ] as const) {
      const result = await runSpecShowdown(brand, sku);
      expect(result.coverage).toBe("found");

      if (result.coverage === "found" && result.matches.length > 0) {
        const lead = result.matches[0];
        expect(fanout(lead.sheet)).not.toBeNull();
        expect(fanout(lead.sheet)!).toBeGreaterThanOrEqual(4);

        // These competitors distribute over HDBaseT/DM transport. A local HDMI
        // splitter can be a system-design direction, but not a direct product
        // equivalent.
        if (lead.sheet.transport !== "hdbaset") {
          expect(lead.decision).toBe("architecture-alternative");
        }
      }
    }
  });
});
