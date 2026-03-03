import type {
  DesignPackage, EngineeringContext, Phase, RoomProfile
} from "./types";
import { RULES } from "./rules";
import { getPatternById } from "./patterns";
import { validateDesign } from "./validate";
import { buildExports } from "./explain";

function logRule(ctx: EngineeringContext, ruleId: string, phase: Phase, priority: number, inputsUsed: string[], message: string, diff?: Record<string, unknown>) {
  ctx.decisionLog.push({ ruleId, phase, priority, inputsUsed, message, diff });
}

function createContext(): EngineeringContext {
  return {
    phase: "normalize",
    designTypeCandidate: "HDBaseT",
    complexityScore: 0,

    requirements: [],
    topology: undefined,
    chosenPatternId: undefined,

    bom: [],
    alternates: [],

    violations: [],
    warnings: [],
    assumptions: [],
    decisionLog: []
  };
}

function executePhase(profile: RoomProfile, ctx: EngineeringContext, phase: Phase) {
  ctx.phase = phase;
  const phaseRules = RULES
    .filter(r => r.phase === phase)
    .sort((a, b) => b.priority - a.priority);

  for (const r of phaseRules) {
    if (r.when(profile, ctx)) {
      const before = { chosenPatternId: ctx.chosenPatternId, designTypeCandidate: ctx.designTypeCandidate, complexityScore: ctx.complexityScore, roomArchetype: ctx.roomArchetype, reqCount: ctx.requirements.length };
      r.then(profile, ctx);
      const after = { chosenPatternId: ctx.chosenPatternId, designTypeCandidate: ctx.designTypeCandidate, complexityScore: ctx.complexityScore, roomArchetype: ctx.roomArchetype, reqCount: ctx.requirements.length };
      logRule(ctx, r.id, phase, r.priority, r.inputsUsed, r.describe, { before, after });
    }
  }
}

/**
 * Product binding v1:
 * Creates placeholder BOM lines per role.
 * Replace with real catalog+compatibility binding later.
 */
function bindProducts(ctx: EngineeringContext) {
  if (!ctx.topology) return;

  const roleCounts = new Map<string, number>();
  for (const n of ctx.topology.nodes) {
    if (!n.role || n.role === "source_pool") continue;
    roleCounts.set(n.role, (roleCounts.get(n.role) ?? 0) + 1);
  }

  ctx.bom = [];
  for (const [role, qty] of roleCounts.entries()) {
    ctx.bom.push({
      sku: `TBD-${role.toUpperCase()}`,
      name: `Placeholder for role: ${role}`,
      qty,
      role,
      justificationRuleIds: ctx.decisionLog.map(d => d.ruleId).slice(-3) // last few rules as a stub
    });
  }

  // Simple Good/Better/Best placeholders
  ctx.alternates = [
    { name: "Good", bom: ctx.bom },
    { name: "Better", bom: ctx.bom.map(x => ({ ...x, sku: x.sku + "-BETTER" })) },
    { name: "Best", bom: ctx.bom.map(x => ({ ...x, sku: x.sku + "-BEST" })) }
  ];
}

function chooseTopology(ctx: EngineeringContext) {
  if (!ctx.chosenPatternId) return;
  const pat = getPatternById(ctx.chosenPatternId);
  if (!pat) {
    ctx.violations.push({ type: "violation", code: "PATTERN_NOT_FOUND", message: `Pattern not found: ${ctx.chosenPatternId}` });
    return;
  }
  ctx.topology = pat.topology;
}

/**
 * EngineeringCore v1 pipeline:
 * normalize -> classify -> derive -> select_pattern -> chooseTopology -> bind_products -> validate -> explain
 */
export function runEngineering(profile: RoomProfile): DesignPackage {
  const ctx = createContext();

  // Phase 0: normalize (minimal now)
  executePhase(profile, ctx, "normalize");

  // Phase 1: classify
  executePhase(profile, ctx, "classify");

  // Phase 2: derive requirements
  executePhase(profile, ctx, "derive");

  // Phase 3: select pattern
  executePhase(profile, ctx, "select_pattern");

  // Materialize topology from pattern
  chooseTopology(ctx);

  // Phase 4: bind products (placeholder)
  ctx.phase = "bind_products";
  bindProducts(ctx);

  // Phase 5: validate
  ctx.phase = "validate";
  validateDesign(profile, ctx);

  // Confidence heuristic (v1)
  let confidence = 70;
  confidence -= Math.min(40, ctx.warnings.length * 5);
  confidence -= Math.min(70, ctx.violations.length * 20);
  if (!profile.constraints?.maxCableRunMeters) confidence -= 10;
  if (!ctx.chosenPatternId) confidence -= 20;
  confidence = Math.max(0, Math.min(100, confidence));

  // Phase 6: explain
  ctx.phase = "explain";
  const exports = buildExports(profile, ctx);

  return {
    designType: ctx.designTypeCandidate,
    confidence,
    topology: ctx.topology ?? { nodes: [], edges: [] },
    requirements: ctx.requirements,
    bom: ctx.bom,
    alternates: ctx.alternates,
    violations: ctx.violations,
    warnings: ctx.warnings,
    assumptions: ctx.assumptions,
    decisionLog: ctx.decisionLog,
    exports
  };
}