import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-avoip-noise-provisional-${stamp}`);
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
        return { start, end: i + 1 };
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

function patchEngine() {
  const relative = path.join("server", "competitor", "compare-intelligence.mjs");
  let text = read(relative);

  if (!text) {
    throw new Error(`Missing ${relative}`);
  }

  text = text.replace(/\basync\s+async\s+function\b/g, "async function");

  const helperBlock = `
function compareCandidateSku(candidate) {
  return String(candidate?.sku || "").trim().toUpperCase();
}

function compareEvidenceText(profile) {
  return String(profile?.__evidenceText || "");
}

function compareHasExplicitMultiview(text) {
  if (typeof hasExplicitMultiviewFeature === "function") {
    return hasExplicitMultiviewFeature(text);
  }

  return /\\bmultiview\\b|\\bmulti[-\\s]?view\\b|\\bquad\\s+view\\b|\\bpip\\b|\\bpbp\\b/i.test(String(text || ""));
}

function compareAvoipEvidenceRequiresTransceiver(text) {
  return /\\btrx\\b|\\btransceiver\\b|\\bsdvoe\\b|\\b10\\s*g(?:b|be)?\\b|\\bzero[-\\s]?latency\\b|\\buncompressed\\b/i.test(String(text || ""));
}

function compareAvoipEvidenceRequires4k60(text) {
  return /\\b4k\\s*60\\b|\\b4k60\\b|\\b4\\s*:?4\\s*:?4\\b|\\b18\\s*gbps\\b|\\bhdmi\\s*2\\.0\\b/i.test(String(text || ""));
}

function compareAvoipRoleFromSku(candidate) {
  const sku = compareCandidateSku(candidate);
  const text = String([candidate?.sku, candidate?.name, candidate?.candidatePurpose, candidate?.purposeRole].filter(Boolean).join(" "));

  if (/\\bUSB\\b/i.test(sku) && !/NHD[-_]?USB[-_]?TRX/i.test(sku)) {
    return "usb";
  }

  if (/NHD[-_]?USB[-_]?TRX/i.test(sku)) {
    return "usb_transport";
  }

  if (/\\bTRX\\b|[-_]TRX\\b|\\bTRANSCEIVER\\b/i.test(text)) {
    return "transceiver";
  }

  if (/[-_]TX\\b|\\bTX\\b|\\bENCODER\\b/i.test(text)) {
    return "encoder";
  }

  if (/[-_]RX\\b|\\bRX\\b|\\bDECODER\\b/i.test(text)) {
    return "decoder";
  }

  return String(candidate?.purposeRole || "").toLowerCase() || "unknown";
}

function compareAvoipHasUsefulFacts(profile) {
  const text = compareEvidenceText(profile);
  const strongFacts = [
    /\\b4k\\s*60\\b/i,
    /\\b4k60\\b/i,
    /\\b4\\s*:?4\\s*:?4\\b/i,
    /\\b10\\s*g(?:b|be)?\\b/i,
    /\\bsdvoe\\b/i,
    /\\bjpeg\\s*2000\\b/i,
    /\\bjpeg\\s*xs\\b/i,
    /\\bh\\.265\\b/i,
    /\\bh\\.264\\b/i,
    /\\bmultiview\\b/i,
    /\\busb\\s*2(?:\\.0)?\\b/i,
    /\\busb\\s*3(?:\\.0|\\.1|\\.2)?\\b/i,
    /\\baudio\\b/i,
    /\\brs[-\\s]?232\\b/i
  ];

  return strongFacts.some((pattern) => pattern.test(text));
}

function compareAvoipCandidateAllowed(classification, profile, candidate) {
  if (classification?.category !== "av_over_ip") {
    return true;
  }

  const evidenceText = compareEvidenceText(profile);
  const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const competitorRole = competitorPurpose?.role || "unknown";
  const candidateRole = compareAvoipRoleFromSku(candidate);
  const sku = compareCandidateSku(candidate);

  if (candidateRole === "usb_transport") {
    return false;
  }

  if (candidateRole === "usb") {
    return false;
  }

  if (competitorRole === "encoder" && candidateRole !== "encoder") {
    if (candidateRole === "transceiver" && compareAvoipEvidenceRequiresTransceiver(evidenceText)) {
      return true;
    }

    return false;
  }

  if (competitorRole === "decoder" && candidateRole !== "decoder") {
    if (candidateRole === "transceiver" && compareAvoipEvidenceRequiresTransceiver(evidenceText)) {
      return true;
    }

    return false;
  }

  if (competitorRole === "transceiver" && candidateRole !== "transceiver") {
    return false;
  }

  if (/NHD[-_]?150[-_]?RX/i.test(sku) && !compareHasExplicitMultiview(evidenceText)) {
    return false;
  }

  if (/NHD[-_]?(500|600|610)/i.test(sku)) {
    if (!compareAvoipEvidenceRequires4k60(evidenceText) && !compareAvoipEvidenceRequiresTransceiver(evidenceText)) {
      return false;
    }
  }

  return true;
}

function compareTuneAvoipCandidate(classification, profile, candidate) {
  if (classification?.category !== "av_over_ip") {
    return candidate;
  }

  const evidenceText = compareEvidenceText(profile);
  const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const candidateRole = compareAvoipRoleFromSku(candidate);
  const hasUsefulFacts = compareAvoipHasUsefulFacts(profile);
  const sku = compareCandidateSku(candidate);

  let score = Number(candidate?.score || 0);
  const reasons = Array.isArray(candidate?.reasons) ? candidate.reasons.slice() : [];

  if (!hasUsefulFacts) {
    if (competitorPurpose.role === "decoder" && sku === "NHD-120-RX") {
      score = 74;
    } else if (competitorPurpose.role === "encoder" && sku === "NHD-120-TX") {
      score = 74;
    } else {
      score = Math.min(score, 58);
    }

    reasons.push("provisional match because verified competitor facts are limited");
  }

  if (candidateRole === competitorPurpose.role) {
    reasons.push(\`same AVoIP endpoint role: \${competitorPurpose.label}\`);
  }

  return {
    ...candidate,
    score,
    confidence: Math.min(0.94, score / 100),
    purposeRole: candidateRole === "unknown" ? candidate?.purposeRole : candidateRole,
    purposeMatch: hasUsefulFacts
      ? candidate?.purposeMatch || \`same AVoIP endpoint role: \${competitorPurpose.label}\`
      : \`provisional same-role match: \${competitorPurpose.label}\`,
    reasons: Array.from(new Set(reasons)).slice(0, 10)
  };
}

function compareLimitAvoipCandidates(classification, profile, candidates) {
  if (classification?.category !== "av_over_ip") {
    return candidates;
  }

  const hasUsefulFacts = compareAvoipHasUsefulFacts(profile);
  const evidenceText = compareEvidenceText(profile);
  const competitorPurpose = inferProductPurpose(classification, evidenceText);
  const preferred = [];

  if (!hasUsefulFacts) {
    if (competitorPurpose.role === "decoder") {
      preferred.push("NHD-120-RX");
    }

    if (competitorPurpose.role === "encoder") {
      preferred.push("NHD-120-TX");
    }

    if (competitorPurpose.role === "transceiver") {
      preferred.push("NHD-600-TRX");
    }

    const filtered = candidates.filter((candidate) => preferred.includes(compareCandidateSku(candidate)));

    if (filtered.length) {
      return filtered.slice(0, 1);
    }

    return candidates.slice(0, 1);
  }

  return candidates.slice(0, 4);
}

`;

  text = insertBeforeFunction(
    text,
    "matchWyrestormProducts",
    helperBlock,
    "function compareAvoipCandidateAllowed"
  );

  text = replaceFunction(
    text,
    "matchWyrestormProducts",
    `async function matchWyrestormProducts(classification, profile) {
  const products = await loadWyrestormProducts();

  const hdbasetSpecificity =
    typeof identifyHdbasetSpecificity === "function"
      ? identifyHdbasetSpecificity(profile.__evidenceText || "")
      : { standard: "" };

  const videoWallSpecificity =
    typeof identifyVideoWallSpecificity === "function"
      ? identifyVideoWallSpecificity(profile.__evidenceText || "")
      : { isVideoWall: false };

  const hdbasetMatrixSpecificity =
    typeof identifyHdbasetMatrixSpecificity === "function"
      ? identifyHdbasetMatrixSpecificity(profile.__evidenceText || "")
      : { isHdbasetMatrix: false };

  const scoredCandidates = products
    .map((product) => scoreWyrestormCandidate(classification, profile, product, profile.__evidenceText || ""))
    .filter(Boolean);

  const curatedCandidates =
    typeof buildCuratedWyrestormCandidates === "function"
      ? buildCuratedWyrestormCandidates(classification, profile)
      : [];

  const bySku = new Map();

  for (const rawCandidate of [...curatedCandidates, ...scoredCandidates]) {
    if (!rawCandidate) {
      continue;
    }

    if (!compareAvoipCandidateAllowed(classification, profile, rawCandidate)) {
      continue;
    }

    const candidate = compareTuneAvoipCandidate(classification, profile, rawCandidate);
    const key = String(candidate.sku || candidate.name || "").toUpperCase();

    if (!key) {
      continue;
    }

    if (
      classification.category === "hdbaset_extender" &&
      hdbasetSpecificity.standard === "hdbaset_3" &&
      key !== "EX-100-USB3"
    ) {
      continue;
    }

    if (
      hdbasetMatrixSpecificity.isHdbasetMatrix &&
      hdbasetMatrixSpecificity.inputs === 8 &&
      hdbasetMatrixSpecificity.outputs === 8 &&
      !["MXV-0808-H2A-KIT", "MXV-0808-H2L", "MX-0808-KIT V2", "MX-0808-HDBT-H2"].includes(key)
    ) {
      continue;
    }

    if (
      classification.category === "video_wall_processor" &&
      videoWallSpecificity.isVideoWall &&
      videoWallSpecificity.inputs === 8 &&
      videoWallSpecificity.outputs === 8 &&
      !["MX-0808-SCL", "MX-0812-SCL", "SW-0206-VW", "SW-0204-VW"].includes(key)
    ) {
      continue;
    }

    const existing = bySku.get(key);

    if (!existing || Number(candidate.score || 0) > Number(existing.score || 0)) {
      bySku.set(key, candidate);
    }
  }

  let candidates = Array.from(bySku.values())
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  candidates = compareLimitAvoipCandidates(classification, profile, candidates);

  if (hdbasetSpecificity.standard === "hdbaset_3") {
    candidates = candidates.slice(0, 1);
  }

  if (classification.category !== "av_over_ip") {
    candidates = candidates.slice(0, 8);
  }

  const top = candidates[0];

  if (!top || Number(top.score || 0) < 42) {
    return {
      attempted: true,
      matchStatus: "no_genuine_match",
      candidates,
      message: hdbasetMatrixSpecificity.isHdbasetMatrix
        ? "Wingman identified an HDBaseT matrix requirement, but could not confirm a strong WyreStorm matrix option from the current product list."
        : videoWallSpecificity.isVideoWall
          ? "Wingman identified a video wall requirement, but could not confirm a strong WyreStorm option from the current product list."
          : hdbasetSpecificity.standard === "hdbaset_3"
            ? "Wingman identified an HDBaseT 3.0 competitor product, but could not confirm the required WyreStorm EX-100-USB3 match from the current product list."
            : "Wingman identified the competitor product type, but no WyreStorm product reached the minimum confidence threshold for a professional comparison."
    };
  }

  return {
    attempted: true,
    matchStatus: "candidate_match",
    candidates,
    message: classification.category === "av_over_ip" && !compareAvoipHasUsefulFacts(profile)
      ? "Wingman found a provisional same-role AVoIP option. Add a product page or datasheet text before expanding to other NetworkHD families."
      : hdbasetMatrixSpecificity.isHdbasetMatrix
        ? "Wingman found WyreStorm HDBaseT matrix options to consider. Confirm receiver package, output mirroring, audio/ARC behaviour, control and distance before quoting."
        : videoWallSpecificity.isVideoWall
          ? "Wingman found a WyreStorm video wall / matrix option to consider. Confirm source count, display count and layout behaviour before quoting."
          : hdbasetSpecificity.standard === "hdbaset_3"
            ? "Wingman found the HDBaseT 3.0 like-for-like WyreStorm option. Other HDBaseT products have been discounted because they are not the same standard."
            : "Wingman found one or more WyreStorm options in the same or closely related product role."
  };
}`
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
function hasUsefulVerifiedFacts(result: CompareIntelligenceResult | null) {
  return specRows(result).length > 0;
}

function isProvisionalMatch(result: CompareIntelligenceResult | null) {
  return result?.competitor?.category === "av_over_ip" && !hasUsefulVerifiedFacts(result);
}

`;

  if (!text.includes("function isProvisionalMatch")) {
    const marker = "function salesRecommendation";
    text = text.replace(marker, `${helperBlock}${marker}`);
  }

  text = replaceFunction(
    text,
    "salesRecommendation",
    `function salesRecommendation(result: CompareIntelligenceResult | null) {
  const status = result?.wyrestorm?.matchStatus;
  const candidate = topCandidate(result);
  const provisional = isProvisionalMatch(result);

  if (status === "candidate_match" && candidate?.sku && provisional) {
    return \`Treat \${candidate.sku} as a provisional same-role starting point only. Add a product page or datasheet text before expanding to other WyreStorm families or quoting.\`;
  }

  if (status === "candidate_match" && candidate?.sku) {
    return \`Position \${candidate.sku} first. Treat this as the leading WyreStorm option, then confirm distance, signal format, USB/audio/control needs, and any project-specific constraints before quoting.\`;
  }

  if (status === "candidate_match") {
    return "Wingman found a credible WyreStorm option. Use it as the starting point, then confirm the customer requirement before committing.";
  }

  if (status === "no_genuine_match") {
    return "Do not force a WyreStorm comparison. Use this result to explain that the competitor product may sit outside the best WyreStorm fit, or that more detail is needed.";
  }

  if (status === "no_wyrestorm_category") {
    return "This appears to be a product type WyreStorm does not directly replace. Use the product facts to understand the opportunity and look for related attachment sales.";
  }

  return result?.wyrestorm?.message || "Add more product detail before positioning a WyreStorm option.";
}`
  );

  text = replaceFunction(
    text,
    "resultHeadline",
    `function resultHeadline(result: CompareIntelligenceResult | null) {
  const candidate = topCandidate(result);
  const status = result?.wyrestorm?.matchStatus;

  if (status === "candidate_match" && candidate?.sku && isProvisionalMatch(result)) {
    return \`\${candidate.sku} is the provisional same-role option\`;
  }

  if (status === "candidate_match" && candidate?.sku) {
    return \`\${candidate.sku} is the leading WyreStorm option\`;
  }

  if (status === "candidate_match") {
    return "Credible WyreStorm option found";
  }

  if (status === "no_genuine_match") {
    return "No strong WyreStorm alternative found";
  }

  if (status === "no_wyrestorm_category") {
    return "No direct WyreStorm product area";
  }

  return "Need more product detail before recommending";
}`
  );

  text = replaceFunction(
    text,
    "candidateFit",
    `function candidateFit(candidate: Candidate | null, index = 0, result: CompareIntelligenceResult | null = null) {
  const score = Number(candidate?.score || 0);
  const provisional = isProvisionalMatch(result);
  const reasons = (candidate?.reasons || []).map((reason) => reason.toLowerCase());
  const hasDirectLanguage = reasons.some((reason) =>
    reason.includes("same") ||
    reason.includes("direct") ||
    reason.includes("lead option") ||
    reason.includes("required match"),
  );
  const hasRelatedLanguage = reasons.some((reason) =>
    reason.includes("related") ||
    reason.includes("not like-for-like") ||
    reason.includes("subject to") ||
    reason.includes("confirm"),
  );

  if (!candidate) {
    return {
      label: "No fit",
      summary: "No WyreStorm product should be positioned from the current evidence.",
      className: "border-slate-400/20 bg-slate-400/10 text-slate-200",
    };
  }

  if (provisional) {
    return {
      label: "Provisional same-role fit",
      summary: "Correct endpoint role, but verified product facts are limited. Add a product page or datasheet before quoting or expanding the shortlist.",
      className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    };
  }

  if (score >= 85 && (index === 0 || hasDirectLanguage)) {
    return {
      label: "Good fit",
      summary: "Use as the lead WyreStorm position, then confirm the final project details before quoting.",
      className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    };
  }

  if (score >= 70) {
    return {
      label: "Good fit with checks",
      summary: "Technically close, but confirm feature parity, package contents, signal standard, distance and control needs.",
      className: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
    };
  }

  if (score >= 50 || hasRelatedLanguage) {
    return {
      label: "Indifferent / conditional fit",
      summary: "Related product area, but not a like-for-like replacement. Use only if the customer requirement is narrower or has changed.",
      className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
    };
  }

  return {
    label: "Poor fit",
    summary: "Do not position this as a direct alternative unless more evidence changes the requirement.",
    className: "border-red-300/30 bg-red-300/10 text-red-100",
  };
}`
  );

  text = text.replace(/candidateFit\(candidate, 0\)/g, "candidateFit(candidate, 0, result)");
  text = text.replace(/candidateFit\(item, index\)/g, "candidateFit(item, index, result)");

  text = text.replace(
    `<div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                          Competitor overview
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {competitorOverviewText(result)}
                        </p>
                      </div>

                      `,
    ""
  );

  save(relative, text);
}

patchEngine();
patchComparePage();

console.log("");
console.log("AVoIP candidate noise reduced and provisional UI wording installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}