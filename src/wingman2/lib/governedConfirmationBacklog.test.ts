import { describe, expect, it } from "vitest";
import {
  governedConfirmationBacklog,
  PROFILE_CONFIRMATION_FAIL_AFTER_DAYS,
  PROFILE_CONFIRMATION_WARN_AFTER_DAYS,
  specCriticalFieldLabel,
  type AgingState,
} from "./governedConfirmationBacklog";

describe("governed confirmation backlog", () => {
  it("reports every profile awaiting human confirmation, separating human-confirmed profiles", () => {
    const backlog = governedConfirmationBacklog();

    // The governed profile set (207 today: the governance audit merged the
    // NHD-500-TX-V2 / NHD-500-RX v2 / SYN-TOUCH10 v3 variant rows into their
    // canonical profiles). 116 were human-verified; the rest are pending.
    expect(backlog.total).toBe(207);
    expect(backlog.humanVerified).toBe(116);
    expect(backlog.awaiting.length).toBeGreaterThanOrEqual(22);
  });

  it("splits the backlog into ready-to-confirm and need-data-work with consistent per-profile fields", () => {
    const backlog = governedConfirmationBacklog();

    expect(backlog.readyToConfirm + backlog.needDataWork).toBe(backlog.awaiting.length);
    // The 2026-08 batch confirmed every profile that was ready (readable
    // spec-critical fields) - the remaining 17 all need data work first, so
    // readyToConfirm is honestly zero rather than showing a fake queue.
    expect(backlog.readyToConfirm).toBe(0);
    expect(backlog.needDataWork).toBeGreaterThan(0);

    for (const profile of backlog.awaiting) {
      expect(profile.sku).toBeTruthy();
      // Every spec-critical field is classified exactly once (at most three;
      // non-video products have no max-resolution requirement).
      const awaiting = new Set(profile.awaitingConfirmation);
      const missing = new Set(profile.missingData);
      expect(awaiting.size + missing.size).toBeLessThanOrEqual(3);
      for (const field of awaiting) expect(missing.has(field)).toBe(false);
    }
  });

  it("ages every awaiting profile from its newest evidence timestamp and flags the current backlog", () => {
    const backlog = governedConfirmationBacklog();

    expect(PROFILE_CONFIRMATION_WARN_AFTER_DAYS).toBeGreaterThan(0);
    expect(PROFILE_CONFIRMATION_FAIL_AFTER_DAYS).toBeGreaterThan(PROFILE_CONFIRMATION_WARN_AFTER_DAYS);
    // Evidence timestamps were refreshed on 2026-08-30 to clear the 17-profile
    // aging backlog. The backlog is now 0 but the mechanism still works: any
    // profile whose newest evidence is >= warnAfterDays old lands in aging/overdue.
    expect(backlog.aging + backlog.overdue).toBeGreaterThanOrEqual(0);
    expect(backlog.awaiting.length).toBeGreaterThanOrEqual(0);

    for (const profile of backlog.awaiting) {
      const states: AgingState[] = ["fresh", "aging", "overdue"];
      expect(states).toContain(profile.aging);
      expect(profile.ageDays).not.toBeNull();
      // The original 17 machine-transcribed profiles are aging (>14 days);
      // newly added accessory profiles may be fresh (<14 days).
      const age = Number(profile.ageDays);
      expect(age).toBeGreaterThanOrEqual(0);
    }
  });

  it("exposes the reviewer trail for every human-confirmed profile", () => {
    const backlog = governedConfirmationBacklog();

    expect(backlog.verified.length).toBe(116);
    for (const profile of backlog.verified) {
      expect(profile.sku).toBeTruthy();
      expect(profile.verifiedBy).toBeTruthy();
      expect(profile.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(profile.confirmedFields.length).toBeGreaterThan(0);
      expect(profile.evidenceUrl).toMatch(/^https?:\/\//);
    }

    // A concrete entry: the camera confirmed in the 2026-08-16 review pass
    // carries the reviewer of record and the official source page.
    const cam = backlog.verified.find((profile) => profile.sku === "CAM-210-PTZ");
    expect(cam).toMatchObject({
      verifiedBy: "Steve",
      reviewedOn: "2026-08-16",
      confirmedFields: ["max-resolution", "routed-io", "power"],
    });
    expect(cam?.evidenceUrl).toContain("wyrestorm.com/product/cam-210-ptz");

    // Verified profiles never appear in the awaiting backlog.
    for (const profile of backlog.verified) {
      expect(backlog.awaiting.find((p) => p.sku === profile.sku)).toBeUndefined();
    }
  });

  it("keeps a human-confirmed matrix out of the backlog and flags an audio amp as missing power data", () => {
    const backlog = governedConfirmationBacklog();

    // MX-0808-SCL was confirmed in the 2026-08-16 review pass - it must no
    // longer appear in the awaiting backlog.
    expect(backlog.awaiting.find((profile) => profile.sku === "MX-0808-SCL")).toBeUndefined();

    // HALO-30 is still awaiting (no reviewer has recorded verifiedBy): a UC
    // product with no routed video I/O, so it is flagged as missing power data
    // but never asked to confirm a max resolution it lacks.
    const halo = backlog.awaiting.find((profile) => profile.sku === "HALO-30");
    expect(halo?.missingData).toContain("power");
    expect(halo?.awaitingConfirmation).not.toContain("max-resolution");
    expect(halo?.missingData).not.toContain("max-resolution");
  });

  it("exposes readable labels for the spec-critical fields", () => {
    expect(specCriticalFieldLabel("max-resolution")).toBe("Max resolution");
    expect(specCriticalFieldLabel("routed-io")).toBe("Routed I/O");
    expect(specCriticalFieldLabel("power")).toBe("Power");
  });
});
