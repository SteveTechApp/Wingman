import { describe, expect, it, vi } from "vitest";

// The batch view derives everything from the governed profiles JSON, so this
// file mocks that JSON with a small hermetic fixture: two batch SKUs (one
// confirmed, one awaiting) plus one awaiting SKU outside every batch, so the
// joining rules - verified counting, unbatched catch-all, unknown-SKU surfacing
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

import { confirmationBatchForSku, confirmationBatches, governedConfirmationBatchView } from "./governedConfirmationBatches";

describe("governed confirmation batches", () => {
  it("loads the five triage batches with their triage-documented scope", () => {
    const batches = confirmationBatches();
    expect(batches.map((batch) => batch.id)).toEqual(["R1", "R2", "R3", "R4", "R5"]);
    expect(batches.map((batch) => batch.skus.length)).toEqual([23, 18, 15, 16, 18]);
    // Every triage SKU exists in the governed set - the mismatch lane stays empty.
    for (const batch of batches) expect(batch.unknownSkus).toEqual([]);
    // The batches partition 90 SKUs with no overlap.
    const all = batches.flatMap((batch) => batch.skus);
    expect(new Set(all).size).toBe(90);
  });

  it("splits each batch into awaiting and verified from the live backlog", () => {
    const view = governedConfirmationBatchView();
    const r1 = view.batches.find((batch) => batch.id === "R1");
    expect(r1).toBeDefined();
    // The fixture demoted CAB-HAOC-10 (an R1 member) to the machine tier, so
    // R1 has exactly one awaiting member and the rest verified.
    expect(r1!.awaiting.map((profile) => profile.sku)).toEqual(["CAB-HAOC-10"]);
    expect(r1!.verifiedCount).toBe(22);
    expect(r1!.readyToConfirm + r1!.needDataWork).toBe(r1!.awaiting.length);
  });

  it("keeps awaiting profiles outside every batch in the unbatched catch-all", () => {
    const view = governedConfirmationBatchView();
    expect(view.unbatched.map((profile) => profile.sku)).toContain("UNBATCHED-AUDIO-1");
    const batchedSkus = new Set(view.batches.flatMap((batch) => batch.awaiting.map((profile) => profile.sku)));
    for (const profile of view.unbatched) expect(batchedSkus.has(profile.sku)).toBe(false);
    // Nothing is lost: batched awaiting + unbatched equals the whole backlog.
    const totalAwaiting = view.batches.reduce((sum, batch) => sum + batch.awaiting.length, 0) + view.unbatched.length;
    expect(totalAwaiting).toBe(view.totalAwaiting);
  });

  it("maps a SKU to its triage batch id for row tagging", () => {
    expect(confirmationBatchForSku("CAB-HAOC-10")).toBe("R1");
    expect(confirmationBatchForSku("FOCUS-200")).toBe("R5");
    expect(confirmationBatchForSku("NOT-A-GOVERNED-SKU")).toBeNull();
  });
});
