export type SystemTopology = {
  sources?: number;
  displays?: number;
  transport?: string;
};

export type ValidationResult = {
  valid: boolean;
  missing: string[];
};

export function validateTopology(topology?: SystemTopology): ValidationResult {
  const input = topology ?? {};
  const missing: string[] = [];

  if (!input.sources || input.sources < 1) missing.push("source count");
  if (!input.displays || input.displays < 1) missing.push("display count");
  if (!String(input.transport ?? "").trim()) missing.push("transport type");

  return {
    valid: missing.length === 0,
    missing,
  };
}