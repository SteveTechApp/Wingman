import { describe, expect, it } from "vitest";
import { classifyVersionFamilyPromotions } from "./reconcile-wyrestorm-lifecycle.mjs";

// Minimal lifecycle rows in the CSV shape the reconcile tool consumes.
// The statuses mirror statusOf(): active / discontinued / do-not-spec / cable / unlisted.
const row = (sku, lifecycle_status, overrides = {}) => ({
  sku,
  lifecycle_status,
  business_status: lifecycle_status === "cable" ? "cable" : "product",
  successor: "",
  reason: "",
  evidence_source: "",
  last_reviewed: "2026-09-03",
  reviewer: "test",
  ...overrides,
});

describe("classifyVersionFamilyPromotions (reconcile SUPERSEDED / REFUSED split)", () => {
  it("promotes a discontinued SKU whose active sibling is a real active successor", () => {
    const rows = [
      row("NHD-500-IW-TX", "discontinued"),
      row("NHD-500-IW-TX-V2", "active"),
    ];
    const members = [
      { sku: "NHD-500-IW-TX", status: "discontinued" },
      { sku: "NHD-500-IW-TX-V2", status: "active" },
    ];
    const { acceptable, refused } = classifyVersionFamilyPromotions(rows, members);
    expect(acceptable).toEqual([{ sourceSku: "NHD-500-IW-TX", successorSku: "NHD-500-IW-TX-V2" }]);
    expect(refused).toEqual([]);
  });

  it("refuses a family whose 'successor' is itself discontinued (the dangling-remap class)", () => {
    const rows = [
      row("NHD-TOUCH", "discontinued"),
      row("NETWORKHDTOUCHTM", "discontinued", { successor: "NHD-TOUCH" }),
    ];
    const members = [
      { sku: "NETWORKHDTOUCHTM", status: "discontinued" },
      { sku: "NHD-TOUCH", status: "discontinued" },
    ];
    const { acceptable, refused } = classifyVersionFamilyPromotions(rows, members);
    expect(acceptable).toEqual([]);
    expect(refused).toHaveLength(1);
    expect(refused[0]).toMatchObject({ sourceSku: "NETWORKHDTOUCHTM", successorSku: "NHD-TOUCH" });
    expect(refused[0].reason).toMatch(/must point at an active/);
  });

  it("refuses a family whose successor is not in the lifecycle table at all", () => {
    const rows = [row("MXV-OLD", "discontinued", { successor: "MXV-MISSING" })];
    const members = [{ sku: "MXV-OLD", status: "discontinued" }];
    const { acceptable, refused } = classifyVersionFamilyPromotions(rows, members);
    expect(acceptable).toEqual([]);
    expect(refused).toHaveLength(1);
    expect(refused[0].reason).toMatch(/does not resolve to any lifecycle row/);
  });

  it("refuses a family with no active member (nothing quotable to promote onto)", () => {
    const rows = [
      row("SYN-OLD-1", "discontinued"),
      row("SYN-OLD-2", "do-not-spec"),
    ];
    const members = [
      { sku: "SYN-OLD-1", status: "discontinued" },
      { sku: "SYN-OLD-2", status: "do-not-spec" },
    ];
    const { acceptable, refused } = classifyVersionFamilyPromotions(rows, members);
    expect(acceptable).toEqual([]);
    expect(refused).toEqual([]);
  });

  it("splits a multi-member family per pair, refusing only the invalid leg", () => {
    const rows = [
      row("MXV-0808-H2A-V2", "discontinued"),
      row("MXV-0808-H2A-V3", "discontinued"),
      row("MXV-0808-H2A-MK2", "active"),
    ];
    const members = [
      { sku: "MXV-0808-H2A-V2", status: "discontinued" },
      { sku: "MXV-0808-H2A-V3", status: "discontinued" },
      { sku: "MXV-0808-H2A-MK2", status: "active" },
    ];
    const { acceptable, refused } = classifyVersionFamilyPromotions(rows, members);
    expect(acceptable).toHaveLength(2);
    expect(acceptable).toContainEqual({ sourceSku: "MXV-0808-H2A-V2", successorSku: "MXV-0808-H2A-MK2" });
    expect(acceptable).toContainEqual({ sourceSku: "MXV-0808-H2A-V3", successorSku: "MXV-0808-H2A-MK2" });
    expect(refused).toEqual([]);
  });
});
