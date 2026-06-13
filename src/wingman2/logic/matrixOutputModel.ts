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

export function classifyMatrixOutputTopology(input: MatrixOutputClassificationInput): MatrixOutputTopology {
  const sku = normaliseSku(input.sku);
  const rawText = normaliseText(input);
  const lowerText = rawText.toLowerCase();
  const warnings: string[] = [];
  const compareNotes: string[] = [];
  const physicalOutputs: MatrixPhysicalOutputGroup[] = [];

  const matrixSize = extractMatrixSize(rawText, sku);

  const hasMatrixSizeEvidence = matrixSize.inputs !== null && matrixSize.outputs !== null;
  const routedInputCount = hasMatrixSizeEvidence
    ? firstKnownCount([matrixSize.inputs, input.inputCount, input.inputs])
    : firstKnownCount([input.inputCount, input.inputs]);
  let routedOutputCount = hasMatrixSizeEvidence
    ? firstKnownCount([matrixSize.outputs, input.outputCount, input.outputs])
    : firstKnownCount([input.outputCount, input.outputs]);

  const hasHdbaset = /hdbaset|hdbase t|hdbt/i.test(rawText) || /^MXV-/i.test(sku);
  const hasMirrored = /mirror|mirrored|parallel|duplicate|duplicated/i.test(rawText);
  const hasLoop = /loop\s*out|loop-out|loopout|daisy\s*chain|cascade|cascad/i.test(rawText);
  const hasLocalMonitor = /local\s*(?:monitor|hdmi)|monitor\s*out|preview\s*out/i.test(rawText);
  const hasAux = /aux(?:iliary)?\s*out/i.test(rawText);

  const routedOutputType: MatrixOutputSignalType = hasHdbaset ? "HDBaseT" : signalTypeFromEvidence(rawText);

  if (routedOutputCount !== null) {
    addOutputGroup(
      physicalOutputs,
      hasHdbaset ? "hdbaset_zone_output" : "routed_matrix_output",
      routedOutputType,
      routedOutputCount,
      true,
      `Independent routed output count inferred from ${matrixSize.evidence}`,
    );
  }

  let mirroredOutputCount = 0;
  let loopOutputCount = 0;
  let localMonitorOutputCount = 0;
  let auxOutputCount = 0;
  let previewOutputCount = 0;

  if (hasMirrored) {
    const explicitMirroredOutputCount = extractMirroredOutputCount(rawText);
    mirroredOutputCount = explicitMirroredOutputCount ?? 0;

    if (explicitMirroredOutputCount === null) {
      warnings.push("Mirrored output wording detected but no explicit mirrored output count was found.");
    }

    addOutputGroup(
      physicalOutputs,
      "mirrored_parallel_output",
      "HDMI",
      mirroredOutputCount,
      false,
      "Mirrored/parallel output wording detected. Does not count towards matrix size.",
    );

    compareNotes.push("Mirrored HDMI outputs are captured as a feature and are not counted as independent matrix outputs.");
  }

  if (hasLoop) {
    loopOutputCount = 1;

    addOutputGroup(
      physicalOutputs,
      "loop_output",
      "HDMI",
      loopOutputCount,
      false,
      "Loop/daisy-chain/cascade wording detected. Does not count towards matrix size.",
    );

    compareNotes.push("Loop output captured as expansion/daisy-chain feature, not as an additional routed output.");
  }

  if (hasLocalMonitor) {
    localMonitorOutputCount = 1;

    addOutputGroup(
      physicalOutputs,
      "local_monitor_output",
      "HDMI",
      localMonitorOutputCount,
      false,
      "Local monitor/preview wording detected. Does not count towards matrix size unless independently routable evidence exists.",
    );
  }

  if (hasAux) {
    auxOutputCount = 1;

    addOutputGroup(
      physicalOutputs,
      "auxiliary_output",
      "HDMI",
      auxOutputCount,
      false,
      "Auxiliary output wording detected. Does not count towards matrix size unless independently routable evidence exists.",
    );
  }

  if (/preview\s*out/i.test(rawText)) {
    previewOutputCount = 1;

    addOutputGroup(
      physicalOutputs,
      "preview_output",
      "HDMI",
      previewOutputCount,
      false,
      "Preview output wording detected. Does not count towards matrix size unless independently routable evidence exists.",
    );
  }

  if (routedInputCount === null || routedOutputCount === null) {
    warnings.push("Matrix size could not be confirmed from structured input count/output count or SKU/text pattern.");
  }

  if (hasMirrored && routedOutputCount !== null) {
    warnings.push("Do not add mirrored HDMI outputs to routed output count.");
  }

  if (hasLoop) {
    warnings.push("Do not add loop outputs to routed output count.");
  }

  if (physicalOutputs.length === 0) {
    addOutputGroup(
      physicalOutputs,
      "unknown_output",
      "Unknown",
      routedOutputCount ?? 0,
      false,
      "No output topology evidence detected.",
    );
  }

  const routedOutputTypes = unique(
    physicalOutputs
      .filter((output) => output.countsTowardMatrixSize)
      .map((output) => output.signalType),
  );

  const mirroredOutputTypes = unique(
    physicalOutputs
      .filter((output) => output.role === "mirrored_parallel_output")
      .map((output) => output.signalType),
  );

  const loopOutputTypes = unique(
    physicalOutputs
      .filter((output) => output.role === "loop_output")
      .map((output) => output.signalType),
  );

  const independentRoutingConfirmed = routedInputCount !== null && routedOutputCount !== null;

  const matrixSizeConfidence = independentRoutingConfirmed
    ? matrixSize.evidence === "SKU pattern" ? "inferred" : "confirmed"
    : "needs-review";

  return {
    sku,
    routedInputCount,
    routedOutputCount,
    routedOutputTypes,
    mirroredOutputCount,
    mirroredOutputTypes,
    loopOutputCount,
    loopOutputTypes,
    localMonitorOutputCount,
    auxOutputCount,
    previewOutputCount,
    physicalOutputs,
    independentRoutingConfirmed,
    matrixSizeConfidence,
    warnings: unique(warnings),
    compareNotes: unique(compareNotes),
  };
}

export function matrixSizeLabel(topology: MatrixOutputTopology): string {
  if (topology.routedInputCount === null || topology.routedOutputCount === null) {
    return "Matrix size needs review";
  }

  return `${topology.routedInputCount}x${topology.routedOutputCount}`;
}

export function matrixOutputTopologySummary(topology: MatrixOutputTopology): string {
  const routedTypes = topology.routedOutputTypes.length ? topology.routedOutputTypes.join(", ") : "unknown transport";

  return [
    `${topology.sku}: ${matrixSizeLabel(topology)} routed matrix`,
    `Routed outputs: ${topology.routedOutputCount ?? "unknown"} (${routedTypes})`,
    `Mirrored outputs: ${topology.mirroredOutputCount}`,
    `Loop outputs: ${topology.loopOutputCount}`,
    `Local monitor outputs: ${topology.localMonitorOutputCount}`,
    `Aux outputs: ${topology.auxOutputCount}`,
  ].join(" | ");
}
