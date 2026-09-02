// Pins the exception expiry state machine behind tools/check-dependency-audit:
// an exception must be 'ok' while comfortably outside the renewal window,
// 'due-for-renewal' inside the 14-day window (so CI demands a renewal before
// the deadline rather than discovering it at expiry), and 'expired' once the
// date has passed or no expiry exists at all. Regression-guards the arithmetic
// (whole-day boundaries, string-date comparison) without needing a live audit.

import { describe, expect, it } from "vitest";
import {
  daysUntilExpiry,
  evaluateExceptionExpiry,
} from "../../tools/check-dependency-audit.mjs";

const TODAY = "2026-09-02";

describe("dependency-audit exception expiry", () => {
  it("computes whole-day distances on UTC boundaries", () => {
    expect(daysUntilExpiry("2026-09-03", TODAY)).toBe(1);
    expect(daysUntilExpiry("2026-09-16", TODAY)).toBe(14);
    expect(daysUntilExpiry("2026-10-31", TODAY)).toBe(59);
    expect(daysUntilExpiry("2026-09-01", TODAY)).toBe(-1);
  });

  it("marks an exception due for renewal inside the 14-day window", () => {
    expect(evaluateExceptionExpiry({ expiresOn: "2026-09-16" }, TODAY)).toBe("due-for-renewal");
    expect(evaluateExceptionExpiry({ expiresOn: "2026-09-15" }, TODAY)).toBe("due-for-renewal");
    expect(evaluateExceptionExpiry({ expiresOn: "2026-09-03" }, TODAY)).toBe("due-for-renewal");
  });

  it("leaves exceptions outside the renewal window as ok", () => {
    expect(evaluateExceptionExpiry({ expiresOn: "2026-09-17" }, TODAY)).toBe("ok");
    expect(evaluateExceptionExpiry({ expiresOn: "2027-01-01" }, TODAY)).toBe("ok");
  });

  it("marks expired anything past or on the date, or without an expiry", () => {
    expect(evaluateExceptionExpiry({ expiresOn: "2026-09-02" }, TODAY)).toBe("expired");
    expect(evaluateExceptionExpiry({ expiresOn: "2026-08-15" }, TODAY)).toBe("expired");
    expect(evaluateExceptionExpiry({ expiresOn: undefined }, TODAY)).toBe("expired");
    expect(evaluateExceptionExpiry({}, TODAY)).toBe("expired");
  });
});