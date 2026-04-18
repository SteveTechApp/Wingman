export type ProjectAnalysisResponse = {
  ok: true;
  mode: "deterministic-fallback";
  service: "projectAnalysisService";
  riskLevel: "Low" | "Medium" | "High";
  summary: string;
  findings: string[];
  nextActions: string[];
};

function normalizeInput(input: unknown): string {
  if (typeof input === "string") return input.trim();
  try {
    return JSON.stringify(input);
  } catch {
    return String(input ?? "");
  }
}

function digest(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash + text.charCodeAt(i) * (i + 1)) % 1000003;
  }
  return `A-${text.length}-${hash}`;
}

export async function analyzeProject(input: unknown): Promise<ProjectAnalysisResponse> {
  const normalized = normalizeInput(input).toLowerCase();

  const findings: string[] = [];
  const nextActions: string[] = [];

  if (normalized.includes("video wall") || normalized.includes("multi-display")) {
    findings.push("Project appears to involve multi-display logic or wall processing.");
    nextActions.push("Confirm processor strategy, layout presets, and display routing assumptions.");
  }

  if (normalized.includes("usb") || normalized.includes("byod") || normalized.includes("camera")) {
    findings.push("USB or collaboration signals are present in the brief.");
    nextActions.push("Validate host/peripheral direction and extension requirements early.");
  }

  if (normalized.includes("dante") || normalized.includes("audio")) {
    findings.push("Audio integration requirements are likely to influence topology.");
    nextActions.push("Capture microphone, DSP, and speaker paths before final BOM.");
  }

  if (normalized.includes("urgent") || normalized.includes("immediate") || normalized.includes("asap")) {
    findings.push("Timeline language indicates elevated delivery pressure.");
  }

  if (findings.length === 0) {
    findings.push("Input is sparse; no high-confidence risk indicators were detected.");
    nextActions.push("Open Guided Project to capture source/display counts and transport constraints.");
  }

  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (findings.length >= 2) riskLevel = "Medium";
  if (findings.some((item) => item.includes("delivery pressure"))) riskLevel = "High";

  if (nextActions.length === 0) {
    nextActions.push("Proceed with deterministic first-pass design and review output with engineering.");
  }

  return {
    ok: true,
    mode: "deterministic-fallback",
    service: "projectAnalysisService",
    riskLevel,
    summary: `Fallback analysis digest ${digest(normalized || "empty")}.`,
    findings,
    nextActions,
  };
}
