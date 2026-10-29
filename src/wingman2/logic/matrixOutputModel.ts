export type MatrixOutputRole =
  | "routed_matrix_output"
  | "hdbaset_zone_output"
  | "mirrored_parallel_output"
  | "local_monitor_output"
  | "loop_output"
  | "preview_output"
  | "auxiliary_output"
  | "unknown_output";

export type MatrixOutputSignalType =
  | "HDMI"
  | "HDBaseT"
  | "SDI"
  | "USB-C"
  | "IP"
  | "Fibre"
  | "Unknown";

export interface MatrixPhysicalOutputGroup {
  role: MatrixOutputRole;
  signalType: MatrixOutputSignalType;
  count: number;
  independentlyRoutable: boolean;
  countsTowardMatrixSize: boolean;
  evidence: string;
}

export interface MatrixOutputTopology {
  sku: string;
  routedInputCount: number | null;
  routedOutputCount: number | null;
  routedOutputTypes: readonly MatrixOutputSignalType[];

  mirroredOutputCount: number;
  mirroredOutputTypes: readonly MatrixOutputSignalType[];

  loopOutputCount: number;
  loopOutputTypes: readonly MatrixOutputSignalType[];

  localMonitorOutputCount: number;
  auxOutputCount: number;
  previewOutputCount: number;

  physicalOutputs: readonly MatrixPhysicalOutputGroup[];

  independentRoutingConfirmed: boolean;
  matrixSizeConfidence: "confirmed" | "inferred" | "needs-review";
  warnings: readonly string[];
  compareNotes: readonly string[];
}

export interface MatrixOutputClassificationInput {
  sku: string;
  name?: string;
  title?: string;
  family?: string;
  category?: string;
  description?: string;
  summary?: string;
  specsText?: string;
  inputCount?: number | string | null;
  outputCount?: number | string | null;
  inputs?: number | string | null;
  outputs?: number | string | null;
}

function normaliseText(value: MatrixOutputClassificationInput): string {
  return [
    value.sku,
    value.name,
    value.title,
    value.family,
    value.category,
    value.description,
    value.summary,
    value.specsText,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseSku(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "-");
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const match = String(value ?? "").match(/\d+/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstKnownCount(values: readonly unknown[]): number | null {
  for (const value of values) {
    const parsed = parseNumber(value);

    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function countFromToken(value: string): number | null {
  const numeric = parseNumber(value);

  if (numeric !== null) {
    return numeric;
  }

  const wordCounts: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    sixteen: 16,
  };

  return wordCounts[value.toLowerCase()] ?? null;
}

function extractMirroredOutputCount(text: string): number | null {
  const patterns = [
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|sixteen)\s*x?\s+(?:additional\s+)?(?:mirrored|parallel|duplicate|duplicated)\s+(?:hdmi\s+)?(?:out(?:put)?s?)?\b/i,
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|sixteen)\s*x?\s+(?:hdmi\s+)?(?:out(?:put)?s?)?\s+(?:which\s+are\s+)?(?:mirrored|parallel|duplicate|duplicated)\b/i,
    /\b(?:mirrored|parallel|duplicate|duplicated)\s+(?:hdmi\s+)?(?:out(?:put)?s?)?\s*(?:x|:|-)?\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|sixteen)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) continue;

    const count = countFromToken(match[1]);

    if (count !== null) {
      return count;
    }
  }

  return null;
}

function extractMatrixSize(text: string, sku: string): { inputs: number | null; outputs: number | null; evidence: string } {
  const combined = `${sku} ${text}`;

  const patterns = [
    /(\d{1,2})\s*[xX×]\s*(\d{1,2})/,
    /(\d{1,2})\s+by\s+(\d{1,2})/i,
    /(\d{1,2})\s*in(?:put)?s?\s*(?:\/|and|to|-)\s*(\d{1,2})\s*out(?:put)?s?/i,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);

    if (match) {
      return {
        inputs: Number(match[1]),
        outputs: Number(match[2]),
        evidence: match[0],
      };
    }
  }

  const skuMatch = sku.match(/(?:MXV|MX|SW)-?(\d{2})(\d{2})/i);

  if (skuMatch) {
    return {
      inputs: Number(skuMatch[1]),
      outputs: Number(skuMatch[2]),
      evidence: "SKU pattern",
    };
  }

  return {
    inputs: null,
    outputs: null,
    evidence: "No matrix size evidence",
  };
}

function signalTypeFromEvidence(evidence: string): MatrixOutputSignalType {
  const text = evidence.toLowerCase();

  if (text.includes("hdbaset") || text.includes("hdbase t") || text.includes("hdbt")) {
    return "HDBaseT";
  }

  if (text.includes("hdmi")) {
    return "HDMI";
  }

  if (text.includes("sdi")) {
    return "SDI";
  }

  if (text.includes("usb-c") || text.includes("usbc")) {
    return "USB-C";
  }

  if (text.includes("fibre") || text.includes("fiber")) {
    return "Fibre";
  }

  if (text.includes("ip") || text.includes("avoip") || text.includes("networkhd")) {
    return "IP";
  }

  return "Unknown";
}

function unique<T>(items: readonly T[]): readonly T[] {
  return Array.from(new Set(items));
}

function addOutputGroup(
  groups: MatrixPhysicalOutputGroup[],
  role: MatrixOutputRole,
  signalType: MatrixOutputSignalType,
  count: number,
  independentlyRoutable: boolean,
  evidence: string,
): void {
  if (!Number.isFinite(count) || count <= 0) {
    return;
  }

  groups.push({
    role,
    signalType,
    count,
    independentlyRoutable,
    countsTowardMatrixSize: independentlyRoutable && (role === "routed_matrix_output" || role === "hdbaset_zone_output"),
    evidence,
  });
}
