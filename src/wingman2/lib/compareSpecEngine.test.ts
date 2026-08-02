import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import competitorCatalogRaw from "../../../data/catalog/competitor-products.generated.json";
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

  it("keeps structured endpoint identity authoritative across manufacturers", () => {
    const endpointRoles = new Map([
      ["transmitter", "transmitter"],
      ["encoder", "transmitter"],
      ["receiver", "receiver"],
      ["decoder", "receiver"],
      ["transceiver", "transceiver"],
    ]);
    const failures: string[] = [];

    for (const raw of competitorCatalogRaw as Array<Record<string, unknown>>) {
      const declared = String(raw.role ?? "").trim().toLowerCase();
      const expected = endpointRoles.get(declared);
      if (!expected) continue;

      const identity = `${String(raw.sku ?? "")} ${String(raw.name ?? "")}`;
      // A SKU explicitly sold as a kit/pair is a complete pair even when a
      // legacy catalogue row labels its source-side unit as "transmitter".
      if (/\bkit\b|tx\s*[+/]\s*rx|\bpair\b/i.test(identity)) continue;

      const actual = normalizeCompetitor(raw).role;
      if (actual !== expected) {
        failures.push(`${String(raw.brand)} ${String(raw.sku)}: declared ${declared}, normalized ${actual}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it("does not let descriptive prose move products between declared technology classes", () => {
    const expectedByCategory: Record<string, string[]> = {
      avoip: ["AVOIP"],
      distribution: ["DISTRIBUTION"],
      switcher: ["PRESENTATION"],
      matrix: ["MATRIX"],
      control: ["CONTROL"],
      extender: ["EXTENDER", "HDBASET"],
      hdbaset: ["HDBASET", "EXTENDER"],
      "wireless presentation": ["WIRELESS_PRESENTATION"],
      camera: ["CAMERA"],
      "video wall": ["VIDEO_WALL"],
    };
    const failures: string[] = [];

    for (const raw of competitorCatalogRaw as Array<Record<string, unknown>>) {
      const category = String(raw.category ?? "").trim().toLowerCase();
      const expected = expectedByCategory[category];
      if (!expected) continue;
      const actual = normalizeCompetitor(raw).specClass;
      if (!expected.includes(actual)) {
        failures.push(`${String(raw.brand)} ${String(raw.sku)}: category ${category}, normalized ${actual}`);
      }
    }

    expect(failures).toEqual([]);
  });
});

describe("runSpecShowdown", () => {
  it("fails closed for SKUs outside the verified catalogue", async () => {
    const result = await runSpecShowdown("Crestron", "TOTALLY-FAKE-9000");
    expect(result.coverage).toBe("missing");
  });

  it("produces governed NetworkHD candidates for DM-NVX-350 with citations and no invented values", async () => {
    const result = await runSpecShowdown("Crestron", "DM-NVX-350");
    expect(result.coverage).toBe("found");
    if (result.coverage !== "found") return;
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

  it("does not confuse a paired receiver reference with a complete extender kit", async () => {
    const entry = findCompetitorCatalogEntry("Crestron", "HD-TX-4KZ-211-2G");
    expect(entry).not.toBeNull();
    expect(normalizeCompetitor(entry!).role).toBe("transmitter");

    const result = await runSpecShowdown("Crestron", "HD-TX-4KZ-211-2G");
    expect(result.coverage).toBe("found");
    if (result.coverage !== "found") return;
    expect(result.matches.some((match) => match.sheet.sku === "EX-40-KVM-5K")).toBe(false);
    expect(result.matches.every((match) => match.sheet.role === "transmitter" || match.sheet.role === "transceiver")).toBe(true);
    expect(result.verified).toBe(false);
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

  it("preserves endpoint direction across every approved manufacturer", async () => {
    const violations: string[] = [];
    const approved = (competitorCatalogRaw as Array<Record<string, unknown>>).filter(
      (entry) => entry.approvalStatus === "approved" || entry.status === "approved",
    );

    for (const entry of approved) {
      const competitor = normalizeCompetitor(entry);
      if (!["transmitter", "receiver"].includes(competitor.role)) continue;

      const result = await runSpecShowdown(String(entry.brand ?? ""), String(entry.sku ?? ""));
      if (result.coverage !== "found") continue;

      for (const match of result.matches) {
        const allowed = competitor.role === "transmitter"
          ? ["transmitter", "transceiver"]
          : ["receiver", "transceiver"];
        if (!allowed.includes(match.sheet.role)) {
          violations.push(
            `${competitor.brand} ${competitor.sku} (${competitor.role}) -> ${match.sheet.sku} (${match.sheet.role})`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  }, 30_000);

  it("keeps every approved comparison inside its compatible technology lane", async () => {
    const compatible: Record<string, string[]> = {
      AVOIP: ["AVOIP"],
      HDBASET: ["HDBASET", "EXTENDER"],
      MATRIX: ["MATRIX"],
      DISTRIBUTION: ["DISTRIBUTION"],
      PRESENTATION: ["PRESENTATION"],
      VIDEO_WALL: ["VIDEO_WALL", "AVOIP", "MULTIVIEW"],
      MULTIVIEW: ["MULTIVIEW", "VIDEO_WALL"],
      EXTENDER: ["EXTENDER", "HDBASET"],
      USB_EXTENSION: ["USB_EXTENSION"],
      WIRELESS_PRESENTATION: ["WIRELESS_PRESENTATION"],
      AUDIO: ["AUDIO"],
      CONTROL: ["CONTROL"],
      CAMERA: ["CAMERA"],
    };
    const violations: string[] = [];
    const approved = (competitorCatalogRaw as Array<Record<string, unknown>>).filter(
      (entry) => entry.approvalStatus === "approved" || entry.status === "approved",
    );

    for (const entry of approved) {
      const competitor = normalizeCompetitor(entry);
      const result = await runSpecShowdown(String(entry.brand ?? ""), String(entry.sku ?? ""));
      if (result.coverage !== "found") continue;
      for (const match of result.matches) {
        if (!(compatible[competitor.specClass] ?? []).includes(match.sheet.specClass)) {
          violations.push(
            `${competitor.brand} ${competitor.sku} (${competitor.specClass}) -> `
            + `${match.sheet.sku} (${match.sheet.specClass})`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  }, 30_000);

  it("never labels partial evidence as a confirmed equivalent", async () => {
    const violations: string[] = [];
    const approved = (competitorCatalogRaw as Array<Record<string, unknown>>).filter(
      (entry) => entry.approvalStatus === "approved" || entry.status === "approved",
    );

    for (const entry of approved) {
      const result = await runSpecShowdown(String(entry.brand ?? ""), String(entry.sku ?? ""));
      if (result.coverage !== "found") continue;
      for (const match of result.matches) {
        if (match.decision !== "confirmed-equivalent") continue;
        const unknown = match.verdicts.filter((verdict) => verdict.verdict === "unverified");
        if (unknown.length > 0 || match.sheet.verificationStatus !== "verified") {
          violations.push(
            `${String(entry.brand)} ${String(entry.sku)} -> ${match.sheet.sku}: `
            + `${unknown.length} unverified fields, candidate ${match.sheet.verificationStatus ?? "unverified"}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  }, 30_000);

  it("never proposes an undersized distribution amplifier", async () => {
    const violations: string[] = [];
    const distribution = (competitorCatalogRaw as Array<Record<string, unknown>>).filter(
      (entry) => String(entry.category ?? "").toLowerCase() === "distribution",
    );

    for (const entry of distribution) {
      const competitor = normalizeCompetitor(entry);
      if (competitor.hdmiOut == null) continue;
      const result = await runSpecShowdown(String(entry.brand ?? ""), String(entry.sku ?? ""));
      if (result.coverage !== "found") continue;
      for (const match of result.matches) {
        if (match.sheet.hdmiOut == null || match.sheet.hdmiOut < competitor.hdmiOut) {
          violations.push(
            `${competitor.brand} ${competitor.sku} (${competitor.hdmiOut} outputs) -> `
            + `${match.sheet.sku} (${match.sheet.hdmiOut ?? "unknown"} outputs)`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  }, 30_000);
});
