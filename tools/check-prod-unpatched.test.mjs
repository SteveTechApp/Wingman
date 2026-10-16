import { describe, expect, it } from "vitest";
import { PRODUCTION_DENYLIST, evaluateAudit } from "./check-prod-unpatched.mjs";

// The exact incident this gate is built from: sprintf-js reached main via
// mammoth -> argparse@1.x as a MODERATE finding (severity gates blind to it),
// with no fixed release to upgrade to (fixAvailable === false, npm latest
// 3.0.3 inside the affected <= 1.1.3 range).
const SPRINTF_JS_AUDIT_REPORT = {
  vulnerabilities: {
    "sprintf-js": {
      name: "sprintf-js",
      severity: "moderate",
      fixAvailable: false,
      via: [{ url: "https://github.com/advisories/GHSA-hp3w-g68c-fv3c", title: "sprintf-js vulnerable to denial of service through unbounded precision specifiers", range: "<=1.1.3" }],
    },
  },
};

describe("evaluateAudit", () => {
  it("blocks the incident shape: moderate severity with no fix available", () => {
    const findings = evaluateAudit(SPRINTF_JS_AUDIT_REPORT);
    // Denylist precedence: sprintf-js carries the curated justification. The
    // generic fixAvailable path only fires for packages outside the denylist.
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("sprintf-js GHSA-hp3w-g68c-fv3c");
    expect(findings[0]).toContain("denylisted production dependency");
  });

  it("blocks the denylisted package even when npm stops reporting it", () => {
    // If the advisory database ever stops listing the package (for example a
    // future registry reshuffle), a reintroduced sprintf-js must still fail
    // the gate because the denylist matches by package name at any version.
    const silent = { vulnerabilities: { "sprintf-js": { severity: "none", fixAvailable: true, via: [] } } };
    const findings = evaluateAudit(silent);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("denylisted production dependency");
    expect(findings[0]).toContain("GHSA-hp3w-g68c-fv3c");
  });

  it("passes advisories that have a fix to apply", () => {
    const fixable = {
      vulnerabilities: {
        "some-lib": {
          severity: "high",
          fixAvailable: true,
          via: [{ url: "https://github.com/advisories/GHSA-fixed-0001", title: "fixed upstream" }],
        },
        "other-lib": {
          severity: "critical",
          // A batch fix object still means a fix exists.
          fixAvailable: { name: "other-lib", version: "3.0.0", isSemVerMajor: true },
          via: [{ url: "https://github.com/advisories/GHSA-fixed-0002" }],
        },
      },
    };
    expect(evaluateAudit(fixable)).toEqual([]);
  });

  it("passes a clean production tree", () => {
    expect(evaluateAudit({ vulnerabilities: {} })).toEqual([]);
  });

  it("covers the denylist contract itself", () => {
    const entry = PRODUCTION_DENYLIST.find((row) => row.package === "sprintf-js");
    expect(entry).toBeDefined();
    expect(entry.advisory).toBe("GHSA-hp3w-g68c-fv3c");
    expect(entry.reason).toMatch(/CVE-2026-97058/);
  });

  it("reports a finding without an advisory id rather than passing silently", () => {
    const opaque = {
      vulnerabilities: { "mystery-pkg": { severity: "moderate", fixAvailable: false, via: ["another-pkg"] } },
    };
    const findings = evaluateAudit(opaque);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("no advisory id resolved");
  });

  it("tolerates a malformed audit payload without crashing", () => {
    expect(evaluateAudit(null)).toEqual([]);
    expect(evaluateAudit({})).toEqual([]);
  });
});
