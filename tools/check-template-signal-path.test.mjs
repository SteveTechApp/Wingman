import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ── Load governed profiles and product catalogue (shared with the guard script) ──

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { cells.push(current); current = ""; }
      else current += char;
    }
    cells.push(current);
    return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
}

const products = new Map();
for (const row of parseCsv(readFileSync(path.join(projectRoot, "data-sources", "wyrestorm", "products.csv"), "utf8"))) {
  if (row.sku) products.set(row.sku.toUpperCase(), row);
}

const profiles = new Map();
{
  const payload = JSON.parse(readFileSync(path.join(projectRoot, "data", "governance", "wyrestorm-technical-profiles.json"), "utf8"));
  for (const profile of payload.profiles ?? []) {
    if (profile?.sku) profiles.set(String(profile.sku).toUpperCase(), profile);
  }
}

function profileText(sku) {
  const profile = profiles.get(sku);
  if (!profile) return "";
  return [profile.productClass, profile.role, profile.productType, ...(profile.transport ?? [])].join(" ").toLowerCase();
}

function catalogueText(sku) {
  const row = products.get(sku);
  if (!row) return "";
  return [row.product_name, row.family, row.product_type, row.transport_type].join(" ").toLowerCase();
}

function isHdbasetReceiver(sku) {
  const text = profileText(sku);
  if (text) return text.includes("hdbaset") && /receiver/.test(text);
  const fallback = catalogueText(sku);
  return /hdbaset|extension|extender/.test(fallback) && /^RX/i.test(sku);
}

function canDriveHdbaset(sku) {
  const text = profileText(sku);
  if (text) {
    if (/no hdbaset/.test(text)) return false;
    if (text.includes("hdbaset") && !/receiver/.test(text)) return true;
  }
  const fallback = catalogueText(sku);
  if (/hdbaset matrix|hdbaset matrix kit/.test(fallback)) return true;
  if (/hdbaset/.test(fallback) && /(^|-)TX(-|$)/i.test(sku)) return true;
  if (/^EX-/i.test(sku) && /extension|extender/.test(fallback) && !/receiver/.test(fallback)) return true;
  return false;
}

// ── Guard patterns (mirrored from check-template-signal-path.mjs) ──

const displayEndpointPattern = /^RX3?-|^NHD-\d+-RX$/i;
const sourceEndpointPattern = /^.*TX(-|$)|^NHD-\d+-TX|SW-\d+-TX/i;
const transceiverPattern = /TRX$/i;
const hybridMatrixPattern = /^MX-\d+-HYB$/i;
const nhdEndpointPattern = /^NHD-\d+-(TX|RX|TRX|IW-TX)/i;
const controllerPattern = /CTL-PRO|BY-OTHERS.*control/i;
const multiviewPattern = /NHD-150-RX|NHD-0401-MV/i;

// ── Extract all templates from roomTemplates.ts ──

function extractTemplates() {
  const source = readFileSync(path.join(projectRoot, "src", "wingman2", "lib", "roomTemplates.ts"), "utf8");
  const lines = source.split(/\r?\n/);
  const templates = [];
  let currentName = null;
  let start = 0;

  lines.forEach((line, index) => {
    if (/^ {2}\{/.test(line)) {
      if (currentName) templates.push({ name: currentName, start, end: index });
      currentName = null;
      start = index;
    }
    const nameMatch = line.match(/^ {4}name: "([^"]+)"/);
    if (nameMatch && !currentName) currentName = nameMatch[1];
  });
  if (currentName) templates.push({ name: currentName, start, end: lines.length });

  return { templates, lines };
}

function skusFromTemplate(lines, template) {
  const body = lines.slice(template.start, template.end).join("\n");
  return [...new Set([...body.matchAll(/sku: "([A-Z0-9-]+)"/g)].map((m) => m[1]))];
}

// ── Guard 1: HDBaseT signal path ──

function checkHdbasetSignalPath(skus) {
  const wyreStormSkus = skus.filter((s) => !s.startsWith("BY-OTHERS"));
  const receivers = wyreStormSkus.filter(isHdbasetReceiver);
  if (receivers.length === 0) return { ok: true };
  const sources = wyreStormSkus.filter(canDriveHdbaset);
  if (sources.length > 0) return { ok: true };
  return { ok: false, receivers, skus: wyreStormSkus };
}

// ── Guard 2: Orphaned display endpoints ──

function checkOrphanedDisplays(skus) {
  const wyreStormSkus = skus.filter((s) => !s.startsWith("BY-OTHERS"));
  const displayEndpoints = wyreStormSkus.filter((s) => displayEndpointPattern.test(s));
  if (displayEndpoints.length === 0) return { ok: true };
  const sourceEndpoints = wyreStormSkus.filter((s) => sourceEndpointPattern.test(s));
  const transceivers = wyreStormSkus.filter((s) => transceiverPattern.test(s));
  const hybridMatrices = wyreStormSkus.filter((s) => hybridMatrixPattern.test(s));
  if (transceivers.length > 0) return { ok: true };
  if (hybridMatrices.length > 0) return { ok: true };
  if (sourceEndpoints.length > 0) return { ok: true };
  return { ok: false, displayEndpoints, skus: wyreStormSkus };
}

// ── Guard 3: NetworkHD controller presence ──

function checkControllerPresence(skus) {
  const nhdEndpoints = skus.filter((s) => nhdEndpointPattern.test(s));
  if (nhdEndpoints.length === 0) return { ok: true };
  const hasController = skus.some((s) => controllerPattern.test(s));
  if (hasController) return { ok: true };
  return { ok: false, nhdEndpoints };
}

// ── Guard 4: Source/display ratio warning ──

function checkSourceDisplayRatio(bomRows) {
  const wyreStormRows = bomRows.filter((r) => !r.sku.startsWith("BY-OTHERS"));
  if (wyreStormRows.some((r) => transceiverPattern.test(r.sku))) return { ok: true };
  const totalDisplays = wyreStormRows
    .filter((r) => displayEndpointPattern.test(r.sku) && !multiviewPattern.test(r.sku))
    .reduce((sum, r) => sum + r.qty, 0);
  if (totalDisplays === 0) return { ok: true };
  const totalSources = wyreStormRows
    .filter((r) => sourceEndpointPattern.test(r.sku))
    .reduce((sum, r) => sum + r.qty, 0);
  const hasMultiview = wyreStormRows.some((r) => multiviewPattern.test(r.sku));
  const ratio = totalSources > 0 ? totalDisplays / totalSources : totalDisplays;
  if (ratio > 2 && !hasMultiview) return { ok: false, totalDisplays, totalSources, ratio };
  return { ok: true };
}

// ── Tests ──

describe("template verify guards — live templates", () => {
  const { templates, lines } = extractTemplates();

  it(`extracts ${templates.length} templates from roomTemplates.ts`, () => {
    expect(templates.length).toBeGreaterThanOrEqual(40);
  });

  it("all templates pass HDBaseT signal path guard", () => {
    const failures = [];
    for (const template of templates) {
      const skus = skusFromTemplate(lines, template);
      const result = checkHdbasetSignalPath(skus);
      if (!result.ok) {
        failures.push(`"${template.name}": receivers ${result.receivers.join(", ")} with no HDBaseT driver`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("all templates pass orphaned display endpoint guard", () => {
    const failures = [];
    for (const template of templates) {
      const skus = skusFromTemplate(lines, template);
      const result = checkOrphanedDisplays(skus);
      if (!result.ok) {
        failures.push(`"${template.name}": displays ${result.displayEndpoints.join(", ")} with no source`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("all templates pass NetworkHD controller guard", () => {
    const failures = [];
    for (const template of templates) {
      const skus = skusFromTemplate(lines, template);
      const result = checkControllerPresence(skus);
      if (!result.ok) {
        failures.push(`"${template.name}": NHD endpoints ${result.nhdEndpoints.join(", ")} with no controller`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("source/display ratio warnings are expected and documented", () => {
    const ratioWarnings = [];
    for (const template of templates) {
      const body = lines.slice(template.start, template.end).join("\n");
      const bomRows = [...body.matchAll(/sku: "([A-Z0-9-]+)"[\s\S]*?qty: (\d+)/g)].map((m) => ({
        sku: m[1],
        qty: parseInt(m[2], 10),
      }));
      const result = checkSourceDisplayRatio(bomRows);
      if (!result.ok) ratioWarnings.push(template.name);
    }
    // As of 2026-08-24 these 3 templates have known intentional ratios.
    // Sports Bar and Gym are excluded because they include NHD-150-RX multiview.
    expect(ratioWarnings).toContain("Retail Multi-Zone Signage - NetworkHD 100");
    expect(ratioWarnings).toContain("Science / STEM Teaching Lab - Bench Camera and Demo Distribution");
    expect(ratioWarnings).toContain("Clinic / Pharmacy Waiting - Patient Calling and Signage - NetworkHD 100");
  });
});

describe("guard 1 — HDBaseT signal path", () => {
  it("passes when template has no HDBaseT receivers", () => {
    expect(checkHdbasetSignalPath(["NHD-500-TX", "NHD-500-RX", "NHD-CTL-PRO-V2"]).ok).toBe(true);
  });

  it("passes when HDBaseT receiver has a matching transmitter", () => {
    expect(checkHdbasetSignalPath(["SW-130-TX-UK", "RX-700"]).ok).toBe(true);
  });

  it("passes when HDBaseT receiver has a HDBaseT matrix kit", () => {
    expect(checkHdbasetSignalPath(["MX-0808-KIT-V2", "RX3-100"]).ok).toBe(true);
  });

  it("passes when HDBaseT receiver has a hybrid matrix", () => {
    expect(checkHdbasetSignalPath(["MX-1007-HYB", "RX3-100"]).ok).toBe(true);
  });

  it("passes when EX-70-H2 extender set is present (self-contained TX+RX)", () => {
    expect(checkHdbasetSignalPath(["MX-0404-HDMI", "EX-70-H2"]).ok).toBe(true);
  });

  it("fails when HDBaseT receiver has no transmitter or matrix", () => {
    const result = checkHdbasetSignalPath(["NHD-CTL-PRO-V2", "RX-70-4K"]);
    expect(result.ok).toBe(false);
    expect(result.receivers).toContain("RX-70-4K");
  });

  it("fails when HDMI-only matrix pairs with HDBaseT receiver", () => {
    // MX-0808-SCL is HDMI-only; RX-70-4K is HDBaseT receiver
    const result = checkHdbasetSignalPath(["MX-0808-SCL", "RX-70-4K"]);
    expect(result.ok).toBe(false);
  });

  it("fails when only SW-120-TX3 and RX-700 are present but no matrix", () => {
    // SW-120-TX3 is a transmitter (can drive HDBaseT), so this should PASS
    expect(checkHdbasetSignalPath(["SW-120-TX3", "RX-700"]).ok).toBe(true);
  });
});

describe("guard 2 — orphaned display endpoints", () => {
  it("passes when template has no display endpoints", () => {
    expect(checkOrphanedDisplays(["NHD-CTL-PRO-V2", "NHD-500-TX"]).ok).toBe(true);
  });

  it("passes when display endpoints have matching source endpoints", () => {
    expect(checkOrphanedDisplays(["NHD-500-TX", "NHD-500-RX"]).ok).toBe(true);
  });

  it("passes when transceivers are present (serve as both source and display)", () => {
    expect(checkOrphanedDisplays(["NHD-600-TRX"]).ok).toBe(true);
  });

  it("passes when hybrid matrix is present (can drive receivers)", () => {
    expect(checkOrphanedDisplays(["MX-1007-HYB", "RX3-100"]).ok).toBe(true);
  });

  it("fails when RX3-100 exists without any TX or TRX or hybrid matrix", () => {
    const result = checkOrphanedDisplays(["NHD-CTL-PRO-V2", "RX3-100"]);
    expect(result.ok).toBe(false);
    expect(result.displayEndpoints).toContain("RX3-100");
  });

  it("fails when NHD-500-RX exists without NHD-500-TX", () => {
    const result = checkOrphanedDisplays(["NHD-CTL-PRO-V2", "NHD-500-RX"]);
    expect(result.ok).toBe(false);
    expect(result.displayEndpoints).toContain("NHD-500-RX");
  });

  it("fails when RX-700 exists without any source endpoint", () => {
    const result = checkOrphanedDisplays(["RX-700"]);
    expect(result.ok).toBe(false);
  });

  it("passes when SW-130-TX-UK and RX-700 both exist", () => {
    // SW-130-TX-UK matches sourceEndpointPattern because it contains TX
    expect(checkOrphanedDisplays(["SW-130-TX-UK", "RX-700"]).ok).toBe(true);
  });
});

describe("guard 4 — source/display ratio", () => {
  it("passes when display and source counts are balanced", () => {
    expect(checkSourceDisplayRatio([
      { sku: "NHD-500-TX", qty: 4 },
      { sku: "NHD-500-RX", qty: 3 },
    ]).ok).toBe(true);
  });

  it("passes when multiview processor is present despite high ratio", () => {
    expect(checkSourceDisplayRatio([
      { sku: "NHD-120-TX", qty: 2 },
      { sku: "NHD-120-RX", qty: 8 },
      { sku: "NHD-150-RX", qty: 1 },
    ]).ok).toBe(true);
  });

  it("passes when transceivers are present (dual-role endpoints)", () => {
    expect(checkSourceDisplayRatio([
      { sku: "NHD-600-TRX", qty: 10 },
    ]).ok).toBe(true);
  });

  it("warns when 8 displays have only 2 sources and no multiview", () => {
    const result = checkSourceDisplayRatio([
      { sku: "NHD-120-TX", qty: 2 },
      { sku: "NHD-120-RX", qty: 8 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.ratio).toBe(4);
  });

  it("warns when displays exceed sources by 3x with no multiview", () => {
    const result = checkSourceDisplayRatio([
      { sku: "NHD-500-TX", qty: 1 },
      { sku: "NHD-500-RX", qty: 4 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.ratio).toBe(4);
  });

  it("passes when ratio is exactly 2:1 (no warning)", () => {
    expect(checkSourceDisplayRatio([
      { sku: "NHD-500-TX", qty: 2 },
      { sku: "NHD-500-RX", qty: 4 },
    ]).ok).toBe(true);
  });

  it("passes when no display endpoints exist", () => {
    expect(checkSourceDisplayRatio([
      { sku: "NHD-500-TX", qty: 4 },
    ]).ok).toBe(true);
  });
});

describe("guard 3 — NetworkHD controller presence", () => {
  it("passes when template has no NetworkHD endpoints", () => {
    expect(checkControllerPresence(["MX-0404-HDMI", "EX-70-H2"]).ok).toBe(true);
  });

  it("passes when NHD endpoints include NHD-CTL-PRO-V2", () => {
    expect(checkControllerPresence(["NHD-CTL-PRO-V2", "NHD-500-TX", "NHD-500-RX"]).ok).toBe(true);
  });

  it("fails when NHD endpoints exist without a controller", () => {
    const result = checkControllerPresence(["NHD-500-TX", "NHD-500-RX"]);
    expect(result.ok).toBe(false);
    expect(result.nhdEndpoints).toContain("NHD-500-TX");
    expect(result.nhdEndpoints).toContain("NHD-500-RX");
  });

  it("fails when NHD-120-TX and NHD-120-RX exist without controller", () => {
    const result = checkControllerPresence(["NHD-120-TX", "NHD-120-RX"]);
    expect(result.ok).toBe(false);
  });

  it("passes when BY-OTHERS control placeholder is present instead of NHD-CTL-PRO-V2", () => {
    expect(checkControllerPresence(["NHD-500-TX", "NHD-500-RX", "BY-OTHERS-CONTROL"]).ok).toBe(true);
  });

  it("fails when only NHD-150-RX multiview decoder exists without controller", () => {
    const result = checkControllerPresence(["NHD-150-RX"]);
    expect(result.ok).toBe(false);
    expect(result.nhdEndpoints).toContain("NHD-150-RX");
  });
});

describe("guard integration — real-world regression scenarios", () => {
  it("catches the historic Local Pub bug (MX-0808-SCL + RX-70-4K, no transmitter)", () => {
    // This is the exact bug that motivated the HDBaseT signal-path guard
    const skus = ["MX-0808-SCL", "RX-70-4K", "SYN-KEY10"];
    const hdbaset = checkHdbasetSignalPath(skus);
    expect(hdbaset.ok).toBe(false);
    expect(hdbaset.receivers).toContain("RX-70-4K");
  });

  it("catches a template with NHD-500 endpoints but no controller", () => {
    const skus = ["NHD-500-TX", "NHD-500-RX", "NHD-USB-TRX"];
    const controller = checkControllerPresence(skus);
    expect(controller.ok).toBe(false);
  });

  it("catches a template with only receivers and no sources at all", () => {
    const skus = ["NHD-CTL-PRO-V2", "NHD-500-RX", "RX3-100"];
    const orphan = checkOrphanedDisplays(skus);
    expect(orphan.ok).toBe(false);
  });

  it("passes the MX-1007-HYB ballroom template (hybrid matrix drives RX3-100)", () => {
    const skus = ["MX-1007-HYB", "SW-120-TX3", "RX3-100", "CAM-210-PTZ"];
    expect(checkHdbasetSignalPath(skus).ok).toBe(true);
    expect(checkOrphanedDisplays(skus).ok).toBe(true);
  });

  it("passes a complete NetworkHD 500 boardroom template", () => {
    const skus = ["NHD-CTL-PRO-V2", "NHD-500-TX", "NHD-500-RX", "NHD-USB-TRX", "CAM-210-PTZ"];
    expect(checkHdbasetSignalPath(skus).ok).toBe(true);
    expect(checkOrphanedDisplays(skus).ok).toBe(true);
    expect(checkControllerPresence(skus).ok).toBe(true);
  });

  it("passes a complete NetworkHD 600 control room template", () => {
    const skus = ["NHD-CTL-PRO-V2", "NHD-600-TRX", "NHD-600-TRXF", "NHD-RACK-1U"];
    expect(checkHdbasetSignalPath(skus).ok).toBe(true);
    expect(checkOrphanedDisplays(skus).ok).toBe(true);
    expect(checkControllerPresence(skus).ok).toBe(true);
  });
});

// ── Guard 5: Phantom SKU check ──
function checkSkusInCatalogue(skus) {
  const missing = [];
  for (const sku of skus) {
    if (sku.startsWith("BY-OTHERS") || sku.startsWith("CAB-")) continue;
    const inProfile = profiles.has(sku);
    const inCatalogue = products.has(sku);
    if (!inProfile && !inCatalogue) missing.push(sku);
  }
  return { ok: missing.length === 0, missing };
}

describe("guard 5 — phantom SKU (missing from profiles and catalogue)", () => {
  it("passes for a complete known-good template", () => {
    const skus = ["NHD-CTL-PRO-V2", "NHD-500-TX", "NHD-500-RX", "RX3-100", "CAM-210-PTZ"];
    const result = checkSkusInCatalogue(skus);
    expect(result.ok).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("passes with BY-OTHERS and CAB- rows ignored", () => {
    const skus = ["RX3-100", "BY-OTHERS-displays", "CAB-HDMI-10"];
    const result = checkSkusInCatalogue(skus);
    expect(result.ok).toBe(true);
  });

  it("fails when a phantom SKU is not in profiles or catalogue", () => {
    const skus = ["RX3-100", "MX-0808-HDBT-H2-KIT"];
    const result = checkSkusInCatalogue(skus);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("MX-0808-HDBT-H2-KIT");
  });

  it("fails for the historic MX-0808-HDBT-H2-KIT phantom", () => {
    // This SKU was a variant placeholder that never existed in the catalogue
    const skus = ["MX-0808-HDBT-H2-KIT", "RX-70-4K", "SYN-KEY10"];
    const result = checkSkusInCatalogue(skus);
    expect(result.ok).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(1);
  });

  it("passes for a complete restaurant/bar template", () => {
    const skus = ["MX-0808-KIT-V2", "CAB-HAOC-20", "SYN-KEY10"];
    const result = checkSkusInCatalogue(skus);
    expect(result.ok).toBe(true);
  });

  it("verifies all 43 live templates have no phantom SKUs", () => {
    const source = readFileSync(path.join(projectRoot, "src", "wingman2", "lib", "roomTemplates.ts"), "utf8");
    const templateBlocks = source.split(/^ {2}\{/m).slice(1);
    for (const block of templateBlocks) {
      const nameMatch = block.match(/^ {4}name: "([^"]+)"/);
      const name = nameMatch?.[1] ?? "unknown";
      const skus = [...new Set([...block.matchAll(/sku: "([A-Z0-9-]+)"/g)].map((m) => m[1]))];
      const result = checkSkusInCatalogue(skus);
      expect(result.ok, `Template "${name}" has phantom SKUs: ${result.missing.join(", ")}`).toBe(true);
    }
  });
});
