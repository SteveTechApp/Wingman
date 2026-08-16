/**
 * Governed WyreStorm profile confirmation endpoint.
 *
 * \"Verified\" requires a human: a profile only claims the verified tier when a
 * reviewer confirmed its spec-critical fields (max resolution, routed I/O,
 * power) and recorded `verifiedBy`. This module writes that confirmation back
 * to data/governance/wyrestorm-technical-profiles.json, mirroring the
 * competitor-approvals write path (read-modify-write with the same helpers).
 *
 * The strict gate (tools/check-wyrestorm-technical-data.mjs --strict) requires
 * exactly this shape: status \"verified\" is only valid with verifiedBy present.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { WYRESTORM_TECHNICAL_PROFILES_FILE } from "../catalog/files.mjs";

const SPEC_CRITICAL_FIELDS = ["max-resolution", "routed-io", "power"];

const PLACEHOLDER_PATTERNS = [
  /not yet confirmed/i,
  /must be confirmed/i,
  /verify datasheet/i,
  /to be confirmed/i,
  /confirm source count/i,
  /requires verification/i,
  /not available/i,
];

const VIDEO_CLASSES = new Set(["AVOIP", "MATRIX", "VIDEO_WALL", "MULTIVIEW", "HDBASET", "PRESENTATION"]);

const POWER_SPEC_KEYS = ["poe", "poh", "poc", "internalPsu", "externalPsu", "powerSupply"];

function text(value) {
  return String(value ?? "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function isHumanConfirmed(profile) {
  return profile.status === "verified" && Boolean(text(profile.verifiedBy));
}

/** Mirror of src/wingman2/lib/governedConfirmationBacklog.ts readability rules. */
export function readableSpecFields(profile) {
  const readable = new Set();

  const hasVideoIo = (profile.ports ?? []).some((port) => port.category === "video");
  const hasMandatoryDependency = (profile.dependencies ?? []).length > 0;
  const maxResolutionRequired = hasVideoIo || hasMandatoryDependency || VIDEO_CLASSES.has(text(profile.productClass));
  // Max resolution is only confirmable when it is spec-critical (video or
  // dependency-bearing product) AND carries a readable value - mirroring the
  // backlog, which never lists it for non-video products.
  if (maxResolutionRequired && text(profile.maxResolution) && !PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text(profile.maxResolution)))) {
    readable.add("max-resolution");
  }

  const hasExplicitCounts = Number(profile.inputCount) > 0 && Number(profile.outputCount) > 0;
  const ports = profile.ports ?? [];
  const hasDirectionalPort =
    ports.some((port) => /^input$/i.test(text(port.direction))) ||
    ports.some((port) => /^output$/i.test(text(port.direction)));
  const hasVideoPort = ports.some((port) => port.category === "video");
  if (hasExplicitCounts || hasDirectionalPort || hasVideoPort) {
    readable.add("routed-io");
  }

  const hasPowerNotes = (profile.power ?? []).length > 0;
  const specs = profile.specs ?? {};
  const hasPowerSpec = POWER_SPEC_KEYS.some((key) => {
    const value = specs[key];
    return value !== undefined && value !== null && text(value) !== "" && value !== false;
  });
  if (hasPowerNotes || hasPowerSpec) {
    readable.add("power");
  }

  return readable;
}

function validateConfirmation({ sku, verifiedBy, confirmedFields, evidenceUrl }) {
  if (!text(sku)) return { ok: false, error: "A SKU is required." };
  if (!text(verifiedBy)) return { ok: false, error: "Record the reviewer name before confirming a profile." };
  if (!Array.isArray(confirmedFields) || confirmedFields.length === 0) {
    return { ok: false, error: "Confirm at least one spec-critical field." };
  }
  const unknownFields = confirmedFields.filter((field) => !SPEC_CRITICAL_FIELDS.includes(field));
  if (unknownFields.length > 0) {
    return { ok: false, error: `Unknown spec-critical field: ${unknownFields.join(", ")}` };
  }
  try {
    const parsed = new URL(text(evidenceUrl));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, error: "Add a valid manufacturer or datasheet source URL." };
    }
  } catch {
    return { ok: false, error: "Add a valid manufacturer or datasheet source URL." };
  }
  return { ok: true };
}

/**
 * Write a human confirmation back to the governed profiles file.
 * `filePath` defaults to the governed file; tests inject a temp copy.
 * `note` overrides the evidence note (used by batch review tools).
 */
export async function saveProfileConfirmation(input, filePath = WYRESTORM_TECHNICAL_PROFILES_FILE, note = null) {
  const sku = text(input?.sku);
  const verifiedBy = text(input?.verifiedBy);
  const confirmedFields = Array.isArray(input?.confirmedFields) ? input.confirmedFields : [];
  const evidenceUrl = text(input?.evidenceUrl);

  const validation = validateConfirmation({ sku, verifiedBy, confirmedFields, evidenceUrl });
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const payload = await readJsonFile(filePath, null);
  if (!payload || !Array.isArray(payload.profiles)) {
    return { ok: false, error: "Governed profiles file is missing or malformed." };
  }

  const profileIndex = payload.profiles.findIndex((profile) => text(profile.sku).toLowerCase() === sku.toLowerCase());
  if (profileIndex < 0) {
    return { ok: false, error: `No governed profile exists for SKU ${sku}.` };
  }

  const profile = payload.profiles[profileIndex];
  if (isHumanConfirmed(profile)) {
    return { ok: false, error: `${sku} is already human-verified (verifiedBy ${profile.verifiedBy}).` };
  }

  // A field can only be confirmed when it carries a readable value; the
  // dashboard disables missing-data fields, and the server re-checks so a
  // profile can never be verified over unreadable data.
  const readable = readableSpecFields(profile);
  const unreadable = confirmedFields.filter((field) => !readable.has(field));
  if (unreadable.length > 0) {
    return {
      ok: false,
      error: `${sku} cannot be verified yet: ${unreadable.join(", ")} has no readable value. Add the data first.`,
    };
  }

  const now = nowIso();
  const nextProfile = {
    ...profile,
    status: "verified",
    verifiedBy,
    verifiedAt: now,
    confirmedFields,
    evidence: [
      ...(Array.isArray(profile.evidence) ? profile.evidence : []),
      {
        sourceUrl: evidenceUrl,
        sourceType: "manufacturer",
        checkedAt: now,
        // The strict gate (check-wyrestorm-technical-data.mjs --strict)
        // requires every evidence record to name its reviewer and review date,
        // so a confirmation entry must carry them too - verifiedBy is the
        // human of record for this confirmation.
        reviewedOn: now.slice(0, 10),
        reviewer: verifiedBy,
        note: note || "Spec-critical fields confirmed by a human reviewer from the dashboard confirmation desk.",
      },
    ],
  };

  payload.profiles[profileIndex] = nextProfile;
  payload.updatedAt = now;
  await writeJsonFile(filePath, payload);

  return {
    ok: true,
    profile: nextProfile,
    count: payload.profiles.length,
    file: filePath,
  };
}

export async function handleProfileConfirmationPost(req, res, url, helpers) {
  const auth = await helpers.requireWingmanPermission(req, res, url, {
    permission: "canManageWorkspace",
    deniedMessage: "Profile confirmation is restricted to workspace admins.",
  });
  if (!auth) return;

  let body = {};
  try {
    body = await helpers.parseJsonBody(req);
  } catch {
    helpers.sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const saved = await saveProfileConfirmation(body);
  if (!saved.ok) {
    helpers.sendJson(res, 400, { ok: false, error: saved.error });
    return;
  }

  helpers.sendJson(res, 200, {
    ok: true,
    sku: saved.profile.sku,
    verifiedBy: saved.profile.verifiedBy,
    verifiedAt: saved.profile.verifiedAt,
    confirmedFields: saved.profile.confirmedFields,
    file: saved.file,
  });
}
