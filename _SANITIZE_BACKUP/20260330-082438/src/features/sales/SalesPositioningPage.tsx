import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  generateRecommendation,
  type DiscoverySnapshot,
  type RecommendationResult,
} from "@/features/recommendation/wingmanRecommendationEngine";

const FALLBACK_DISCOVERY: DiscoverySnapshot = {
  projectName: "No active project selected",
  projectId: "Not set",
  application: "General AV distribution",
  roomType: "Meeting space",
  displayCount: 1,
  sourceCount: 1,
  maxDistanceMeters: 10,
  usbRequired: false,
  controlRequired: false,
  audioRequired: false,
  notes: "",
};

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return "";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return ["true", "yes", "y", "required", "1", "enabled"].includes(v);
  }
  return false;
}

function parseJsonSafe(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function getFirstRecordCandidate(input: unknown): Record<string, unknown> | null {
  const direct = asRecord(input);
  if (direct) return direct;

  if (Array.isArray(input)) {
    for (const item of input) {
      const found = asRecord(item);
      if (found) return found;
    }
  }

  return null;
}

function findNestedRecord(root: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const direct = getFirstRecordCandidate(root[key]);
    if (direct) return direct;
  }

  for (const value of Object.values(root)) {
    const rec = asRecord(value);
    if (!rec) continue;

    for (const key of keys) {
      const nested = getFirstRecordCandidate(rec[key]);
      if (nested) return nested;
    }
  }

  return null;
}

function readAllLocalStorageRecords(): Record<string, unknown>[] {
  if (typeof window === "undefined") return [];

  const records: Record<string, unknown>[] = [];

  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key) continue;

    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    const parsed = parseJsonSafe(raw);
    const rec = asRecord(parsed);

    if (rec) {
      records.push(rec);
    }
  }

  return records;
}

function extractDiscoverySnapshot(): DiscoverySnapshot {
  const records = readAllLocalStorageRecords();

  let bestProject: Record<string, unknown> | null = null;
  let bestDiscovery: Record<string, unknown> | null = null;

  for (const record of records) {
    const projectCandidate =
      findNestedRecord(record, ["activeProject", "project", "currentProject"]) ??
      (toText(record["name"]) || toText(record["projectName"]) ? record : null);

    if (!bestProject && projectCandidate) {
      bestProject = projectCandidate;
    }

    const discoveryCandidate =
      findNestedRecord(record, [
        "discovery",
        "discoveryAnswers",
        "discoveryData",
        "brief",
        "wizard",
        "guidedProject",
      ]) ?? null;

    if (!bestDiscovery && discoveryCandidate) {
      bestDiscovery = discoveryCandidate;
    }
  }

  const project = bestProject ?? {};
  const discovery = bestDiscovery ?? project;

  return {
    projectName:
      toText(project["name"]) ||
      toText(project["projectName"]) ||
      toText(discovery["projectName"]) ||
      FALLBACK_DISCOVERY.projectName,
    projectId:
      toText(project["id"]) ||
      toText(project["projectId"]) ||
      FALLBACK_DISCOVERY.projectId,
    application:
      toText(discovery["application"]) ||
      toText(discovery["applicationType"]) ||
      toText(discovery["useCase"]) ||
      toText(discovery["roomPurpose"]) ||
      FALLBACK_DISCOVERY.application,
    roomType:
      toText(discovery["roomType"]) ||
      toText(discovery["spaceType"]) ||
      toText(discovery["roomCategory"]) ||
      FALLBACK_DISCOVERY.roomType,
    displayCount:
      toNumber(discovery["displayCount"], 0) ||
      toNumber(discovery["displays"], 0) ||
      toNumber(discovery["screenCount"], 0) ||
      FALLBACK_DISCOVERY.displayCount,
    sourceCount:
      toNumber(discovery["sourceCount"], 0) ||
      toNumber(discovery["sources"], 0) ||
      toNumber(discovery["inputCount"], 0) ||
      FALLBACK_DISCOVERY.sourceCount,
    maxDistanceMeters:
      toNumber(discovery["maxDistanceMeters"], 0) ||
      toNumber(discovery["distanceMeters"], 0) ||
      toNumber(discovery["signalDistance"], 0) ||
      toNumber(discovery["longestRun"], 0) ||
      FALLBACK_DISCOVERY.maxDistanceMeters,
    usbRequired:
      toBoolean(discovery["usbRequired"]) ||
      toBoolean(discovery["usbNeeds"]) ||
      toBoolean(discovery["usb"]),
    controlRequired:
      toBoolean(discovery["controlRequired"]) ||
      toBoolean(discovery["controlNeeds"]) ||
      toBoolean(discovery["control"]),
    audioRequired:
      toBoolean(discovery["audioRequired"]) ||
      toBoolean(discovery["audioNeeds"]) ||
      toBoolean(discovery["audio"]),
    notes:
      toText(discovery["notes"]) ||
      toText(discovery["projectNotes"]) ||
      toText(discovery["brief"]) ||
      "",
  };
}

export default function SalesPositioningPage() {
  const [discovery, setDiscovery] = useState<DiscoverySnapshot>(FALLBACK_DISCOVERY);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDiscovery(extractDiscoverySnapshot());
  }, []);

  const recommendation: RecommendationResult = useMemo(
    () => generateRecommendation(discovery),
    [discovery]
  );

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(recommendation.proposalSummary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <div style={stack10Style}>
          <div style={eyebrowStyle}>Recommendation Engine</div>
          <h1 style={heroTitleStyle}>Discovery to architecture and tiered BOM</h1>
          <p style={heroTextStyle}>
            This page converts discovery answers into a rules-based architecture recommendation,
            suggested WyreStorm product families and tiered BOM guidance.
          </p>
        </div>
      </section>

      <section style={summaryGridStyle}>
        <div style={panelStyle}>
          <div style={sectionLabelStyle}>Project</div>
          <div style={sectionValueStyle}>{discovery.projectName}</div>
        </div>
        <div style={panelStyle}>
          <div style={sectionLabelStyle}>Application</div>
          <div style={sectionValueStyle}>{discovery.application}</div>
        </div>
        <div style={panelStyle}>
          <div style={sectionLabelStyle}>Room Type</div>
          <div style={sectionValueStyle}>{discovery.roomType}</div>
        </div>
        <div style={panelStyle}>
          <div style={sectionLabelStyle}>Recommended Tier</div>
          <div style={tierPillStyle(recommendation.tier)}>{recommendation.tier}</div>
        </div>
      </section>

      <section style={twoColumnStyle}>
        <div style={leftColumnStyle}>
          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Discovery Summary</div>
            <div style={factsGridStyle}>
              <div style={factCardStyle}>
                <div style={factLabelStyle}>Displays</div>
                <div style={factValueStyle}>{discovery.displayCount}</div>
              </div>
              <div style={factCardStyle}>
                <div style={factLabelStyle}>Sources</div>
                <div style={factValueStyle}>{discovery.sourceCount}</div>
              </div>
              <div style={factCardStyle}>
                <div style={factLabelStyle}>Longest Run</div>
                <div style={factValueStyle}>{discovery.maxDistanceMeters}m</div>
              </div>
              <div style={factCardStyle}>
                <div style={factLabelStyle}>USB</div>
                <div style={factValueStyle}>{discovery.usbRequired ? "Yes" : "No"}</div>
              </div>
              <div style={factCardStyle}>
                <div style={factLabelStyle}>Control</div>
                <div style={factValueStyle}>{discovery.controlRequired ? "Yes" : "No"}</div>
              </div>
              <div style={factCardStyle}>
                <div style={factLabelStyle}>Audio</div>
                <div style={factValueStyle}>{discovery.audioRequired ? "Yes" : "No"}</div>
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Recommended Architecture</div>
            <div style={sectionValueStyle}>{recommendation.architecture}</div>
            <div style={bodyTextStyle}>{recommendation.architectureReason}</div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Tier Guidance</div>
            <div style={bodyTextStyle}>{recommendation.tierReason}</div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Tiered BOM Guidance</div>
            <div style={listWrapStyle}>
              {recommendation.tieredBom.map((item) => (
                <div key={item.role + item.guidance} style={bulletRowStyle}>
                  <div style={bulletDotStyle}>•</div>
                  <div style={listTextStyle}>
                    <strong>{item.tier}</strong> — {item.role}: {item.guidance}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Proposal Summary</div>
            <textarea style={textAreaStyle} value={recommendation.proposalSummary} readOnly />
            <div style={buttonRowStyle}>
              <button type="button" style={primaryButtonStyle} onClick={handleCopy}>
                {copied ? "Copied" : "Copy Summary"}
              </button>
            </div>
          </section>
        </div>

        <div style={rightColumnStyle}>
          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Recommended WyreStorm Families</div>
            <div style={listWrapStyle}>
              {recommendation.recommendedFamilies.map((item) => (
                <div key={item.family + item.priority} style={familyCardStyle}>
                  <div style={familyHeaderStyle}>
                    <div style={familyNameStyle}>{item.family}</div>
                    <div style={priorityPillStyle(item.priority)}>{item.priority}</div>
                  </div>
                  <div style={bodyTextStyle}>{item.rationale}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={guruPanelStyle}>
            <div style={guruIconStyle}>G</div>
            <div style={stack6Style}>
              <div style={sectionTitleStyle}>Wingman Guru</div>
              <div style={bodyTextStyle}>
                This recommendation engine is rules-based first. Once your product and match data mature,
                the same output can drive product selection, BOM assembly and proposal text automatically.
              </div>
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Checks Before Issue</div>
            <div style={listWrapStyle}>
              {recommendation.risks.map((item) => (
                <div key={item} style={bulletRowStyle}>
                  <div style={bulletDotStyle}>•</div>
                  <div style={listTextStyle}>{item}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={panelStyle}>
            <div style={sectionTitleStyle}>Next Steps</div>
            <div style={listWrapStyle}>
              {recommendation.nextSteps.map((item) => (
                <div key={item} style={bulletRowStyle}>
                  <div style={bulletDotStyle}>•</div>
                  <div style={listTextStyle}>{item}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  display: "grid",
  gap: 20,
  padding: 24,
  width: "100%",
  maxWidth: 1480,
  margin: "0 auto",
};

const heroStyle: CSSProperties = {
  padding: 24,
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(15,23,42,0.94), rgba(8,15,28,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
};

const summaryGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const twoColumnStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 1fr)",
  gap: 20,
  alignItems: "start",
};

const leftColumnStyle: CSSProperties = {
  display: "grid",
  gap: 20,
  minWidth: 0,
};

const rightColumnStyle: CSSProperties = {
  display: "grid",
  gap: 20,
  minWidth: 0,
};

const panelStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: 20,
  borderRadius: 18,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const guruPanelStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "56px 1fr",
  gap: 14,
  alignItems: "start",
  padding: 20,
  borderRadius: 18,
  background: "linear-gradient(135deg, rgba(249,115,22,0.18), rgba(15,23,42,0.96))",
  border: "1px solid rgba(249,115,22,0.24)",
};

const factsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

const factCardStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const familyCardStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.06)",
};

const familyHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const familyNameStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 800,
};

function priorityPillStyle(priority: "primary" | "secondary"): CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#ffffff",
    background: priority === "primary"
      ? "rgba(249,115,22,0.24)"
      : "rgba(255,255,255,0.10)",
    border: priority === "primary"
      ? "1px solid rgba(249,115,22,0.34)"
      : "1px solid rgba(255,255,255,0.12)",
  };
}

const factLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.62)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const factValueStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 800,
};

const stack10Style: CSSProperties = {
  display: "grid",
  gap: 10,
};

const stack6Style: CSSProperties = {
  display: "grid",
  gap: 6,
};

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.64)",
};

const heroTitleStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: 32,
  fontWeight: 800,
  lineHeight: 1.08,
  margin: 0,
};

const heroTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.86)",
  fontSize: 15,
  lineHeight: 1.6,
  margin: 0,
  maxWidth: 900,
};

const sectionLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.62)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

const sectionValueStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 800,
};

const sectionTitleStyle: CSSProperties = {
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.2,
};

const bodyTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  fontSize: 14,
  lineHeight: 1.65,
};

const listWrapStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const bulletRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "16px 1fr",
  gap: 8,
  alignItems: "start",
};

const bulletDotStyle: CSSProperties = {
  color: "#fb923c",
  fontSize: 16,
  lineHeight: 1.2,
};

const listTextStyle: CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  fontSize: 14,
  lineHeight: 1.6,
};

const textAreaStyle: CSSProperties = {
  width: "100%",
  minHeight: 260,
  resize: "vertical",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(5,10,20,0.8)",
  color: "#ffffff",
  padding: 14,
  fontSize: 13,
  lineHeight: 1.55,
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const primaryButtonStyle: CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
  color: "#ffffff",
  fontWeight: 800,
  cursor: "pointer",
};

function tierPillStyle(tier: "Bronze" | "Silver" | "Gold"): CSSProperties {
  const bg =
    tier === "Bronze"
      ? "rgba(120,113,108,0.30)"
      : tier === "Silver"
      ? "rgba(148,163,184,0.26)"
      : "rgba(249,115,22,0.24)";

  const border =
    tier === "Bronze"
      ? "1px solid rgba(168,162,158,0.32)"
      : tier === "Silver"
      ? "1px solid rgba(148,163,184,0.32)"
      : "1px solid rgba(249,115,22,0.34)";

  return {
    display: "inline-flex",
    width: "fit-content",
    padding: "8px 12px",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 800,
    background: bg,
    border,
  };
}

const guruIconStyle: CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 16,
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(135deg, #fb923c 0%, #ea580c 100%)",
  color: "#ffffff",
  fontSize: 22,
  fontWeight: 800,
};