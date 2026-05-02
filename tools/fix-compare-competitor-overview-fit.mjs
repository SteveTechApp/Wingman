import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-competitor-overview-fit-${stamp}`);
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

const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
let text = read(relative);

if (!text) {
  throw new Error(`Missing ${relative}`);
}

const helperBlock = `
function factLabel(row: SpecRow) {
  const labels: Record<string, string> = {
    hdmi: "HDMI",
    hdbaset: "HDBaseT",
    hdmiMirrored: "Mirrored HDMI",
    rs232: "RS-232",
    ir: "IR",
    lan: "LAN",
    relay: "Relay",
    gpio: "GPIO",
    hdcp: "HDCP",
    edid: "EDID",
    webUi: "Web UI",
    hdbasetExtension: "HDBaseT extension",
    audioDeEmbedding: "Audio de-embedding",
    analogueOutput: "Analogue audio out",
    balancedOutput: "Balanced audio out",
  };

  return labels[row.key] || row.key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function factPriority(row: SpecRow) {
  const key = row.key.toLowerCase();
  const group = row.group.toLowerCase();

  if (group === "videoinputs") return 10;
  if (group === "videooutputs") return 20;
  if (key === "hdbasetextension") return 30;
  if (group === "control") return 40;
  if (key === "hdcp" || key === "edid") return 50;
  if (group === "audio") return 60;
  if (group === "usb") return 70;
  if (group === "features") return 80;

  return 100;
}

function competitorOverviewText(result: CompareIntelligenceResult | null) {
  const productType = displaySafe(
    result?.competitor?.purposeLabel || result?.competitor?.categoryLabel,
    "this competitor product",
  );

  const rows = specRows(result)
    .filter((row) => row.value !== "false" && row.value !== "No")
    .sort((a, b) => factPriority(a) - factPriority(b))
    .slice(0, 7);

  if (!rows.length) {
    return \`Appears to be \${productType}. Wingman has not found enough verified facts yet, so the match should be treated as provisional.\`;
  }

  const facts = rows.map((row) => \`\${factLabel(row)}: \${row.value}\`).join("; ");

  return \`Appears to be \${productType}. Verified headline facts: \${facts}.\`;
}

function candidateFit(candidate: Candidate | null, index = 0) {
  const score = Number(candidate?.score || 0);
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
}

function matchOverviewText(result: CompareIntelligenceResult | null) {
  const candidate = topCandidate(result);
  const fit = candidateFit(candidate, 0);

  if (!candidate) {
    return fit.summary;
  }

  return \`\${fit.label}: \${fit.summary}\`;
}
`;

if (!text.includes("function competitorOverviewText")) {
  const marker = "function ComparePage() {";

  if (!text.includes(marker)) {
    throw new Error("Could not find function ComparePage() marker.");
  }

  text = text.replace(marker, `${helperBlock}\n${marker}`);
}

if (!text.includes("Competitor overview")) {
  const confidenceBlock = `<p className="mt-2 text-sm opacity-85">
                    Wingman confidence: {percent(result.competitor?.categoryConfidence)}
                  </p>`;

  const overviewBlock = `<p className="mt-2 text-sm opacity-85">
                    Wingman confidence: {percent(result.competitor?.categoryConfidence)}
                  </p>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-75">
                      Competitor overview
                    </p>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      {competitorOverviewText(result)}
                    </p>
                    <p className="mt-3 text-sm font-semibold opacity-95">
                      {matchOverviewText(result)}
                    </p>
                  </div>`;

  if (!text.includes(confidenceBlock)) {
    throw new Error("Could not find the competitor confidence block for overview insertion.");
  }

  text = text.replace(confidenceBlock, overviewBlock);
}

if (!text.includes("candidateFit(item, index)")) {
  const roleBlock = `{item.candidatePurpose ? (
                              <p className="mt-2 text-xs font-semibold text-slate-400">
                                Role: {item.candidatePurpose}
                              </p>
                            ) : null}`;

  const fitBlock = `{item.candidatePurpose ? (
                              <p className="mt-2 text-xs font-semibold text-slate-400">
                                Role: {item.candidatePurpose}
                              </p>
                            ) : null}

                            {(() => {
                              const fit = candidateFit(item, index);

                              return (
                                <div className={\`mt-3 rounded-2xl border px-3 py-2 text-xs \${fit.className}\`}>
                                  <p className="font-black">{fit.label}</p>
                                  <p className="mt-1 leading-5 opacity-90">{fit.summary}</p>
                                </div>
                              );
                            })()}`;

  if (!text.includes(roleBlock)) {
    throw new Error("Could not find candidate role block for fit insertion.");
  }

  text = text.replace(roleBlock, fitBlock);
}

save(relative, text);

console.log("");
console.log("Competitor overview and fit-quality display installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}