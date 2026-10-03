import { describe, expect, it, vi } from "vitest";

// The group view derives everything from the governed profiles JSON, so this
// file mocks that JSON with a small hermetic fixture: two batch SKUs (one
// confirmed, one awaiting) plus one awaiting SKU outside every group, so the
// joining rules - verified counting, ungrouped catch-all, unknown-SKU surfacing
// - are all exercised without depending on the real data's state.
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<Record<string, unknown>> } };
  const cable = actual.default.profiles.find((profile) => profile.sku === "CAB-HAOC-10") as Record<string, unknown>;
  const uc = actual.default.profiles.find((profile) => profile.sku === "HALO-30") as Record<string, unknown>;
  if (!cable || !uc) throw new Error("fixture profiles missing from the real payload");
  const awaitingCable: Record<string, unknown> = { ...cable };
  delete awaitingCable.verifiedBy;
  delete awaitingCable.verifiedAt;
  delete awaitingCable.confirmedFields;
  awaitingCable.status = "verified-with-warning";
  const unbatchedAudio: Record<string, unknown> = {
    sku: "UNBATCHED-AUDIO-1",
    productClass: "AUDIO",
    role: "power amplifier",
    status: "review-required",
    power: ["IEC"],
    evidence: [{ sourceType: "manufacturer", sourceUrl: "https://www.wyrestorm.com/unbatched", reviewedOn: "2026-09-30" }],
  };
  return {
    default: {
      ...actual.default,
      profiles: [...actual.default.profiles.filter((p) => p.sku !== "CAB-HAOC-10"), awaitingCable, unbatchedAudio],
    },
  };
});

import {
  confirmationFamilyForSku,
  confirmationGroupForSku,
  confirmationGroupView,
  confirmationGroups,
  type GroupingKind,
} from "./governedConfirmationBatches";

describe("governed confirmation groupings", () => {
  it("loads both triage groupings with their documented scope", () => {
    const batches = confirmationGroups("batches");
    expect(batches.map((group) => group.id)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    expect(batches.map((group) => group.skus.length)).toEqual([23, 18, 15, 16, 18]);

    const families = confirmationGroups("families");
    expect(families.map((group) => group.id)).toEqual(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"]);
    // Both groupings cover the same 90 triage SKUs, partitioned without
    // overlap inside their own grouping.
    const batchSkus = batches.flatMap((group) => group.skus);
    const familySkus = families.flatMap((group) => group.skus);
    expect(new Set(batchSkus).size).toBe(90);
    expect(new Set(familySkus).size).toBe(90);
    expect(new Set(familySkus)).toEqual(new Set(batchSkus));
    // Every triage SKU exists in the governed set - the mismatch lane stays empty.
    for (const group of [...batches, ...families]) expect(group.unknownSkus).toEqual([]);
  });

  it("splits each group into awaiting and verified from the live backlog", () => {
    const view = confirmationGroupView("batches");
    const r1 = view.groups.find((group) => group.id === "R1");
    expect(r1).toBeDefined();
    // The fixture demoted CAB-HAOC-10 (an R1 member) to the machine tier, so
    // R1 has exactly one awaiting member and the rest verified.
    expect(r1!.awaiting.map((profile) => profile.sku)).toEqual(["CAB-HAOC-10"]);
    expect(r1!.verifiedCount).toBe(22);
    expect(r1!.readyToConfirm + r1!.needDataWork).toBe(r1!.awaiting.length);

    // The same demoted SKU lands in exactly one family grouping too (T1).
    const familyView = confirmationGroupView("families");
    const t1 = familyView.groups.find((group) => group.id === "T1");
    expect(t1!.awaiting.map((profile) => profile.sku)).toEqual(["CAB-HAOC-10"]);
  });

  it("keeps awaiting profiles outside every group in the ungrouped catch-all", () => {
    for (const kind of ["batches", "families"] as GroupingKind[]) {
      const view = confirmationGroupView(kind);
      expect(view.ungrouped.map((profile) => profile.sku)).toContain("UNBATCHED-AUDIO-1");
      const groupedSkus = new Set(view.groups.flatMap((group) => group.awaiting.map((profile) => profile.sku)));
      for (const profile of view.ungrouped) expect(groupedSkus.has(profile.sku)).toBe(false);
      // Nothing is lost: grouped awaiting + ungrouped equals the whole backlog.
      const totalAwaiting = view.groups.reduce((sum, group) => sum + group.awaiting.length, 0) + view.ungrouped.length;
      expect(totalAwaiting).toBe(view.totalAwaiting);
    }
  });

  it("maps a SKU to its group id in either grouping for row tagging", () => {
    expect(confirmationGroupForSku("CAB-HAOC-10", "batches")).toBe("R1");
    expect(confirmationGroupForSku("FOCUS-200", "batches")).toBe("R5");
    expect(confirmationFamilyForSku("CAB-HAOC-10")).toBe("T1");
    expect(confirmationGroupForSku("NOT-A-GOVERNED-SKU", "families")).toBeNull();
  });
});
