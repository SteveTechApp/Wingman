export type SchematicWorkspaceHandoff = {
  source: "SchematicBuilder";
  title: string;
  summary: string;
  sourceLabel: string;
  mermaid: string;
  blockers: string[];
  assumptions: string[];
  stats: Array<{ label: string; value: string }>;
  productSku?: string;
  visualPrompt?: string;
  generatedAt: string;
};

const SCHEMATIC_WORKSPACE_HANDOFF_KEY = "wingman-schematic-workspace-handoff-v1";

export function writeSchematicWorkspaceHandoff(
  handoff: Omit<SchematicWorkspaceHandoff, "source" | "generatedAt">
): SchematicWorkspaceHandoff | null {
  if (typeof window === "undefined") return null;

  const payload: SchematicWorkspaceHandoff = {
    source: "SchematicBuilder",
    ...handoff,
    generatedAt: new Date().toISOString()
  };

  window.localStorage.setItem(SCHEMATIC_WORKSPACE_HANDOFF_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("wingman:schematic-workspace-handoff-updated", { detail: payload }));

  return payload;
}

export function readSchematicWorkspaceHandoff(): SchematicWorkspaceHandoff | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SCHEMATIC_WORKSPACE_HANDOFF_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SchematicWorkspaceHandoff;
    if (!parsed || parsed.source !== "SchematicBuilder") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSchematicWorkspaceHandoff() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SCHEMATIC_WORKSPACE_HANDOFF_KEY);
}