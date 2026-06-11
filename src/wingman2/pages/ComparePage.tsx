import { useMemo, useState } from "react";

type Verdict = "GOOD MATCH" | "PARTIAL MATCH" | "NO MATCH";
type CheckStatus = "match" | "check" | "gap";

type ProductRecord = Record<string, unknown>;

type ProductCandidate = {
  sku: string;
  title: string;
  family: string;
  summary: string;
  score: number;
  reasons: string[];
  warnings: string[];
  rawText: string;
};

type CompetitorProfile = {
  manufacturer: string;
  sku: string;
  technology: string;
  role: string;
  inputCount: number | null;
  outputCount: number | null;
  confidence: "low" | "medium" | "high";
  keywords: string[];
  blockers: string[];
};

type FeatureCheck = {
  label: string;
  competitor: string;
  wyrestorm: string;
  status: CheckStatus;
};

const manufacturerOptions = [
  "Auto-detect where possible",
  "AMX",
  "Atlona",
  "AVPro Edge",
  "Blustream",
  "Crestron",
  "CYP",
  "Extron",
  "HDAnywhere",
  "Just Add Power",
  "Kramer",
  "Lightware",
  "SY",
  "ZeeVee"
];

const indexUrls = [
  "/product-intelligence-index.json",
  "/wingman/product-intelligence-index.json",
  "/data/product-intelligence-index.json",
  "/products.json"
];

const fallbackProducts: ProductRecord[] = [
  {
    sku: "MX-0808-KIT",
    title: "MX-0808-KIT",
    family: "Matrix",
    description: "WyreStorm 8x8 matrix kit direction. Use for contained matrix switching opportunities where fixed source-to-display routing is required."
  },
  {
    sku: "MX-1007-HYB",
    title: "MX-1007-HYB",
    family: "Hybrid Matrix / Presentation",
    description: "Hybrid meeting and teaching space direction with NetworkHD 500, HDBaseT 3.0, USB-C, HDMI, USB, amplifier and DSP workflow."
  },
  {
    sku: "NHD-120-TX / NHD-120-RX",
    title: "NetworkHD 100 Series",
    family: "AV-over-IP",
    description: "Cost-effective NetworkHD 100 AV-over-IP direction for flexible 4K distribution."
  },
  {
    sku: "NHD-500-TX / NHD-500-RX",
    title: "NetworkHD 500 Series",
    family: "AV-over-IP",
    description: "Premium 4K60 4:4:4 NetworkHD 500 AV-over-IP direction with strong USB support."
  },
  {
    sku: "NHD-600-TRX",
    title: "NetworkHD 600 Series",
    family: "10G AV-over-IP",
    description: "Highest-performance NetworkHD 600 10G AV-over-IP direction."
  },
  {
    sku: "SW-0206-VW",
    title: "SW-0206-VW",
    family: "Video Wall Processor",
    description: "Dedicated non-AVoIP video wall processor direction."
  },
  {
    sku: "NHD-0401-MV",
    title: "NHD-0401-MV",
    family: "Multiview",
    description: "NetworkHD 500 multiview processor direction."
  },
  {
    sku: "NHD-150-RX",
    title: "NHD-150-RX",
    family: "NetworkHD 100 Multiview",
    description: "NetworkHD 100 multiview decoder direction."
  }
];

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function upper(value: string): string {
  return normalise(value).toUpperCase();
}

function safeString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function readField(record: ProductRecord, fieldNames: string[]): string {
  for (const fieldName of fieldNames) {
    const direct = record[fieldName];
    const directValue = safeString(direct);
    if (directValue) {
      return directValue;
    }

    const lowerMatch = Object.keys(record).find((key) => key.toLowerCase() === fieldName.toLowerCase());
    if (lowerMatch) {
      const value = safeString(record[lowerMatch]);
      if (value) {
        return value;
      }
    }
  }

  return "";
}

function recordToText(record: ProductRecord): string {
  try {
    return JSON.stringify(record).toLowerCase();
  } catch {
    return "";
  }
}

function flattenProductRecords(input: unknown): ProductRecord[] {
  const found: ProductRecord[] = [];
  const seen = new Set<unknown>();

  function walk(value: unknown): void {
    if (!value || typeof value !== "object") {
      return;
    }

    if (seen.has(value)) {
      return;
    }

    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    const record = value as ProductRecord;
    const keys = Object.keys(record);
    const hasProductSignal = keys.some((key) => {
      const lowerKey = key.toLowerCase();
      return lowerKey === "sku" || lowerKey === "model" || lowerKey === "title" || lowerKey === "name" || lowerKey === "product";
    });

    const text = recordToText(record);
    const looksLikeWyreStormProduct =
      hasProductSignal &&
      (
        text.includes("wyrestorm") ||
        text.includes("networkhd") ||
        text.includes("nhd-") ||
        text.includes("mx-") ||
        text.includes("sw-") ||
        text.includes("ap0-") ||
        text.includes("apo-") ||
        text.includes("cam-")
      );

    if (looksLikeWyreStormProduct) {
      found.push(record);
    }

    for (const key of keys) {
      const child = record[key];
      if (child && typeof child === "object") {
        walk(child);
      }
    }
  }

  walk(input);
  return found;
}

function parseIoFromSku(sku: string): { inputCount: number | null; outputCount: number | null } {
  const clean = upper(sku);

  const explicit = clean.match(/(\d{1,2})\s*[X×]\s*(\d{1,2})/);
  if (explicit) {
    return {
      inputCount: Number(explicit[1]),
      outputCount: Number(explicit[2])
    };
  }

  const mxCompact = clean.match(/(?:MX|MATRIX)[-_ ]?(\d)(\d)(?:\D|$)/);
  if (mxCompact) {
    return {
      inputCount: Number(mxCompact[1]),
      outputCount: Number(mxCompact[2])
    };
  }

  const mxTwoDigit = clean.match(/MX[-_ ]?(\d{2})(\d{2})(?:\D|$)/);
  if (mxTwoDigit) {
    return {
      inputCount: Number(mxTwoDigit[1]),
      outputCount: Number(mxTwoDigit[2])
    };
  }

  return {
    inputCount: null,
    outputCount: null
  };
}

function detectManufacturer(sku: string, selectedManufacturer: string): string {
  if (selectedManufacturer !== "Auto-detect where possible") {
    return selectedManufacturer;
  }

  const clean = upper(sku);

  if (clean.startsWith("AC-") || clean.startsWith("AXION") || clean.includes("AVPRO")) {
    return "AVPro Edge";
  }

  if (clean.startsWith("IN") || clean.startsWith("DTP") || clean.startsWith("XTP") || clean.includes("EXTRON")) {
    return "Extron";
  }

  if (clean.startsWith("VS-") || clean.startsWith("TP-") || clean.includes("KRAMER")) {
    return "Kramer";
  }

  if (clean.includes("BLUSTREAM") || clean.startsWith("HEX") || clean.startsWith("HMXL")) {
    return "Blustream";
  }

  if (clean.includes("JAD") || clean.includes("J+P") || clean.includes("JUST ADD")) {
    return "Just Add Power";
  }

  return "Unknown";
}

function buildCompetitorProfile(skuInput: string, manufacturerInput: string): CompetitorProfile {
  const sku = upper(skuInput);
  const manufacturer = detectManufacturer(sku, manufacturerInput);
  const io = parseIoFromSku(sku);

  let technology = "unknown";
  let role = "unknown";
  const keywords: string[] = [];
  const blockers: string[] = [];

  if (sku.includes("MX") || sku.includes("MAT") || sku.includes("MATRIX")) {
    technology = "MATRIX";
    role = "matrix switching";
    keywords.push("matrix", "switching", "routing");
  }

  if (sku.includes("EX") || sku.includes("EXT") || sku.includes("HDBT") || sku.includes("TP")) {
    technology = technology === "MATRIX" ? "MATRIX / HDBASET" : "HDBASET / EXTENDER";
    role = technology.includes("MATRIX") ? "matrix switching" : "point-to-point extension";
    keywords.push("hdbaset", "extender", "transmitter", "receiver");
  }

  if (sku.includes("IP") || sku.includes("AIP") || sku.includes("JPEG") || sku.includes("SDVOE")) {
    technology = "AV-OVER-IP";
    role = "network AV distribution";
    keywords.push("networkhd", "av over ip", "av-over-ip", "encoder", "decoder");
  }

  if (sku.includes("MV") || sku.includes("MULTI")) {
    technology = "MULTIVIEW";
    role = "multiview processing";
    keywords.push("multiview", "multi-view");
  }

  if (sku.includes("VW") || sku.includes("WALL")) {
    technology = "VIDEO WALL";
    role = "video wall processing";
    keywords.push("video wall", "wall processor");
  }

  if (io.inputCount && io.outputCount) {
    keywords.push(`${io.inputCount}x${io.outputCount}`);
    keywords.push(`${io.inputCount} x ${io.outputCount}`);
    keywords.push(`${String(io.inputCount).padStart(2, "0")}${String(io.outputCount).padStart(2, "0")}`);
  }

  if (technology === "unknown") {
    blockers.push("Technology class could not be confirmed from the SKU alone.");
  }

  if (!io.inputCount && technology.includes("MATRIX")) {
    blockers.push("Matrix input/output count was not confidently detected.");
  }

  return {
    manufacturer,
    sku,
    technology,
    role,
    inputCount: io.inputCount,
    outputCount: io.outputCount,
    confidence: technology === "unknown" ? "low" : manufacturer === "Unknown" ? "medium" : "high",
    keywords,
    blockers
  };
}

async function fetchProductIndex(): Promise<{ records: ProductRecord[]; source: string; usedFallback: boolean }> {
  for (const url of indexUrls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const records = flattenProductRecords(payload);

      if (records.length > 0) {
        return {
          records,
          source: url,
          usedFallback: false
        };
      }
    } catch {
      // Try next possible local index path.
    }
  }

  return {
    records: fallbackProducts,
    source: "limited built-in fallback because local product index was not found",
    usedFallback: true
  };
}

function productFromRecord(record: ProductRecord): Omit<ProductCandidate, "score" | "reasons" | "warnings" | "rawText"> {
  const sku =
    readField(record, ["sku", "model", "productCode", "product_code", "id"]) ||
    readField(record, ["title", "name"]) ||
    "Unknown SKU";

  const title = readField(record, ["title", "name", "product", "displayName"]) || sku;
  const family = readField(record, ["family", "category", "series", "productFamily"]) || "WyreStorm product";
  const summary = readField(record, ["summary", "description", "shortDescription", "overview"]) || "No short summary available.";

  return {
    sku,
    title,
    family,
    summary
  };
}

function scoreProduct(record: ProductRecord, profile: CompetitorProfile): ProductCandidate {
  const extracted = productFromRecord(record);
  const rawText = recordToText(record);
  const skuText = upper(extracted.sku);
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  if (rawText.includes("cable") || rawText.includes("bracket") || rawText.includes("accessory")) {
    score -= 5;
    warnings.push("Accessory-like result; unlikely to be the lead replacement.");
  }

  for (const keyword of profile.keywords) {
    if (rawText.includes(keyword.toLowerCase())) {
      score += 3;
      reasons.push(`Matches keyword: ${keyword}`);
    }
  }

  if (profile.technology.includes("MATRIX")) {
    if (rawText.includes("matrix")) {
      score += 5;
      reasons.push("Same broad product class: matrix switching");
    }

    if (profile.inputCount && profile.outputCount) {
      const compact = `${String(profile.inputCount).padStart(2, "0")}${String(profile.outputCount).padStart(2, "0")}`;
      const readable = `${profile.inputCount}x${profile.outputCount}`;
      const spaced = `${profile.inputCount} x ${profile.outputCount}`;

      if (rawText.includes(compact) || rawText.includes(readable) || rawText.includes(spaced) || skuText.includes(compact)) {
        score += 7;
        reasons.push(`Likely matching I/O count: ${profile.inputCount}x${profile.outputCount}`);
      } else {
        warnings.push(`Verify I/O count against required ${profile.inputCount}x${profile.outputCount}.`);
      }
    }
  }

  if (profile.technology.includes("EXTENDER") || profile.technology.includes("HDBASET")) {
    if (rawText.includes("hdbaset") || rawText.includes("extender")) {
      score += 6;
      reasons.push("Same broad transport class: HDBaseT / extender");
    }
  }

  if (profile.technology.includes("AV-OVER-IP")) {
    if (rawText.includes("networkhd") || rawText.includes("av-over-ip") || rawText.includes("encoder") || rawText.includes("decoder")) {
      score += 6;
      reasons.push("Same broad technology class: AV-over-IP");
    }
  }

  if (profile.technology.includes("MULTIVIEW") && rawText.includes("multiview")) {
    score += 6;
    reasons.push("Same broad function: multiview");
  }

  if (profile.technology.includes("VIDEO WALL") && rawText.includes("video wall")) {
    score += 6;
    reasons.push("Same broad function: video wall processing");
  }

  if (score < 1 && rawText.includes("wyrestorm")) {
    score += 1;
  }

  return {
    ...extracted,
    score,
    reasons: Array.from(new Set(reasons)).slice(0, 5),
    warnings: Array.from(new Set(warnings)).slice(0, 5),
    rawText
  };
}

function getVerdict(topCandidate: ProductCandidate | null, profile: CompetitorProfile): Verdict {
  if (!topCandidate || topCandidate.score < 4) {
    return "NO MATCH";
  }

  const hasIoRequirement = Boolean(profile.inputCount && profile.outputCount);
  const hasIoMatch = topCandidate.reasons.some((reason) => reason.toLowerCase().includes("i/o count"));
  const strongClassMatch = topCandidate.score >= 8;

  if (topCandidate.score >= 13 && (!hasIoRequirement || hasIoMatch)) {
    return "GOOD MATCH";
  }

  if (strongClassMatch) {
    return "PARTIAL MATCH";
  }

  return "NO MATCH";
}

function buildFeatureChecks(profile: CompetitorProfile, topCandidate: ProductCandidate | null): FeatureCheck[] {
  if (!topCandidate) {
    return [
      {
        label: "Product class",
        competitor: profile.technology,
        wyrestorm: "No candidate found",
        status: "gap"
      }
    ];
  }

  const checks: FeatureCheck[] = [];

  const classMatch =
    topCandidate.reasons.some((reason) => reason.toLowerCase().includes("same broad")) ||
    topCandidate.rawText.includes(profile.technology.toLowerCase());

  checks.push({
    label: "Product purpose / class",
    competitor: profile.technology,
    wyrestorm: topCandidate.family,
    status: classMatch ? "match" : "check"
  });

  const ioRequired = Boolean(profile.inputCount && profile.outputCount);
  const ioMatch = topCandidate.reasons.some((reason) => reason.toLowerCase().includes("i/o count"));

  checks.push({
    label: "Input / output count",
    competitor: ioRequired ? `${profile.inputCount}x${profile.outputCount}` : "Not detected",
    wyrestorm: ioMatch ? "Likely match" : "Verify from datasheet",
    status: ioRequired ? ioMatch ? "match" : "check" : "check"
  });

  checks.push({
    label: "Signal / transport",
    competitor: profile.technology,
    wyrestorm: classMatch ? "Broadly aligned" : "Needs verification",
    status: classMatch ? "match" : "check"
  });

  checks.push({
    label: "USB / control / audio",
    competitor: "Unknown from SKU alone",
    wyrestorm: "Check feature-by-feature",
    status: "check"
  });

  checks.push({
    label: "Power / install dependencies",
    competitor: "Unknown from SKU alone",
    wyrestorm: "Check PSU, PoE/PoH, receivers, controller and network needs",
    status: "check"
  });

  return checks;
}

function statusLabel(status: CheckStatus): string {
  if (status === "match") {
    return "MATCH";
  }

  if (status === "gap") {
    return "GAP";
  }

  return "CHECK";
}

export function ComparePage() {
  const [competitorSku, setCompetitorSku] = useState("");
  const [manufacturer, setManufacturer] = useState("Auto-detect where possible");
  const [sourceContext, setSourceContext] = useState("");
  const [applicationContext, setApplicationContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [indexSource, setIndexSource] = useState("");
  const [usedFallback, setUsedFallback] = useState(false);
  const [profile, setProfile] = useState<CompetitorProfile | null>(null);
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [error, setError] = useState("");

  const canRun = competitorSku.trim().length >= 2;

  const topCandidate = candidates[0] ?? null;
  const verdict = useMemo(() => getVerdict(topCandidate, profile ?? buildCompetitorProfile("", manufacturer)), [topCandidate, profile, manufacturer]);
  const checks = useMemo(() => profile ? buildFeatureChecks(profile, topCandidate) : [], [profile, topCandidate]);

  async function runCompare(): Promise<void> {
    if (!canRun || loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextProfile = buildCompetitorProfile(competitorSku, manufacturer);
      const index = await fetchProductIndex();

      const scored = index.records
        .map((record) => scoreProduct(record, nextProfile))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setProfile(nextProfile);
      setIndexSource(index.source);
      setUsedFallback(index.usedFallback);
      setCandidates(scored);

      if (scored.length < 1) {
        setError("No credible WyreStorm candidate was found from the available local product data. Treat this as NO MATCH until product intelligence is improved.");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Compare failed unexpectedly.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter") {
      void runCompare();
    }
  }

  return (
    <div className="wm-compare-live">
      <section className="wm-compare-live-hero">
        <p className="wm-compare-kicker">Competitor replacement desk</p>
        <h1>Decide whether WyreStorm is a good, partial or no-match replacement.</h1>
        <p>
          Enter a competitor product, then review match evidence, blocking differences, verification points and
          customer-safe next actions.
        </p>
      </section>

      <section className="wm-compare-live-grid">
        <div className="wm-compare-input-card">
          <label className="wm-compare-field wm-compare-field-full">
            <span>Competitor product</span>
            <input
              autoComplete="off"
              onChange={(event) => setCompetitorSku(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Example: AC-MX-88, DTP2 T 211, VS-44H2A"
              value={competitorSku}
            />
          </label>

          <div className="wm-compare-two-fields">
            <label className="wm-compare-field">
              <span>Manufacturer</span>
              <select onChange={(event) => setManufacturer(event.target.value)} value={manufacturer}>
                {manufacturerOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="wm-compare-field">
              <span>Source/spec page</span>
              <input
                onChange={(event) => setSourceContext(event.target.value)}
                placeholder="Any page with product details or specifications"
                value={sourceContext}
              />
            </label>
          </div>

          <label className="wm-compare-field wm-compare-field-full">
            <span>Application context</span>
            <input
              onChange={(event) => setApplicationContext(event.target.value)}
              placeholder="Example: lecture theatre, meeting room, 4K video wall, AVoIP estate"
              value={applicationContext}
            />
          </label>

          <button
            className="wm-compare-run-button"
            disabled={!canRun || loading}
            onClick={() => void runCompare()}
            type="button"
          >
            {loading ? "Checking local product intelligence..." : "Find WyreStorm Alternatives"}
          </button>

          {!canRun && (
            <p className="wm-compare-inline-warning">Enter a competitor SKU to activate the comparison.</p>
          )}

          {error && <p className="wm-compare-error">{error}</p>}
        </div>

        <aside className="wm-compare-right-rail">
          <div className="wm-compare-check-card">
            <h2>What Wingman will check</h2>
            <ul>
              <li>Product purpose and technology class</li>
              <li>Manufacturer override or auto-detect</li>
              <li>Input/output role and capacity</li>
              <li>Signal, USB, audio, control and network differences</li>
              <li>Blocking gaps and verification points</li>
              <li>GOOD / PARTIAL / NO MATCH verdict</li>
            </ul>
          </div>

          <div className="wm-compare-live-card">
            <h2>Live interpretation</h2>
            {profile ? (
              <dl>
                <div>
                  <dt>Manufacturer used</dt>
                  <dd>{profile.manufacturer}</dd>
                </div>
                <div>
                  <dt>Technology</dt>
                  <dd>{profile.technology}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{profile.role}</dd>
                </div>
                <div>
                  <dt>I/O</dt>
                  <dd>{profile.inputCount && profile.outputCount ? `${profile.inputCount}x${profile.outputCount}` : "Not detected"}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{profile.confidence}</dd>
                </div>
              </dl>
            ) : (
              <p>Enter a competitor SKU and run the comparison.</p>
            )}
          </div>
        </aside>
      </section>

      {profile && (
        <section className="wm-compare-results">
          <div className={`wm-compare-verdict wm-compare-verdict-${verdict.toLowerCase().replace(/\s+/g, "-")}`}>
            <span>Verdict</span>
            <strong>{verdict}</strong>
            <p>
              {verdict === "GOOD MATCH"
                ? "The best WyreStorm candidate appears to match the main product class and core requirement. Still verify all feature details against datasheets before quoting."
                : verdict === "PARTIAL MATCH"
                  ? "A credible WyreStorm direction exists, but one or more features, I/O details or dependencies need checking before presenting it as an equivalent."
                  : "No safe direct WyreStorm match was found from the currently available product intelligence."}
            </p>
          </div>

          <div className="wm-compare-index-note">
            <strong>Product data source:</strong> {indexSource}
            {usedFallback && (
              <span>
                Local product index was not found, so Wingman used a limited built-in fallback. Run the product
                intelligence index generation before using this as a serious comparison.
              </span>
            )}
          </div>

          {topCandidate && (
            <div className="wm-compare-best-card">
              <div>
                <p className="wm-compare-kicker">Best WyreStorm candidate</p>
                <h2>{topCandidate.sku}</h2>
                <p>{topCandidate.title}</p>
                <p>{topCandidate.summary}</p>
              </div>
              <div>
                <span className="wm-compare-score">Score {topCandidate.score}</span>
              </div>
            </div>
          )}

          <div className="wm-compare-feature-grid">
            {checks.map((check) => (
              <div className={`wm-compare-feature wm-compare-feature-${check.status}`} key={check.label}>
                <span>{statusLabel(check.status)}</span>
                <strong>{check.label}</strong>
                <p><b>Competitor:</b> {check.competitor}</p>
                <p><b>WyreStorm:</b> {check.wyrestorm}</p>
              </div>
            ))}
          </div>

          <div className="wm-compare-candidate-grid">
            {candidates.length > 0 ? (
              candidates.map((candidate) => (
                <article className="wm-compare-candidate" key={`${candidate.sku}-${candidate.score}`}>
                  <div>
                    <p className="wm-compare-kicker">{candidate.family}</p>
                    <h3>{candidate.sku}</h3>
                    <p>{candidate.title}</p>
                  </div>

                  <div>
                    <strong>Why it appeared</strong>
                    {candidate.reasons.length > 0 ? (
                      <ul>
                        {candidate.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Low-confidence product direction only.</p>
                    )}
                  </div>

                  {candidate.warnings.length > 0 && (
                    <div>
                      <strong>Check before quoting</strong>
                      <ul>
                        {candidate.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="wm-compare-empty-results">
                <h3>No candidate found</h3>
                <p>
                  This should be treated as NO MATCH unless the product intelligence index is incomplete. Add better
                  product data before using this comparison with a customer.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default ComparePage;