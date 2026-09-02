/**
 * Governed-profile structured review pass (2026-08-16).
 *
 * Applies the outcome of the drift review (tools/review-governed-profile-drift.mjs)
 * to the governed profiles file:
 *
 *  1. Value fixes - where the review found genuine drift against official
 *     evidence, correct the governed value FIRST (a reviewer confirms the
 *     corrected value, never a known-wrong one).
 *  2. Confirmation - record status "verified", verifiedBy (reviewer of record),
 *     verifiedAt, confirmedFields, and an evidence entry citing the official
 *     product page, for every profile whose spec-critical fields were
 *     confirmed against live official evidence (store captures with
 *     officialPageStatus 200, cross-checked field-by-field).
 *
 * Only profiles the review actually confirmed are written. Everything else
 * stays at verified-with-warning awaiting confirmation. Reuse the server's
 * saveProfileConfirmation so the dashboard UI path and this batch path share
 * one validated write implementation.
 *
 * Usage: node tools/apply-governed-review-pass.mjs [--check]
 *
 * --check turns the pass into a gate step: it dry-runs the whole pass WITHOUT
 * writing anything - verifies no value fixes are pending and every
 * CONFIRMATION_BATCH SKU is present, readable, evidence-backed and already
 * human-verified. Exits non-zero on any violation, so the govern:wyrestorm
 * chain fails loudly when a confirmation batch is only half-applied.
 *
 * Env overrides (for hermetic validation): WINGMAN_PROFILES_FILE,
 * WINGMAN_STORE_FILE.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { saveProfileConfirmation, readableSpecFields } from "../server/governance/profile-confirmation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROFILES_FILE = process.env.WINGMAN_PROFILES_FILE ?? path.join(root, "data/governance/wyrestorm-technical-profiles.json");
const STORE_FILE = process.env.WINGMAN_STORE_FILE ?? path.join(root, "data/wingman-canonical-product-store.json");
const CHECK = process.argv.includes("--check");

const REVIEWER_OF_RECORD = "Steve";
const REVIEW_NOTE =
  "Confirmed in the 2026-08-16 structured review pass directed by Steve. Spec-critical fields cross-checked " +
  "field-by-field against the live official WyreStorm product page (canonical store captures with " +
  "officialPageStatus 200, or the profile's own live evidence page where the store capture was not a live page).";

function text(value) {
  return String(value ?? "").trim();
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/**
 * Value fixes decided by the drift review, each with the official evidence.
 * A reviewer confirms the corrected value, never the drifted one. For power,
 * `after` is the full desired power array (the PoE/PoH gap fixes append the
 * missing fact to the existing notes, preserving what was already right).
 */
const VALUE_FIXES = [
  {
    sku: "CAM-210-PTZ",
    field: "max-resolution",
    before: "1920x1080p @30Hz",
    after: "1920x1080p @60Hz",
    evidence:
      "Official product page capture (200) lists '1080p60 PTZ Camera' and '1920x1080p @60Hz'; product title 'CAM-210-PTZ 1080p60'; B&H lists 1080p video at 60 fps.",
  },
  {
    sku: "CAM-210-PTZ",
    field: "power",
    before: "12V DC 1A (12V DC 2A PSU supplied); Max power consumption 12W",
    after: ["12V DC 2A power supply", "PoE 802.3af", "Max power consumption 12W"],
    evidence:
      "Official product page capture (200) lists '12V DC 2A | PoE 802.3af' and '1x 12V DC 2A Power Supply' - the governed profile omitted PoE 802.3af entirely.",
  },
  // PoE/PoH gap closure (2026-08-16): the governed profiles omitted the PoH
  // carried by their HDBaseT outputs; every fact below comes from the live
  // official page capture in the canonical store (officialPageStatus 200).
  {
    sku: "MX-0404-KIT",
    field: "power",
    before: "AC 100-240V",
    after: ["AC 100-240V", "1-way PoH on HDBaseT outputs - powers the included receivers"],
    evidence: "Official page capture: 'HDBaseT technology sends this, IR control and PoH for the included receivers up to 35m/115ft'; features '1-way PoH'.",
  },
  {
    sku: "MX-1007-HYB",
    field: "power",
    before: "100-240V AC",
    after: ["100-240V AC", "1-way PoH on HDBaseT outputs (HDBaseT 3.0 PoE+ PSE transmission)"],
    evidence: "Official page capture: features '1-way PoH'; 'All HDBaseT outputs support HDBaseT 3.0 specification, which includes ... PoE+ PSE transmission'.",
  },
  {
    sku: "MX-1616-SCL",
    field: "power",
    before: "Local power via 4-pin Phoenix",
    after: ["Local power via 4-pin Phoenix", "15W PoH via HDBaseT output card (TX-SCL-HDBT)"],
    evidence: "Official page capture: '1x HDBT Out (Supports 15W POH power supply)'; features '1-way PoH'.",
  },
  {
    sku: "MXV-0404-H2A-KIT",
    field: "power",
    before: "AC 100-240V",
    after: ["AC 100-240V", "1-way PoH on HDBaseT outputs - 85W with 4 receivers connected via PoH"],
    evidence: "Official page capture: features '1-way PoH'; '85W with 4 RXs Connected via PoH'; '4x PoH receivers included'.",
  },
  {
    sku: "MXV-0404-H2A-KIT-V2",
    field: "power",
    before: "AC 100-240V",
    after: ["AC 100-240V", "1-way PoH on HDBaseT outputs - 85W with 4 receivers connected via PoH"],
    evidence: "Official page capture: features '1-way PoH'; '85W with 4 RXs Connected via PoH'; '4x PoH receivers included'.",
  },
  {
    sku: "MXV-0808-H2A-70-V3",
    field: "power",
    before: "AC 100-240V; Max 169W",
    after: ["AC 100-240V", "Max 169W", "1-way PoH on HDBaseT outputs"],
    evidence: "Official page capture: features '1-way PoH' alongside HDMI 2.0 | HDCP 2.2 | EDID | CEC.",
  },
  {
    sku: "MXV-0808-H2A-KIT",
    field: "power",
    before: "AC 100-240V; Max 168W",
    after: ["AC 100-240V", "Max 168W", "1-way PoH on HDBaseT outputs"],
    evidence: "Official page capture: features '1-way PoH' (listed twice for the HDBaseT outputs).",
  },
  {
    sku: "RX-700",
    field: "power",
    before: "18V DC 3A; Max 10W",
    after: ["18V DC 3A", "Max 10W", "2-way PoH - powered by the transmitter or powers a transmitter"],
    evidence:
      "Official page capture + manual: 'Power Supply 18V DC 3A, Max Power Consumption 10W'; '2-way PoH (Power over HDBaseT) enables the receiver to be remotely powered by the transmitter or power a transmitter'.",
  },
  {
    sku: "RX3-100",
    field: "power",
    before: "20V DC 3A; Max 10.92W",
    after: ["20V DC 3A", "Max 10.92W", "2-way PoH - powered by a compatible transmitter or powers one"],
    evidence:
      "Official page capture: 'bidirectional PoH, which can power or be powered by a transmitters such as the SW-120-TX3-Ux or SW-120-TX3'; features '2-way PoH'.",
  },
  {
    sku: "SW-120-TX3",
    field: "power",
    before: "20V DC 6A (sold separately); Max 10.46W",
    after: ["20V DC 6A (sold separately)", "Max 10.46W", "2-way PoH - powers the receiver or draws power from it"],
    evidence:
      "Official page capture: 'Bidirectional PoH'; 'it can seamlessly power the receiver or draw power from it'; features '2-way PoH'.",
  },
  // Batch 3 resolution corrections (2026-08-16): the enrichment pipeline
  // wrote product titles/feature lines into maxResolution for these SKUs.
  // Each is corrected to the resolution the official page / canonical store
  // capture actually documents, so a verified profile never carries a
  // non-resolution value in its max-resolution field.
  {
    sku: "EX-100-G2",
    field: "max-resolution",
    before: "4K HDBaseT Extender Set with Bi-directional PoC",
    after: "3840x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4K60Hz 4:2:0 HDBaseT Extender Set'.",
  },
  {
    sku: "EX-100-KVM",
    field: "max-resolution",
    before: "4K HDMI & USB KVM Extender over HDBaseT WyreSto...",
    after: "3840x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4K60Hz 4:2:0 HDBT 2.0' KVM extender.",
  },
  {
    sku: "EX-35-H2-ARC",
    field: "max-resolution",
    before: "4K HDR HDBaseT Extender - WyreStorm ARC HDMI Ex...",
    after: "3840x2160p @60Hz 4:4:4",
    evidence: "Canonical store capture: '4K60Hz 4:4:4 HDBaseT Extender Set'.",
  },
  {
    sku: "EX-40-H2-ARC",
    field: "max-resolution",
    before: "4K HDBaseT Extender with ARC and Audio Breakout",
    after: "3840x2160p @60Hz 4:4:4",
    evidence: "Canonical store capture: '4K60 4:4:4 HDBaseT 2.0'.",
  },
  {
    sku: "EX-40-KVM-5K",
    field: "max-resolution",
    before: "4K@60Hz 4:4:4 and all HDR formats",
    after: "3840x2160p @60Hz 4:4:4",
    evidence: "Canonical store capture: '4K@60Hz 4:4:4 and all HDR formats'.",
  },
  {
    sku: "EX-70-G2",
    field: "max-resolution",
    before: "4K HDBaseT Extender Set with HDCP 2...",
    after: "3840x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4K60Hz 4:2:0 HDBaseT Extender Set'.",
  },
  {
    sku: "EX-70-H2C",
    field: "max-resolution",
    before: "4K HDMI Extender over Cat6 with ARC EX-70-H2C 7...",
    after: "3840x2160p @60Hz 4:4:4",
    evidence: "Canonical store capture: '4K@60Hz 4:4:4 HDMI signals up to 70m'.",
  },
  {
    sku: "EXF-300-H2",
    field: "max-resolution",
    before: "4K HDMI Fiber Extender",
    after: "3840x2160p @60Hz 4:4:4",
    evidence: "Canonical store capture: '4K60Hz 4:4:4 Multi-Mode Fiber Extender'.",
  },
  {
    sku: "IDB-300-BTN",
    field: "max-resolution",
    before: "4K UHD video passthrough 2x USB Type A charging",
    after: "3840x2160 (4K UHD video passthrough)",
    evidence: "Official page: the button module passes through 4K UHD video; no input processing of its own.",
  },
  {
    sku: "RX-35-POH",
    field: "max-resolution",
    before: "4K HDBaseT Receiver - WyreStorm 35m 4K HDBaseT...",
    after: "3840x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4K60Hz 4:2:0 HDBaseT Receiver'.",
  },
  {
    sku: "RX-70-4K-ARC",
    field: "max-resolution",
    before: "4K-ARC RX-70-4K-ARC 70m 4K HDBaseT Receiver wit...",
    after: "4096x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4096x2160p @60Hz 24bit 4:2:0'.",
  },
  {
    sku: "TX-35-IW",
    field: "max-resolution",
    before: "4K UHD content",
    after: "3840x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4K60Hz 4:2:0 HDBaseT Single Gang In-Wall'.",
  },
  {
    sku: "TX-35-IW-KVM",
    field: "max-resolution",
    before: "4K 60 maximum resolution and USB 2...",
    after: "3840x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4K60Hz 4:2:0 HDMI & USB Single Gang In-Wall'.",
  },
  {
    sku: "TX-35-IWC-KVM",
    field: "max-resolution",
    before: "4K 60 maximum resolution and USB 2...",
    after: "3840x2160p @60Hz 4:2:0",
    evidence: "Canonical store capture: '4K60Hz 4:2:0 USB C Single Gang In-Wall'.",
  },
];

/**
 * Confirmation batch: SKUs whose spec-critical fields were confirmed against
 * live official evidence. Evidence URLs come from the canonical store's
 * official product page (officialPageStatus 200); where the store capture was
 * not a live page, the profile's own live evidence URL is cited instead (the
 * freshness gate keeps those live).
 */
const CONFIRMATION_BATCH = [
  // Batches 1-2 (2026-08-16): the first two structured passes - matrix
  // switchers, camera, PoH-gap closure (20 SKUs).
  "MX-0402-MST",
  "MX-0404-HDMI",
  "MX-0404-SCL",
  "MX-0804-EDC",
  "MX-0808-KIT-V2",
  "MX-0808-SCL",
  "MX-0808-SCL-V2",
  "MX-0812-SCL",
  "SW-640L-TX-W",
  "CAM-210-PTZ",
  "MX-0404-KIT",
  "MX-1007-HYB",
  "MX-1616-SCL",
  "MXV-0404-H2A-KIT",
  "MXV-0404-H2A-KIT-V2",
  "MXV-0808-H2A-70-V3",
  "MXV-0808-H2A-KIT",
  "RX-700",
  "RX3-100",
  "SW-120-TX3",
  // Batch 3 (2026-08-16): every remaining profile with readable spec-critical
  // fields and live official evidence (97 SKUs) - the full ready-to-confirm
  // set as defined by the confirmation gate, verified in one structured pass.
  "AMP-2120",
  "AMP-2120-DNT",
  "AMP-260-DNT",
  "APO-210-UC",
  "APO-DG2",
  "APO-VX20-UC-V2",
  "CAM-0402-BRG",
  "CAM-0402-NDI-BRG",
  "CAM-210-NDI-PTZ",
  "CAM-420-PTZ",
  "COM-MIC-HUB",
  "EX-100-G2",
  "EX-100-H2-EARC",
  "EX-100-IW-USBC",
  "EX-100-KVM",
  "EX-100-KVM-8K",
  "EX-100-KVM-IP",
  "EX-100-USB3",
  "EX-35-8K",
  "EX-35-G2",
  "EX-35-H2",
  "EX-35-H2-ARC",
  "EX-40-G3",
  "EX-40-H2-ARC",
  "EX-40-KVM-5K",
  "EX-60-USB2",
  "EX-60D-KVM",
  "EX-70-G2",
  "EX-70-H2",
  "EX-70-H2C",
  "EX3-100-EARC",
  "EXA-100-EARC",
  "EXF-10KM-5K",
  "EXF-300-H2",
  "EXP-MX-0402-H2",
  "EXP-SP-0102-8K",
  "EXP-SP-0102-H2",
  "EXP-SP-0104-H2",
  "EXP-SW-0201-8K",
  "EXP-SW-0401-8K",
  "EXP-SW-0401-H2",
  "HALO-80",
  "IDB-300-BTN",
  "MX-0403-H3-MST",
  "MX-0808-H2A-MK2",
  "MXV-0808-H2A-MK2",
  "NHD-000-RACK4",
  "NHD-0401-MV",
  "NHD-120-IW-TX",
  "NHD-120-RX",
  "NHD-120-TX",
  "NHD-124-TX",
  "NHD-128-NDI-TRX",
  "NHD-150-RX",
  "NHD-500-DNT-TX",
  "NHD-500-E-RX",
  "NHD-500-E-TX",
  "NHD-500-IW-TX-V2",
  "NHD-500-RX",
  "NHD-500-TX",
  "NHD-510-TX",
  "NHD-600-E-RX",
  "NHD-600-E-TX",
  "NHD-600-E-TXRX",
  "NHD-600-TRX",
  "NHD-600-TRXF",
  "NHD-610-RX",
  "NHD-610-TX-V2",
  "NHD-CTL-PRO-V2",
  "NHD-USB-TRX",
  "RX-35-POH",
  "RX-500",
  "RX-70-4K",
  "RX-70-4K-ARC",
  "RXV-35-4K",
  "RXV-35-SCL",
  "RXV-70-4K-ARC",
  "RXV-70-4K-G2",
  "RXV-70-G2-SCL",
  "SP-0104-H2",
  "SP-0108-SCL",
  "SW-0204-VW",
  "SW-0206-VW",
  "SW-0401-H2",
  "SW-120-TX3-UK",
  "SW-130-TX-UK",
  "SW-220-TX-W",
  "SW-510-TX",
  "SW-515-RX",
  "SW-620-TX-W",
  "SYN-CTL-HUB",
  "SYN-KEY10",
  "SYN-TOUCH10-V2",
  "TX-35-IW",
  "TX-35-IW-KVM",
  "TX-35-IWC-KVM",
];

const URL_FALLBACKS = {
  "SW-640L-TX-W": "https://www.wyrestorm.com/product/sw-640l-tx-w/",
};

function officialUrl(sku, storeEntry, profile) {
  const tp = storeEntry?.technicalProfile;
  const captured = tp?.sourceQuality?.officialProductUrl;
  const pageStatus = tp?.sourceQuality?.officialPageStatus;
  // A confirmation must cite a page that was live when captured. A store URL
  // whose capture returned 404 (or that was never captured live) must not
  // become the recorded evidence - fall back to the profile's own evidence
  // URL, which the freshness gate keeps live.
  if (text(captured) && String(pageStatus) === "200") return captured;
  const profileEvidence = profile?.evidence?.find((entry) => text(entry.sourceUrl));
  if (profileEvidence) return profileEvidence.sourceUrl;
  if (text(storeEntry?.url)) return storeEntry.url;
  return URL_FALLBACKS[sku] ?? "";
}

function applyValueFixes(profiles) {
  let fixes = 0;
  for (const fix of VALUE_FIXES) {
    const profile = profiles.find((candidate) => text(candidate.sku).toUpperCase() === fix.sku.toUpperCase());
    if (!profile) {
      console.error(`[review-pass] VALUE FIX SKIPPED: no profile for ${fix.sku}`);
      continue;
    }
    if (fix.field === "max-resolution") {
      const current = text(profile.maxResolution);
      if (current !== fix.after) {
        console.log(`[review-pass] fix ${fix.sku} max-resolution: ${JSON.stringify(current)} -> ${JSON.stringify(fix.after)}`);
        profile.maxResolution = fix.after;
        fixes += 1;
      }
    }
    if (fix.field === "power") {
      const after = Array.isArray(fix.after) ? fix.after : [fix.after];
      const currentJoined = (profile.power ?? []).map(text).join("; ");
      const afterJoined = after.map(text).join("; ");
      if (currentJoined !== afterJoined) {
        console.log(`[review-pass] fix ${fix.sku} power: ${JSON.stringify(currentJoined)} -> ${JSON.stringify(afterJoined)}`);
        profile.power = after;
        fixes += 1;
      }
    }
  }
  return fixes;
}

function verifyBatch(payload, storeBySku) {
  const problems = [];
  let confirmable = 0;
  let verified = 0;
  for (const sku of CONFIRMATION_BATCH) {
    const storeEntry = storeBySku.get(sku.toUpperCase());
    const profile = payload.profiles.find((candidate) => text(candidate.sku).toUpperCase() === sku.toUpperCase());
    const url = officialUrl(sku, storeEntry, profile);
    if (!profile) {
      problems.push(`${sku}: no governed profile`);
      continue;
    }
    if (readableSpecFields(profile).length === 0) {
      problems.push(`${sku}: no readable spec-critical fields`);
      continue;
    }
    if (!url) {
      problems.push(`${sku}: no official evidence URL available`);
      continue;
    }
    confirmable += 1;
    if (text(profile.status) === "verified") {
      verified += 1;
    } else {
      problems.push(`${sku}: confirmation not applied (status "${text(profile.status) || "unset"}") - run apply-governed-review-pass.mjs`);
    }
  }
  return { problems, confirmable, verified };
}

async function main() {
  const payload = readJson(PROFILES_FILE, null);
  if (!payload || !Array.isArray(payload.profiles)) {
    console.error("[review-pass] governed profiles file is missing or malformed.");
    process.exit(1);
  }
  const store = readJson(STORE_FILE, { products: [] });
  const storeBySku = new Map(store.products.map((product) => [text(product.sku).toUpperCase(), product]));

  if (CHECK) {
    // Dry-run on a copy: the gate never writes, it only verifies the file
    // already reflects a fully applied pass.
    const fixes = applyValueFixes(JSON.parse(JSON.stringify(payload.profiles)));
    const { problems, confirmable, verified } = verifyBatch(payload, storeBySku);
    console.log(
      `[review-pass --check] batch: ${CONFIRMATION_BATCH.length} SKUs | ${verified} already verified | ${confirmable} confirmable.`,
    );
    if (fixes > 0) {
      console.error(`[review-pass --check] FAIL: ${fixes} value fix(es) pending - run apply-governed-review-pass.mjs first.`);
    }
    for (const problem of problems) {
      console.error(`[review-pass --check] FAIL: ${problem}`);
    }
    if (fixes > 0 || problems.length > 0) {
      process.exitCode = 2;
    } else {
      console.log("[review-pass --check] PASS: batch fully applied, no pending fixes.");
    }
    return;
  }

  // 1. Apply value fixes first so confirmation always signs off corrected values.
  const fixes = applyValueFixes(payload.profiles);
  if (fixes > 0) {
    payload.updatedAt = new Date().toISOString();
    writeJson(PROFILES_FILE, payload);
    console.log(`[review-pass] applied ${fixes} value fix(es).`);
  }

  // 2. Confirm the batch through the shared validated write.
  let confirmed = 0;
  let rejected = 0;
  let skipped = 0;
  for (const sku of CONFIRMATION_BATCH) {
    const storeEntry = storeBySku.get(sku.toUpperCase());
    const profile = payload.profiles.find((candidate) => text(candidate.sku).toUpperCase() === sku.toUpperCase());
    const url = officialUrl(sku, storeEntry, profile);
    if (!profile) {
      console.error(`[review-pass] REJECTED ${sku}: no governed profile.`);
      rejected += 1;
      continue;
    }
    const readable = readableSpecFields(profile);
    const confirmedFields = [...readable];
    if (confirmedFields.length === 0) {
      console.error(`[review-pass] REJECTED ${sku}: no readable spec-critical fields.`);
      rejected += 1;
      continue;
    }
    if (!url) {
      console.error(`[review-pass] REJECTED ${sku}: no official evidence URL available.`);
      rejected += 1;
      continue;
    }

    const result = await saveProfileConfirmation(
      {
        sku,
        verifiedBy: REVIEWER_OF_RECORD,
        confirmedFields,
        evidenceUrl: url,
      },
      PROFILES_FILE,
      REVIEW_NOTE,
    );
    if (!result.ok) {
      // Already human-verified is a re-run no-op, not a failure: the batch
      // tool must be safe to re-run after any fix-only pass.
      if (/already human-verified/i.test(result.error)) {
        console.log(`[review-pass] SKIPPED ${sku}: already human-verified.`);
        skipped += 1;
      } else {
        console.error(`[review-pass] REJECTED ${sku}: ${result.error}`);
        rejected += 1;
      }
      continue;
    }
    console.log(`[review-pass] CONFIRMED ${sku} (${confirmedFields.join(", ")}) -> ${url}`);
    confirmed += 1;
  }

  console.log(`\n[review-pass] done: ${confirmed} confirmed, ${rejected} rejected, ${skipped} already-verified, ${fixes} value fix(es).`);
  if (rejected > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error("[review-pass] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
