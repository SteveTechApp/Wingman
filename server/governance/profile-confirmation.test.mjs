import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { saveProfileConfirmation } from "./profile-confirmation.mjs";

function fixturePayload() {
  return {
    version: 5,
    updatedAt: "2026-08-01T00:00:00.000Z",
    policy: "verified requires a human",
    profiles: [
      {
        sku: "MX-0808-SCL",
        status: "verified-with-warning",
        productClass: "MATRIX",
        maxResolution: "4096x2160p @60Hz 8bit 4:4:4",
        inputCount: 8,
        outputCount: 8,
        power: ["AC 100V-240V"],
        ports: [],
      },
      {
        sku: "AMP-2120",
        status: "verified-with-warning",
        productClass: "AUDIO",
        inputCount: 4,
        outputCount: 4,
        ports: [],
        specs: { externalPsu: false },
        maxResolution: "Verify datasheet",
      },
    ],
  };
}

async function withTempProfilesFile(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wm-profile-confirmation-"));
  const filePath = path.join(dir, "wyrestorm-technical-profiles.json");
  await fs.writeFile(filePath, JSON.stringify(fixturePayload(), null, 2), "utf8");
  try {
    await run(filePath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function readProfile(filePath, sku) {
  const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
  return payload.profiles.find((profile) => profile.sku === sku);
}

describe("saveProfileConfirmation", () => {
  it("writes verified status, verifiedBy, confirmed fields and evidence back to the file", async () => {
    await withTempProfilesFile(async (filePath) => {
      const result = await saveProfileConfirmation(
        {
          sku: "MX-0808-SCL",
          verifiedBy: "A. Reviewer",
          confirmedFields: ["max-resolution", "routed-io", "power"],
          evidenceUrl: "https://wyrestorm.com/products/mx-0808-scl",
        },
        filePath,
      );

      expect(result.ok).toBe(true);
      expect(result.profile.status).toBe("verified");
      expect(result.profile.verifiedBy).toBe("A. Reviewer");
      expect(result.profile.confirmedFields).toEqual(["max-resolution", "routed-io", "power"]);
      expect(result.profile.evidence.at(-1).sourceUrl).toBe("https://wyrestorm.com/products/mx-0808-scl");

      const stored = await readProfile(filePath, "MX-0808-SCL");
      expect(stored.status).toBe("verified");
      expect(stored.verifiedBy).toBe("A. Reviewer");
      expect(stored.verifiedAt).toBeTruthy();
      const payload = JSON.parse(await fs.readFile(filePath, "utf8"));
      expect(payload.updatedAt).toBe(stored.verifiedAt);
    });
  });

  it("rejects a confirmation without a reviewer name", async () => {
    await withTempProfilesFile(async (filePath) => {
      const result = await saveProfileConfirmation(
        { sku: "MX-0808-SCL", verifiedBy: "  ", confirmedFields: ["power"], evidenceUrl: "https://wyrestorm.com" },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/reviewer name/i);
    });
  });

  it("rejects a confirmation for an unknown SKU", async () => {
    await withTempProfilesFile(async (filePath) => {
      const result = await saveProfileConfirmation(
        { sku: "MX-0000-NOPE", verifiedBy: "A. Reviewer", confirmedFields: ["power"], evidenceUrl: "https://wyrestorm.com" },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/no governed profile/i);
    });
  });

  it("rejects confirming a field that has no readable value", async () => {
    await withTempProfilesFile(async (filePath) => {
      // AMP-2120's max resolution is a placeholder ("Verify datasheet"), so a
      // reviewer cannot claim it - the server re-checks the readability rule.
      const result = await saveProfileConfirmation(
        { sku: "AMP-2120", verifiedBy: "A. Reviewer", confirmedFields: ["max-resolution"], evidenceUrl: "https://wyrestorm.com" },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/no readable value/i);

      const stored = await readProfile(filePath, "AMP-2120");
      expect(stored.status).toBe("verified-with-warning");
      expect(stored.verifiedBy).toBeUndefined();
    });
  });

  it("rejects confirming an already-verified profile", async () => {
    await withTempProfilesFile(async (filePath) => {
      await saveProfileConfirmation(
        { sku: "MX-0808-SCL", verifiedBy: "A. Reviewer", confirmedFields: ["power"], evidenceUrl: "https://wyrestorm.com" },
        filePath,
      );
      const second = await saveProfileConfirmation(
        { sku: "MX-0808-SCL", verifiedBy: "B. Reviewer", confirmedFields: ["power"], evidenceUrl: "https://wyrestorm.com" },
        filePath,
      );
      expect(second.ok).toBe(false);
      expect(second.error).toMatch(/already human-verified/i);
    });
  });

  it("rejects a confirmation without a valid evidence URL", async () => {
    await withTempProfilesFile(async (filePath) => {
      const result = await saveProfileConfirmation(
        { sku: "MX-0808-SCL", verifiedBy: "A. Reviewer", confirmedFields: ["power"], evidenceUrl: "not-a-url" },
        filePath,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/source url/i);
    });
  });
});
