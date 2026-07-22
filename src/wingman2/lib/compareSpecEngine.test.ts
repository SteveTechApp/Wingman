import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  findCompetitorCatalogEntry,
  normalizeCompetitor,
  rankChroma,
  rankResolution,
  runSpecShowdown,
} from "./compareSpecEngine";

const PUBLIC_DIR = resolve(__dirname, "../../../public");

beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = resolve(PUBLIC_DIR, `.${String(url)}`);
      const body = readFileSync(path, "utf8");
      return {
        ok: true,
        json: async () => JSON.parse(body),
      } as Response;
    }),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("rankResolution / rankChroma", () => {
  it("orders resolutions correctly", () => {
    expect(rankResolution("4K60 4:4:4")).toBeGreaterThan(rankResolution("4K60"));
    expect(rankResolution("4K60")).toBeGreaterThan(rankResolution("4K30"));
    expect(rankResolution("4K30")).toBeGreaterThan(rankResolution("1080p60"));
    expect(rankResolution("")).toBe(0);
  });

  it("orders chroma correctly", () => {
    expect(rankChroma("4:4:4")).toBeGreaterThan(rankChroma("4:2:2"));
    expect(rankChroma("4:2:0")).toBe(1);
  });
});

describe("competitor catalogue lookup", () => {
  it("finds a curated Crestron entry by SKU + brand", () => {
    const entry = findCompetitorCatalogEntry("Crestron", "DM-NVX-350");
    expect(entry).not.toBeNull();
    expect(entry?.brand).toBe("Crestron");
  });

  it("finds via normalized alias", () => {
    const entry = findCompetitorCatalogEntry("Crestron", "dmnvx350");
    expect(entry).not.toBeNull();
  });

  it("returns null for unknown SKUs", () => {
    expect(findCompetitorCatalogEntry("Crestron", "TOTALLY-FAKE-9000")).toBeNull();
  });
});

describe("normalizeCompetitor", () => {
  it("extracts structured AVoIP facts for DM-NVX-350", () => {
    const entry = findCompetitorCatalogEntry("Crestron", "DM-NVX-350");
    const sheet = normalizeCompetitor(entry!);
    expect(sheet.specClass).toBe("AVOIP");
    expect(sheet.transport).toBe("avoip-1g");
    expect(sheet.resolutionRank).toBeGreaterThanOrEqual(4);
    expect(sheet.hdmiIn).toBe(2);
    expect(sheet.citations.length).toBeGreaterThan(0);
    expect(sheet.citations[0].url).toContain("crestron");
  });
});

describe("runSpecShowdown", () => {
  it("fails closed for SKUs outside the verified catalogue", async () => {
    const result = await runSpecShowdown("Crestron", "TOTALLY-FAKE-9000");
    expect(result.coverage).toBe("missing");
  });

  it("produces verified NetworkHD candidates for DM-NVX-350 with citations and no invented values", async () => {
    const result = await runSpecShowdown("Crestron", "DM-NVX-350");
    expect(result.coverage).toBe("found");
    if (result.coverage !== "found") return;
    expect(result.verified).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);

    const top = result.matches[0];
    // Same technology class only — an AVoIP competitor can never be answered
    // with an HDBaseT extender or presentation switcher.
    expect(top.sheet.specClass).toBe("AVOIP");
    expect(top.sheet.sku.startsWith("NHD-")).toBe(true);
    // Rating derives only from comparable (verified) fields.
    expect(top.comparableFields).toBeGreaterThanOrEqual(3);
    expect(top.rating).toBe(Math.round((top.matchedFields / top.comparableFields) * 100));
    // Both sides cited.
    expect(top.sheet.citations.length).toBeGreaterThan(0);
    // Every verdict is one of the four allowed states with real display values.
    for (const verdict of top.verdicts) {
      expect(["match", "exceeds", "gap", "unverified"]).toContain(verdict.verdict);
      expect(verdict.competitorValue.length).toBeGreaterThan(0);
      expect(verdict.wyrestormValue.length).toBeGreaterThan(0);
    }
  });

  it("never returns discontinued or do-not-spec WyreStorm products", async () => {
    const result = await runSpecShowdown("Crestron", "DM-NVX-350");
    if (result.coverage !== "found") throw new Error("expected coverage");
    for (const match of result.matches) {
      expect(match.sheet.sku).not.toMatch(/^NHD-000/);
    }
  });

  it("rejects wrong-role candidates with explicit blockers", async () => {
    const result = await runSpecShowdown("Crestron", "DM-NVX-350");
    if (result.coverage !== "found") throw new Error("expected coverage");
    for (const reject of result.rejected) {
      expect(reject.blockers.length).toBeGreaterThan(0);
    }
  });

  it("never matches a matrix with fewer routed outputs than the competitor (8x8 vs 8x4)", async () => {
    // Kramer VS-88H2A is an 8-in/8-out matrix. An 8x4 candidate (e.g.
    // MX-0804-EDC) physically cannot drive the competitor's 8 displays, so it
    // must be rejected with an explicit blocker - not surfaced as an 80%
    // "closest technical match" with the output shortfall softened to a gap.
    const result = await runSpecShowdown("Kramer", "VS-88H2A");
    expect(result.coverage).toBe("found");
    if (result.coverage !== "found") return;

    for (const match of result.matches) {
      if (match.sheet.routedOut != null) {
        expect(match.sheet.routedOut).toBeGreaterThanOrEqual(8);
      }
      expect(match.sheet.sku).not.toBe("MX-0804-EDC");
    }

    const outputReject = result.rejected.find((reject) => reject.sku === "MX-0804-EDC");
    expect(outputReject).toBeDefined();
    expect(outputReject?.blockers.join(" ")).toMatch(/Insufficient routed outputs/i);

    // A genuine 8x8 matrix must survive the gates and lead the shortlist -
    // real matrices were previously classified out of the MATRIX class by the
    // hdbaset/multiview keywords in their category text, leaving no valid
    // candidates at all.
    expect(result.matches.length).toBeGreaterThan(0);
    const top = result.matches[0];
    expect(top.sheet.routedIn).toBeGreaterThanOrEqual(8);
    expect(top.sheet.routedOut).toBeGreaterThanOrEqual(8);
  });
});
