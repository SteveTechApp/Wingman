import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Regression pins for the reviewer-of-record refusal (tools/apply-governed-
 * review-pass.mjs).
 *
 * The failure mode this guards: an unattended or scripted apply run with
 * confirmations pending must NOT write confirmations anonymously (or under a
 * hard-coded constant). It must refuse loudly, and it must mutate nothing on
 * the refusal path - attribution is resolved before any write. The mirror
 * guarantee also holds: a run with NOTHING pending needs no name (the
 * idempotent re-run after a fix-only pass), and a named run does write.
 *
 * The tool runs as a real subprocess against fixture files through the
 * WINGMAN_PROFILES_FILE / WINGMAN_STORE_FILE env overrides, so the tracked
 * data is never touched. stdin is piped (not a TTY), which is exactly the
 * unattended condition the refusal exists for.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "tools", "apply-governed-review-pass.mjs");

function buildFixture({ pendingSkus }) {
  const dir = mkdtempSync(path.join(tmpdir(), "review-pass-refusal-"));
  const realProfiles = JSON.parse(
    readFileSync(path.join(root, "data/governance/wyrestorm-technical-profiles.json"), "utf8"),
  );
  const realStore = JSON.parse(
    readFileSync(path.join(root, "data/wingman-canonical-product-store.json"), "utf8"),
  );

  // Demote the requested SKUs to the machine tier so the batch has pending
  // confirmations; leave everything else exactly as the tracked data holds it.
  const pending = new Set(pendingSkus.map((sku) => sku.toUpperCase()));
  const profiles = realProfiles.profiles.map((profile) => {
    if (!pending.has(String(profile.sku).toUpperCase())) return profile;
    const { verifiedBy, verifiedAt, confirmedFields, ...rest } = profile;
    rest.status = "verified-with-warning";
    return rest;
  });

  const profilesFile = path.join(dir, "profiles.json");
  writeFileSync(profilesFile, JSON.stringify({ ...realProfiles, profiles }, null, 2) + "\n");
  const storeFile = path.join(dir, "store.json");
  writeFileSync(storeFile, JSON.stringify(realStore, null, 2) + "\n");
  return { dir, profilesFile, storeFile };
}

function runApply({ profilesFile, storeFile }, env = {}) {
  return spawnSync(process.execPath, [cli], {
    cwd: root,
    encoding: "utf8",
    stdin: "pipe", // non-interactive: the unattended condition the refusal covers
    env: {
      ...process.env,
      WINGMAN_PROFILES_FILE: profilesFile,
      WINGMAN_STORE_FILE: storeFile,
      ...env,
    },
  });
}

function storedState(profilesFile) {
  return JSON.parse(readFileSync(profilesFile, "utf8"));
}

describe("apply mode refuses to confirm without a reviewer of record", () => {
  it("exits non-zero with the attribution error when confirmations are pending and no name is given", () => {
    const fixture = buildFixture({ pendingSkus: ["CAB-HAOC-10", "CAB-USBC-15"] });
    try {
      const result = runApply(fixture);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("no reviewer of record");
      expect(result.stderr).toContain("A confirmation must be attributed to the real human who reviewed it");
      // The refusal prints nothing that could read as a confirmation.
      expect(result.stdout).not.toContain("CONFIRMED");
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("mutates nothing on the refusal path - no profile gains an attribution", () => {
    const fixture = buildFixture({ pendingSkus: ["CAB-HAOC-10"] });
    try {
      const before = storedState(fixture.profilesFile);
      runApply(fixture);
      const after = storedState(fixture.profilesFile);
      expect(after).toEqual(before);
      const demoted = after.profiles.find((profile) => profile.sku === "CAB-HAOC-10");
      expect(demoted.status).toBe("verified-with-warning");
      expect(demoted.verifiedBy).toBeUndefined();
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("writes the confirmation when a reviewer name IS supplied for the same pending fixture", () => {
    const fixture = buildFixture({ pendingSkus: ["CAB-HAOC-10"] });
    try {
      const result = runApply(fixture, { WINGMAN_REVIEWER: "Regression Reviewer" });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("reviewer of record: Regression Reviewer");
      expect(result.stdout).toContain("CONFIRMED CAB-HAOC-10");
      const after = storedState(fixture.profilesFile);
      const confirmed = after.profiles.find((profile) => profile.sku === "CAB-HAOC-10");
      expect(confirmed.status).toBe("verified");
      expect(confirmed.verifiedBy).toBe("Regression Reviewer");
      const evidence = confirmed.evidence.at(-1);
      expect(evidence.reviewer).toBe("Regression Reviewer");
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });

  it("runs to completion without a name when nothing is pending (idempotent re-run)", () => {
    const fixture = buildFixture({ pendingSkus: [] });
    try {
      const result = runApply(fixture);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("nothing left to confirm - no reviewer attribution needed");
      expect(result.stdout).toContain("206 already-verified");
    } finally {
      rmSync(fixture.dir, { recursive: true, force: true });
    }
  });
});
