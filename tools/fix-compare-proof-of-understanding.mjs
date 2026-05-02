import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const backupRoot = path.join(repoRoot, "_RECOVERY", `compare-proof-of-understanding-${stamp}`);
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
  const re = new RegExp(`function\\s+${functionName}\\s*\\(`);
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

function insertBeforeFunction(text, functionName, block, marker) {
  if (text.includes(marker)) {
    return text;
  }

  const bounds = functionBounds(text, functionName);

  if (!bounds) {
    throw new Error(`Could not find function ${functionName}`);
  }

  return text.slice(0, bounds.start) + block + "\n" + text.slice(bounds.start);
}

const relative = path.join("src", "wingman2", "pages", "ComparePage.tsx");
let text = read(relative);

if (!text) {
  throw new Error(`Missing ${relative}`);
}

const helperBlock = `
function resultQueryValue(result: CompareIntelligenceResult | null, key: "brand" | "sku" | "productName") {
  const query = (result as { query?: Record<string, unknown> } | null)?.query || {};
  const competitor = (result as { competitor?: Record<string, unknown> } | null)?.competitor || {};

  return displaySafe(query[key] || competitor[key]);
}

function competitorIdentityLine(result: CompareIntelligenceResult | null) {
  const brand = resultQueryValue(result, "brand");
  const sku = resultQueryValue(result, "sku");
  const productName = resultQueryValue(result, "productName");

  const identity = [brand, sku].filter(Boolean).join(" ");

  if (identity && productName) {
    return \`\${identity} - \${productName}\`;
  }

  return identity || productName || "Competitor product";
}

function competitorUnderstandingConfidence(result: CompareIntelligenceResult | null) {
  const confidence = result?.competitor?.categoryConfidence || 0;
  const rows = specRows(result);
  const hasVerifiedFacts = rows.length > 0;

  if (confidence >= 0.8 && hasVerifiedFacts) {
    return {
      label: "High confidence",
      className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
      text: "Wingman has a strong product-role identification and verified product facts."
    };
  }

  if (confidence >= 0.8) {
    return {
      label: "Strong role, limited facts",
      className: "border-amber-300/35 bg-amber-300/10 text-amber-100",
      text: "Wingman is confident about the product role, but detailed feature parity still needs product-page or datasheet evidence."
    };
  }

  if (confidence >= 0.5) {
    return {
      label: "Medium confidence",
      className: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
      text: "Wingman has a likely product family, but more evidence is needed before relying on the recommendation."
    };
  }

  return {
    label: "Low confidence",
    className: "border-red-300/30 bg-red-300/10 text-red-100",
    text: "Wingman does not yet have enough evidence to prove the competitor product role."
  };
}

function competitorUnderstandingReason(result: CompareIntelligenceResult | null) {
  const brand = resultQueryValue(result, "brand").toLowerCase();
  const sku = resultQueryValue(result, "sku").toLowerCase().replace(/\\s+/g, " ");
  const category = result?.competitor?.category || "";
  const role = result?.competitor?.purposeRole || "";
  const label = displaySafe(result?.competitor?.purposeLabel || result?.competitor?.categoryLabel);

  if (brand.includes("extron") && /\\bnav\\s*e\\s*\\d+/.test(sku)) {
    return "Extron NAV E model pattern identifies this as a source-side AVoIP encoder. It should be compared against TX/encoder products, not RX/decoder products.";
  }

  if (brand.includes("extron") && /\\bnav\\s*d\\s*\\d+/.test(sku)) {
    return "Extron NAV D model pattern identifies this as a display-side AVoIP decoder. It should be compared against RX/decoder products, not TX/encoder products.";
  }

  if ((brand.includes("blustream") || brand.includes("blu stream")) && /\\bc\\s*88\\s*cs\\b|\\bc88cs\\b/.test(sku)) {
    return "Blustream C88CS is treated as an 8x8 HDBaseT CSC matrix. The comparison should focus on HDBaseT matrix architecture, not multiview or simple HDMI output count.";
  }

  if ((brand.includes("blustream") || brand.includes("blu stream")) && /\\bpla\\s*88\\s*cs\\b|\\bpla88cs\\b/.test(sku)) {
    return "Blustream PLA88CS is treated as an 8x8 HDBaseT CSC matrix. The comparison should focus on HDBaseT matrix architecture and package features.";
  }

  if ((brand.includes("avpro") || brand.includes("av pro")) && /\\bac[-\\s]?ex/.test(sku)) {
    return "AVPro Edge AC-EX model pattern identifies this as an HDBaseT extender family product. The comparison must confirm TX/RX/kit role and HDBaseT generation before matching.";
  }

  if (category === "av_over_ip" && role === "encoder") {
    return "Wingman has identified the competitor as an AVoIP encoder/source-side endpoint. It should only be compared against WyreStorm encoder/TX or valid transceiver options.";
  }

  if (category === "av_over_ip" && role === "decoder") {
    return "Wingman has identified the competitor as an AVoIP decoder/display-side endpoint. It should only be compared against WyreStorm decoder/RX or valid transceiver options.";
  }

  if (category === "hdbaset_extender") {
    return "Wingman has identified an HDBaseT extender product. The important role check is whether it is a transmitter, receiver, or complete TX/RX kit.";
  }

  if (category === "matrix_switcher") {
    return "Wingman has identified a matrix/distribution product. The important checks are input count, output count, transport type, bandwidth and control/audio features.";
  }

  if (category === "video_wall_processor") {
    return "Wingman has identified a video wall product. This is separate from multiview: video wall products manage multiple displays, while multiview combines multiple sources onto one output.";
  }

  if (category === "multiview_processor") {
    return "Wingman has identified a multiview product. Multiview means multiple sources composed onto one output, not simply multiple HDMI outputs.";
  }

  if (label) {
    return \`Wingman has identified this as \${label}. The match should remain provisional until the product role and key feature facts are confirmed.\`;
  }

  return "Wingman has not yet proved the competitor product role. Add a product page, datasheet text, or more exact model detail.";
}

function competitorUnderstandingChecks(result: CompareIntelligenceResult | null) {
  const category = result?.competitor?.category || "";
  const role = result?.competitor?.purposeRole || "";

  if (category === "av_over_ip") {
    if (role === "encoder") {
      return [
        "Source-side endpoint: video enters the network here.",
        "Do not compare with RX/decoder products.",
        "Confirm codec, latency, resolution and network family before quoting."
      ];
    }

    if (role === "decoder") {
      return [
        "Display-side endpoint: network video is converted back to HDMI here.",
        "Do not compare with TX/encoder products.",
        "Confirm codec, latency, resolution and whether multiview is actually required."
      ];
    }

    return [
      "Confirm whether this is encoder, decoder or transceiver.",
      "Do not match AVoIP products from port count alone."
    ];
  }

  if (category === "matrix_switcher") {
    return [
      "Confirm matrix size and transport type.",
      "Check mirrored outputs, receiver package, ARC/audio, IR/RS-232 and LAN behaviour.",
      "Do not treat matrix outputs as multiview."
    ];
  }

  if (category === "hdbaset_extender") {
    return [
      "Confirm TX, RX or complete kit.",
      "Confirm HDBaseT generation, distance, USB/audio/control and power method."
    ];
  }

  if (category === "video_wall_processor") {
    return [
      "Confirm display count, source count and wall layout.",
      "Do not treat video wall or matrix outputs as multiview unless single-output source composition is stated."
    ];
  }

  return [
    "Confirm exact product role.",
    "Confirm the feature facts before positioning a WyreStorm replacement."
  ];
}
`;

text = insertBeforeFunction(
  text,
  "function ComparePage",
  helperBlock,
  "function competitorUnderstandingReason"
);

if (!text.includes("Wingman understood this as")) {
  const anchor = `<div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">`;

  if (!text.includes(anchor)) {
    throw new Error("Could not find result detail grid anchor.");
  }

  const proofCard = `<div className="rounded-3xl border border-cyan-300/25 bg-cyan-300/10 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/80">
                      Wingman understood this as
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-white">
                      {competitorIdentityLine(result)}
                    </h2>
                    <p className="mt-2 text-lg font-bold text-cyan-50">
                      {displaySafe(result.competitor?.purposeLabel || result.competitor?.categoryLabel, "Product role not proved yet")}
                    </p>
                    <p className="mt-3 max-w-4xl text-sm leading-6 text-cyan-50/90">
                      {competitorUnderstandingReason(result)}
                    </p>
                  </div>

                  {(() => {
                    const confidence = competitorUnderstandingConfidence(result);

                    return (
                      <div className={\`rounded-2xl border px-4 py-3 text-sm font-semibold \${confidence.className}\`}>
                        <p className="font-black">{confidence.label}</p>
                        <p className="mt-1 max-w-xs leading-5 opacity-90">{confidence.text}</p>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {competitorUnderstandingChecks(result).map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold leading-5 text-cyan-50/90"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              ${anchor}`;

  text = text.replace(anchor, proofCard);
}

save(relative, text);

console.log("");
console.log("Competitor proof-of-understanding card installed.");
console.log(`Backup saved to: ${backupRoot}`);
console.log("");
console.log("Modified files:");

if (touched.length === 0) {
  console.log(" - No files changed.");
}

for (const file of [...new Set(touched)].sort()) {
  console.log(` - ${file}`);
}