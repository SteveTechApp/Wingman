/**
 * Complete-room coverage scorecard for the template realism audit gate
 * (docs/AV_COMPLETE_ROOM_DESIGN_REFERENCE.md §2). A defensible design is a
 * room, not a signal chain: each published template is scored against the six
 * design layers, and catalogue quality measures all of them — not just signal
 * transport.
 *
 * The scorecard is a ratchet, not an aspiration: per-layer floors live in
 * tools/template-coverage-floors.json and start at the currently measured
 * state (every authored template is transport-covered by construction, and the
 * five guidance layers are still unspecified). Authoring `completion` blocks
 * on templates raises the measured coverage and lets the floors rise; letting
 * coverage fall below a floor fails `check:template-realism`.
 */

export const COMPLETE_ROOM_LAYERS = ["transport", "humanFactors", "controlExperience", "environment", "assurance", "compliance"];
export const BY_OTHERS_LAYER_KEYS = {
  controlExperience: ["SCHEDULING-PANEL", "MONITORING-NOC"],
  assurance: ["SPARES", "MONITORING-NOC"],
  compliance: ["ASSISTIVE-LISTENING", "VA-PAGING-INTERFACE"],
};

/** A template layer counts as addressed when it is covered, by-others, or explicitly not applicable. */
export function layerAddressed(status) {
  return status === "covered" || status === "by-others" || status === "not-applicable";
}

/** Reuses the checklist's status derivation so the gate scores exactly what the UI shows. */
export async function loadChecklistScorer(root) {
  const entry = path.join(root, "tools/lib/template-coverage-checklist-entry.ts");
  const { build } = await import("vite");
  const result = await build({ configFile: false, root, logLevel: "silent", build: { write: false, ssr: entry, rollupOptions: { output: { format: "esm" } } } });
  const output = Array.isArray(result) ? result[0].output : result.output;
  const chunk = output.find((item) => item.type === "chunk");
  const url = `data:text/javascript;base64,${Buffer.from(chunk.code).toString("base64")}`;
  return (await import(url)).templateCompletionChecklist;
}

import path from "node:path";

/**
 * Per-template, per-layer status counts plus catalogue-wide coverage per
 * layer: covered / byOthers / notApplicable / unspecified / addressed.
 */
export function buildCoverageScorecard(templates, scoreTemplate) {
  const layers = Object.fromEntries(COMPLETE_ROOM_LAYERS.map((layer) => [
    layer, { covered: 0, byOthers: 0, notApplicable: 0, unspecified: 0, addressed: 0 },
  ]));
  for (const template of templates) {
    const checklist = scoreTemplate(template);
    for (const layer of checklist.layers) {
      if (!layers[layer.id]) continue;
      layers[layer.id][layer.status] += 1;
      if (layerAddressed(layer.status)) layers[layer.id].addressed += 1;
    }
  }
  return { templateCount: templates.length, layers };
}

/**
 * Floor violations only: a floor equal to the measured count passes (floors
 * are minimums). Missing floors are ignored so new layers can be introduced
 * without touching the baseline first.
 */
export function floorViolations(scorecard, floors) {
  const violations = [];
  for (const layer of COMPLETE_ROOM_LAYERS) {
    const floor = floors?.layers?.[layer];
    const measured = scorecard.layers[layer]?.addressed ?? 0;
    if (Number.isFinite(floor) && measured < floor) {
      violations.push({ layer, floor, measured });
    }
  }
  return violations;
}

/** true when every measured count is at or above its floor — a rise opportunity, not a pass by default. */
export function floorsAreStale(scorecard, floors) {
  return COMPLETE_ROOM_LAYERS.every((layer) => {
    const floor = floors?.layers?.[layer];
    const measured = scorecard.layers[layer]?.addressed ?? 0;
    return Number.isFinite(floor) && floor === measured;
  });
}

/** Build a floors document from the measured scorecard (used for the baseline refresh message). */
export function measuredFloors(scorecard) {
  return {
    updatedAt: new Date().toISOString(),
    rule: "Per-layer minimum counts of addressed templates (covered + by-others + not-applicable). Measured by check:template-realism; falling below any floor fails the gate. Raising a floor follows the documented exception process.",
    layers: Object.fromEntries(COMPLETE_ROOM_LAYERS.map((layer) => [layer, scorecard.layers[layer].addressed])),
  };
}
