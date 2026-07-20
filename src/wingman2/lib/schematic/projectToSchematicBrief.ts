import type {
  StoredGovernedDependency,
  StoredProductSelection,
  StoredProject,
  StoredProposalBomRow,
} from "../../data/projectStore";
import { normaliseSku, productNodeKind } from "./schematicProductRules";
import type { SchematicEndpointBrief, SchematicProductBrief, SchematicProjectBrief } from "./schematicTypes";

/**
 * Adapts a real, saved Wingman project (StoredProject) into the
 * SchematicProjectBrief shape that buildWingmanSchematic() consumes.
 *
 * The schematic engine (wingmanSchematicEngine.ts) is the "good" logic in
 * this codebase: it classifies real SKUs, sequences source -> encoder ->
 * network -> decoder -> display pairing, and raises blocker warnings when a
 * device can't be paired. Until this adapter existed, it was only ever
 * exercised with a hardcoded DEFAULT_BRIEF demo
 * (WingmanGeneratedSchematicPanel.tsx). This file is the missing link that
 * lets it run against a real project.
 *
 * Project data is intentionally read directly from StoredProject fields
 * (mirroring the aggregation pattern used by the legacy
 * `collectProducts()`/`sourcesFromProject()`/`displaysFromProject()` helpers
 * in diagramTemplates.ts) rather than importing from that file, because
 * diagramTemplates.ts is the legacy Mermaid "Schematic Builder" and is
 * explicitly out of scope for this work.
 */

interface AdapterProduct {
  sku: string;
  label: string;
  quantity: number;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "";
  return "";
}

function firstNonEmpty(values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }

  return "";
}

function recordValue(record: Record<string, unknown> | undefined, keys: string[]): string {
  if (!record) return "";
  return firstNonEmpty(keys.map((key) => record[key]));
}

function firstNumber(values: unknown[]): number | undefined {
  for (const value of values) {
    const text = asText(value);
    if (!text) continue;
    const match = text.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return undefined;
}

function stringifyProject(project?: StoredProject | null): string {
  if (!project) return "";

  return [
    project.name,
    project.stage,
    JSON.stringify(project.discoveryBrief ?? {}),
    JSON.stringify(project.requirements ?? []),
    JSON.stringify(project.productSelections ?? []),
    JSON.stringify(project.proposal ?? {}),
    JSON.stringify(project.ingest ?? {}),
  ].join(" ").toLowerCase();
}

function projectHas(project: StoredProject | null | undefined, terms: string[]): boolean {
  const text = stringifyProject(project);
  return terms.some((term) => text.includes(term.toLowerCase()));
}

/**
 * Pools real SKUs from every place a project tracks a product selection:
 * Recommendations selections, the proposal's own product list, BOM rows and
 * governed dependencies. Deduplicated by SKU, "TBC" placeholder rows
 * dropped. This mirrors collectProducts() in diagramTemplates.ts without
 * importing from that (legacy) file.
 */
function collectRealProducts(project?: StoredProject | null): AdapterProduct[] {
  const bySku = new Map<string, AdapterProduct>();

  const addSelection = (selection: StoredProductSelection | undefined) => {
    if (!selection?.sku) return;
    const sku = normaliseSku(selection.sku);
    if (bySku.has(sku)) return;
    bySku.set(sku, {
      sku,
      label: selection.title || sku,
      quantity: 1,
    });
  };

  const addBomRow = (row: StoredProposalBomRow | undefined) => {
    if (!row?.sku || row.sku === "TBC") return;
    const sku = normaliseSku(row.sku);
    if (bySku.has(sku)) {
      const existing = bySku.get(sku)!;
      existing.quantity = Math.max(existing.quantity, row.qty || 1);
      return;
    }

    bySku.set(sku, {
      sku,
      label: row.description || sku,
      quantity: Math.max(1, row.qty || 1),
    });
  };

  const addDependency = (dependency: StoredGovernedDependency | undefined) => {
    if (!dependency?.sku || dependency.sku === "TBC") return;
    const sku = normaliseSku(dependency.sku);
    if (bySku.has(sku)) {
      const existing = bySku.get(sku)!;
      existing.quantity = Math.max(existing.quantity, dependency.qty || 1);
      return;
    }

    bySku.set(sku, {
      sku,
      label: dependency.label || sku,
      quantity: Math.max(1, dependency.qty || 1),
    });
  };

  project?.productSelections?.forEach(addSelection);
  project?.proposal?.products?.forEach(addSelection);
  project?.proposal?.bomRows?.forEach(addBomRow);
  project?.proposal?.governedDependencies?.forEach(addDependency);

  return Array.from(bySku.values());
}

function toSchematicProducts(products: AdapterProduct[]): SchematicProductBrief[] {
  return products.map((product) => ({
    sku: product.sku,
    label: product.label,
    quantity: product.quantity,
  }));
}

function deriveSourceEndpoints(project: StoredProject | null | undefined): SchematicEndpointBrief[] {
  const roomModel = project?.discoveryBrief?.roomModel;
  const countText = recordValue(roomModel, ["sourceCount", "sources", "inputCount", "inputs"]);
  const count = firstNumber([countText]);

  if (count && count > 0) {
    return [{ label: "Room source", quantity: Math.min(count, 12) }];
  }

  const text = stringifyProject(project);
  const endpoints: SchematicEndpointBrief[] = [];

  if (text.includes("laptop")) endpoints.push({ label: "Presenter laptop" });
  if (text.includes("media player") || text.includes("signage")) endpoints.push({ label: "Media player / signage source" });
  if (text.includes("room pc") || text.includes("teams") || text.includes("zoom")) endpoints.push({ label: "Room PC / UC host" });
  if (text.includes("wireless")) endpoints.push({ label: "Wireless presentation" });

  return endpoints;
}

function deriveDisplayEndpoints(project: StoredProject | null | undefined): SchematicEndpointBrief[] {
  const roomModel = project?.discoveryBrief?.roomModel;
  const countText = recordValue(roomModel, ["displayCount", "displays", "outputs", "outputCount"]);
  const count = firstNumber([countText]);

  if (count && count > 0) {
    return [{ label: "Room display", quantity: Math.min(count, 12) }];
  }

  const text = stringifyProject(project);

  if (text.includes("video wall") || text.includes("led wall")) {
    return [{ label: "Video wall canvas" }];
  }

  if (text.includes("dual") || text.includes("two display")) {
    return [{ label: "Room display", quantity: 2 }];
  }

  if (text.includes("projector")) {
    return [{ label: "Projector" }];
  }

  return [];
}

/**
 * Cameras/speakerphones/touch panels have no dedicated count field anywhere
 * in StoredProject - only sourceCount/displayCount exist as runtime keys in
 * discoveryBrief.roomModel. Presence/quantity here is derived from real SKUs
 * already classified by the schematic engine's own productNodeKind(), with a
 * free-text fallback so a project that mentions "camera" or "speakerphone" in
 * discovery notes but hasn't picked a SKU yet still gets a placeholder slot.
 */
function deriveEndpointsFromProductKind(
  products: AdapterProduct[],
  kind: "camera" | "speakerphone" | "touch-panel",
): SchematicEndpointBrief[] {
  return products
    .filter((product) => productNodeKind({ sku: product.sku }) === kind)
    .map((product) => ({ label: product.label, sku: product.sku, quantity: product.quantity }));
}

function fallbackTextEndpoint(
  project: StoredProject | null | undefined,
  terms: string[],
  label: string,
): SchematicEndpointBrief[] {
  return projectHas(project, terms) ? [{ label }] : [];
}

function deriveMaxSignalDistance(project: StoredProject | null | undefined): number | undefined {
  const roomModel = project?.discoveryBrief?.roomModel;
  return firstNumber([recordValue(roomModel, ["cableRun", "longestRun", "distance"])]);
}

/**
 * Builds a SchematicProjectBrief from a real saved project so the whole-
 * project schematic reflects the project's actual SKUs and requirements
 * rather than the hardcoded demo brief. Where the real project model doesn't
 * track a required brief field (e.g. exact camera/speakerphone counts), this
 * defaults sensibly from real SKU evidence or free-text signals rather than
 * inventing fake WyreStorm part numbers.
 */
export function buildSchematicBriefFromProject(project: StoredProject | null | undefined): SchematicProjectBrief {
  const realProducts = collectRealProducts(project);
  const cameraEndpoints = deriveEndpointsFromProductKind(realProducts, "camera").length
    ? deriveEndpointsFromProductKind(realProducts, "camera")
    : fallbackTextEndpoint(project, ["camera", "ptz"], "Room camera");
  const speakerphoneEndpoints = deriveEndpointsFromProductKind(realProducts, "speakerphone").length
    ? deriveEndpointsFromProductKind(realProducts, "speakerphone")
    : fallbackTextEndpoint(project, ["speakerphone", "microphone"], "Table speakerphone");
  const touchPanelEndpoints = deriveEndpointsFromProductKind(realProducts, "touch-panel").length
    ? deriveEndpointsFromProductKind(realProducts, "touch-panel")
    : fallbackTextEndpoint(project, ["touch panel", "touch-panel"], "Control touch panel");

  const usbRequired = projectHas(project, ["usb", "usb-c", "byod", "byom", "teams", "zoom", "kvm"]) || cameraEndpoints.length > 0 || speakerphoneEndpoints.length > 0;
  const audioRequired = projectHas(project, ["audio", "dante", "speaker", "microphone", "sound reinforcement"]) || speakerphoneEndpoints.length > 0;
  const controlRequired = projectHas(project, ["control", "rs-232", "cec", "touch panel", "third-party control"]) || touchPanelEndpoints.length > 0;
  const networkAvailable = !projectHas(project, ["no network", "network unavailable", "air-gapped"]);

  return {
    id: project?.id,
    title: project?.name ? `${project.name} - whole project schematic` : "Whole project schematic",
    roomType: recordValue(project?.discoveryBrief?.roomModel, ["roomType", "application", "applicationType"]) || undefined,
    sources: deriveSourceEndpoints(project),
    displays: deriveDisplayEndpoints(project),
    cameras: cameraEndpoints,
    speakerphones: speakerphoneEndpoints,
    touchPanels: touchPanelEndpoints,
    products: toSchematicProducts(realProducts),
    usbRequired,
    audioRequired,
    controlRequired,
    networkAvailable,
    maxSignalDistanceM: deriveMaxSignalDistance(project),
  };
}
