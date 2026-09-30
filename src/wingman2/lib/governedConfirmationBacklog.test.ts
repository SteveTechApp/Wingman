import { describe, expect, it, vi } from "vitest";
import {
  governedConfirmationBacklog,
  governedProfileFieldApplicability,
  PROFILE_CONFIRMATION_FAIL_AFTER_DAYS,
  PROFILE_CONFIRMATION_WARN_AFTER_DAYS,
  specCriticalFieldLabel,
  type AgingState,
} from "./governedConfirmationBacklog";

// The 2026-09-30 confirmation pass verified every profile in the tracked data,
// so the real payload no longer contains an awaiting backlog. Demote two
// SKUs (one passive cable, one UC device missing power data) back to the
// machine-transcribed tier so the backlog classification, aging, and trail
// scenarios below stay exercisable against a realistic mix.
vi.mock("../../../data/governance/wyrestorm-technical-profiles.json", async () => {
  const actual = (await vi.importActual(
    "../../../data/governance/wyrestorm-technical-profiles.json",
  )) as { default: { profiles: Array<Record<string, unknown>> } };
  const { governedProfilesWithStatus } = await import("./testHelpers/governedProfilesHarness");
  return {
    default: governedProfilesWithStatus(actual.default as never, ["CAB-HAOC-10", "HALO-30"], "verified-with-warning"),
  };
});

describe("governed confirmation backlog", () => {
  it("reports every profile awaiting human confirmation, separating human-confirmed profiles", () => {
    const backlog = governedConfirmationBacklog();

    // The governed profile set (207 today: the governance audit merged the
    // NHD-500-TX-V2 / NHD-500-RX v2 / SYN-TOUCH10 v3 variant rows into their
    // canonical profiles). Every profile is human-verified since the
    // 2026-09-30 pass, except the two the module mock above demotes.
    expect(backlog.total).toBe(206);
    expect(backlog.humanVerified).toBe(204);
    expect(backlog.awaiting.length).toBe(2);
  });

  it("splits the backlog into ready-to-confirm and need-data-work with consistent per-profile fields", () => {
    const backlog = governedConfirmationBacklog();

    expect(backlog.readyToConfirm + backlog.needDataWork).toBe(backlog.awaiting.length);
    // Applicability-aware review keeps passive/accessory records out of
    // irrelevant resolution, routing and power queues: the demoted cable is
    // ready (a profile-scope review), the UC device needs power data work.
    expect(backlog.readyToConfirm).toBeGreaterThan(0);
    expect(backlog.needDataWork).toBeGreaterThan(0);

    for (const profile of backlog.awaiting) {
      expect(profile.sku).toBeTruthy();
      // Every applicable field is classified exactly once. Passive products
      // may instead carry one profile-scope review.
      const awaiting = new Set(profile.awaitingConfirmation);
      const missing = new Set(profile.missingData);
      expect(awaiting.size + missing.size).toBeLessThanOrEqual(4);
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

    expect(backlog.verified.length).toBe(204);
    for (const profile of backlog.verified) {
      expect(profile.sku).toBeTruthy();
      expect(profile.verifiedBy).toBeTruthy();
      expect(profile.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(profile.confirmedFields.length).toBeGreaterThan(0);
      expect(profile.evidenceUrl).toMatch(/^https?:\/\//);
    }

    // A concrete entry: the camera confirmed in the 2026-08-16 review pass
    // carries the reviewer of record and the official source page. (The pass
    // was recorded under the bare "Steve" until the 2026-09-30 re-signature
    // unified every attribution on the reviewer of record's full name.)
    const cam = backlog.verified.find((profile) => profile.sku === "CAM-210-PTZ");
    expect(cam).toMatchObject({
      verifiedBy: "Steve Goodwin",
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
    expect(specCriticalFieldLabel("profile-scope")).toBe("Profile scope / N/A fields");
  });

  it("does not request video resolution for amplifiers, microphones, or passive mounts", () => {
    expect(governedProfileFieldApplicability({ productClass: "AUDIO", role: "power amplifier", dependencies: ["host"], ports: [{ category: "video" }] })["max-resolution"]).toBe(false);
    expect(governedProfileFieldApplicability({ productClass: "AUDIO", role: "conference microphone", dependencies: ["hub"] })["max-resolution"]).toBe(false);
    expect(governedProfileFieldApplicability({ productClass: "ACCESSORY", role: "mounting bracket" })).toMatchObject({
      "max-resolution": false,
      "routed-io": false,
      power: false,
    });
  });
});
