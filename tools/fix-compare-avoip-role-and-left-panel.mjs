import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-avoip-role-left-panel-${stamp}`);
const touched = [];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(relativePath) {
  const file = path.join(repoRoot, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function write(relativePath, content) {
  const file = path.join(repoRoot, relativePath);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
}

function backup(relativePath) {
  const source = path.join(repoRoot, relativePath);

  if (!fs.existsSync(source)) {
    return;
  }

  const target = path.join(backupRoot, relativePath);
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function save(relativePath, content) {
  const current = read(relativePath);

  if (current === content) {
    return;
  }

  backup(relativePath);
  write(relativePath, content);
  touched.push(relativePath);
}

function functionBounds(text, functionName) {
  const re = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\(`);
  const match = re.exec(text);

  if (!match) {
    return null;
  }

  const start = match.index;
  const openBrace = text.indexOf("{", match.index);

  if (openBrace < 0) {
    return null;
  }

  let depth = 0;

  for (let i = openBrace; i < text.length; i++) {
    if (text[i] === "{") {
      depth++;
    }

    if (text[i] === "}") {
      depth--;

      if (depth === 0) {
        return { start, end: i + 1, openBrace };
      }
    }
  }

  return null;
}

function replaceFunction(text, functionName, replacement) {
  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    throw new Error(`Could not find function ${functionName}`);
  }

  return text.slice(0, bounds.start) + replacement + text.slice(bounds.end);
}

function insertBeforeFunction(text, functionName, block, marker) {
  if (text.includes(marker)) {
    return text;
  }

  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    return `${block}\n${text}`;
  }

  return text.slice(0, bounds.start) + block + "\n" + text.slice(bounds.start);
}

function insertAtFunctionStart(text, functionName, block, marker) {
  if (text.includes(marker)) {
    return text;
  }

  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    throw new Error(`Could not find function ${functionName}`);
  }

  return text.slice(0, bounds.openBrace + 1) + "\n" + block + text.slice(bounds.openBrace + 1);
}

function patchEngine() {
  const relative = path.join("server", "competitor", "compare-intelligence.mjs");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = text.replace(/\basync\s+async\s+function\b/g, "async function");

  text = replaceFunction(
    text,
    "inferAvOverIpRole",
    `function inferAvOverIpRole(text) {
  const value = String(text ?? "");
  const compact = value.replace(/\\s+/g, " ");

  // Strong product-family rules must win before general words found on web pages.
  if (/\\bnav\\s*e\\s*\\d+/i.test(compact) || /\\bnav-e-?\\d+/i.test(compact)) {
    return {
      role: "encoder",
      label: "AVoIP encoder / source-side endpoint",
      confidence: "high"
    };
  }

  if (/\\bnav\\s*d\\s*\\d+/i.test(compact) || /\\bnav-d-?\\d+/i.test(compact)) {
    return {
      role: "decoder",
      label: "AVoIP decoder / display-side endpoint",
      confidence: "high"
    };
  }

  if (/\\bNHD[-_\\s]?\\d+[-_\\s]?TRX\\b/i.test(compact) || /[-_\\s]TRX\\b/i.test(compact) || /\\btransceiver\\b/i.test(compact)) {
    return {
      role: "transceiver",
      label: "AVoIP transceiver",
      confidence: "high"
    };
  }

  if (/\\bNHD[-_\\s]?\\d+[-_\\s]?(?:E[-_\\s]?)?TX\\b/i.test(compact) || /[-_\\s]TX\\b/i.test(compact) || /\\bencoder\\b/i.test(compact)) {
    return {
      role: "encoder",
      label: "AVoIP encoder / source-side endpoint",
      confidence: "high"
    };
  }

  if (/\\bNHD[-_\\s]?\\d+[-_\\s]?(?:E[-_\\s]?)?RX\\b/i.test(compact) || /[-_\\s]RX\\b/i.test(compact) || /\\bdecoder\\b/i.test(compact)) {
    return {
      role: "decoder",
      label: "AVoIP decoder / display-side endpoint",
      confidence: "high"
    };
  }

  const sourceScore = scorePatterns(value, [/\\bencoder\\b/i, /\\btransmit/i, /\\bsource\\s*side\\b/i, /\\bhdmi\\s*in\\b/i, /\\bvideo\\s*to\\s*ip\\b/i]);
  const displayScore = scorePatterns(value, [/\\bdecoder\\b/i, /\\breceiv/i, /\\bdisplay\\s*side\\b/i, /\\bhdmi\\s*out\\b/i, /\\bip\\s*to\\s*hdmi\\b/i]);

  if (sourceScore > displayScore && sourceScore > 0) {
    return { role: "encoder", label: "AVoIP encoder / source-side endpoint", confidence: roleConfidence(sourceScore) };
  }

  if (displayScore > sourceScore && displayScore > 0) {
    return { role: "decoder", label: "AVoIP decoder / display-side endpoint", confidence: roleConfidence(displayScore) };
  }

  return {
    role: "unknown",
    label: "AVoIP endpoint role not confirmed",
    confidence: "unknown"
  };
}`
  );

  const avoipCuratedBlock = `
function curatedAvoipCandidates(classification, profile) {
  const evidenceText = String(profile?.__evidenceText || "");

  if (classification.category !== "av_over_ip") {
    return [];
  }

  const competitorPurpose = inferProductPurpose(classification, evidenceText);

  if (competitorPurpose.role === "encoder") {
    return [
      {
        sku: "NHD-120-TX",
        name: "WyreStorm NetworkHD 100-series AVoIP encoder / source-side endpoint",
        family: "NetworkHD 100 Series",
        sourceFile: "curated-avoip-role-map",
        score: 86,
        confidence: 0.86,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP endpoint",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "AVoIP encoder / source-side endpoint",
        purposeRole: "encoder",
        purposeMatch: "same AVoIP role: encoder / source-side endpoint",
        reasons: [
          "lead option",
          "same AVoIP endpoint role",
          "source-side encoder, not display-side decoder",
          "confirm compression, latency, resolution, network design and control requirements before quoting"
        ]
      },
      {
        sku: "NHD-124-TX",
        name: "WyreStorm NetworkHD 100-series 4K AVoIP encoder / source-side endpoint",
        family: "NetworkHD 100 Series",
        sourceFile: "curated-avoip-role-map",
        score: 82,
        confidence: 0.82,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP endpoint",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "AVoIP encoder / source-side endpoint",
        purposeRole: "encoder",
        purposeMatch: "same AVoIP role: encoder / source-side endpoint",
        reasons: [
          "related option",
          "same AVoIP endpoint role",
          "source-side encoder, not display-side decoder",
          "confirm required resolution and codec behaviour before quoting"
        ]
      },
      {
        sku: "NHD-500-E-TX",
        name: "WyreStorm NetworkHD 500-series encoder / source-side endpoint",
        family: "NetworkHD 500 Series",
        sourceFile: "curated-avoip-role-map",
        score: 76,
        confidence: 0.76,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP endpoint",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "AVoIP encoder / source-side endpoint",
        purposeRole: "encoder",
        purposeMatch: "same AVoIP role, different NetworkHD family",
        reasons: [
          "conditional option",
          "same source-side endpoint role",
          "use only where the project architecture fits NetworkHD 500-series"
        ]
      }
    ];
  }

  if (competitorPurpose.role === "decoder") {
    return [
      {
        sku: "NHD-120-RX",
        name: "WyreStorm NetworkHD 100-series AVoIP decoder / display-side endpoint",
        family: "NetworkHD 100 Series",
        sourceFile: "curated-avoip-role-map",
        score: 86,
        confidence: 0.86,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP endpoint",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "AVoIP decoder / display-side endpoint",
        purposeRole: "decoder",
        purposeMatch: "same AVoIP role: decoder / display-side endpoint",
        reasons: [
          "lead option",
          "same AVoIP endpoint role",
          "display-side decoder, not source-side encoder",
          "confirm compression, latency, resolution, network design and control requirements before quoting"
        ]
      },
      {
        sku: "NHD-150-RX",
        name: "WyreStorm NetworkHD 100-series multiview capable decoder",
        family: "NetworkHD 100 Series",
        sourceFile: "curated-avoip-role-map",
        score: hasExplicitMultiviewFeature(evidenceText) ? 86 : 68,
        confidence: hasExplicitMultiviewFeature(evidenceText) ? 0.86 : 0.68,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP endpoint",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: hasExplicitMultiviewFeature(evidenceText)
          ? "AVoIP decoder with multiview composition"
          : "AVoIP decoder / display-side endpoint",
        purposeRole: "decoder",
        purposeMatch: hasExplicitMultiviewFeature(evidenceText)
          ? "same display-side decoder role with multiview requirement"
          : "conditional decoder option; use when NHD-150-RX features are required",
        reasons: [
          hasExplicitMultiviewFeature(evidenceText) ? "lead option for multiview" : "conditional option",
          "display-side decoder, not source-side encoder",
          "multiview only matters when several sources must be composited onto one output"
        ]
      }
    ];
  }

  if (competitorPurpose.role === "transceiver") {
    return [
      {
        sku: "NHD-600-TRX",
        name: "WyreStorm NetworkHD 600-series 10GbE AVoIP transceiver",
        family: "NetworkHD 600 Series",
        sourceFile: "curated-avoip-role-map",
        score: 88,
        confidence: 0.88,
        candidateCategory: "av_over_ip",
        candidateCategoryLabel: "AV over IP transceiver",
        competitorPurpose: competitorPurpose.label,
        candidatePurpose: "AVoIP transceiver",
        purposeRole: "transceiver",
        purposeMatch: "same AVoIP role: transceiver",
        reasons: [
          "lead option",
          "same AVoIP endpoint role",
          "confirm 10GbE network design and zero-latency requirement before quoting"
        ]
      }
    ];
  }

  return [];
}

`;

  text = insertBeforeFunction(
    text,
    "buildCuratedWyrestormCandidates",
    avoipCuratedBlock,
    "function curatedAvoipCandidates"
  );

  text = insertAtFunctionStart(
    text,
    "buildCuratedWyrestormCandidates",
    `  const avoipCandidates = curatedAvoipCandidates(classification, profile);

  if (avoipCandidates.length) {
    return avoipCandidates;
  }

`,
    "const avoipCandidates = curatedAvoipCandidates(classification, profile);"
  );

  save(relative, text);
}

function patchComparePage() {
  const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  const helperBlock = `
function nextCheckItems(result: CompareIntelligenceResult | null) {
  const category = result?.competitor?.category || "";
  const role = result?.competitor?.purposeRole || "";

  if (category === "av_over_ip") {
    if (role === "encoder") {
      return [
        "Confirm this is the source-side device feeding video onto the AV-over-IP network.",
        "Confirm resolution, codec/compression, latency expectation and network family.",
        "Do not compare it with decoder/RX products unless the customer also needs display-side endpoints.",
      ];
    }

    if (role === "decoder") {
      return [
        "Confirm this is the display-side device converting AV-over-IP back to HDMI.",
        "Confirm whether a standard decoder is enough or whether multiview composition is required.",
        "Do not compare it with encoder/TX products unless the customer also needs source-side endpoints.",
      ];
    }

    return [
      "Confirm whether this AVoIP product is an encoder, decoder or transceiver.",
      "Do not rely on port count alone for AVoIP endpoint matching.",
    ];
  }

  if (category === "matrix_switcher") {
    return [
      "Confirm input count, output count and whether the outputs are HDMI, HDBaseT, or mixed.",
      "Check audio return, ARC/eARC, RS-232/IR routing, receiver package and distance requirements.",
    ];
  }

  if (category === "hdbaset_extender") {
    return [
      "Confirm whether this is a transmitter, receiver, or TX/RX kit.",
      "Check HDBaseT generation, distance, USB, audio, control and power requirements.",
    ];
  }

  if (category === "video_wall_processor") {
    return [
      "Confirm display count, source count and wall layout.",
      "Confirm whether it is a dedicated video wall processor or a matrix/scaling architecture.",
    ];
  }

  return [
    "Add a product page, datasheet text or more exact model information before making the match final.",
  ];
}

`;

  if (!text.includes("function nextCheckItems")) {
    const marker = "function ComparePage() {";

    if (!text.includes(marker)) {
      throw new Error("Could not find ComparePage marker.");
    }

    text = text.replace(marker, `${helperBlock}\n${marker}`);
  }

  const noFactsParagraph = `<p className="mt-3 text-sm text-slate-400">
                      Wingman has not found enough verified product detail yet. Add a product page, datasheet text, or exact model number.
                    </p>`;

  const noFactsPanel = `<div className="mt-3 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          Competitor overview
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {competitorOverviewText(result)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100">
                          Confirm before quoting
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-amber-50/90">
                          {nextCheckItems(result).map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>`;

  if (text.includes(noFactsParagraph)) {
    text = text.replace(noFactsParagraph, noFactsPanel);
  }

  save(relative, text);
}

patchEngine();
patchComparePage();

console.log("");
console.log("AVoIP encoder/decoder role fix and left-panel guidance installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}