import { getProductStory } from "../data/productStories";
import type {
  DesignRequirementState,
  StoredDesignProductOverview,
  StoredDesignProposalRevision,
  StoredDesignRequirementTrace,
  StoredDesignRoleCoverage,
  StoredProject,
} from "../data/projectStore";

const ROLE_DEFINITIONS: Array<{ role: StoredDesignRoleCoverage["role"]; label: string; patterns: RegExp }> = [
  { role: "source", label: "Sources and source connections", patterns: /source|laptop|camera|player|input|transmit|encoder|tx\b/i },
  { role: "processing", label: "Switching and processing", patterns: /switch|matrix|process|scale|multiview|wall|route|apollo|presentation/i },
  { role: "transport", label: "Signal transport", patterns: /transport|extend|hdbaset|fibre|fiber|cable|receiver|transmitter|encoder|decoder|rx\b|tx\b|networkhd/i },
  { role: "destination", label: "Displays and destinations", patterns: /display|projector|led|destination|output|receiver|decoder|rx\b|record/i },
  { role: "network", label: "Network infrastructure", patterns: /network|avoip|av over ip|networkhd|ethernet|switch/i },
  { role: "usb", label: "USB and host ownership", patterns: /usb|byod|byom|host|kvm|camera/i },
  { role: "audio", label: "Audio path", patterns: /audio|speaker|microphone|dante|aes67|amp|sound/i },
  { role: "control", label: "Control and user operation", patterns: /control|touch|preset|automation|remote/i },
  { role: "power", label: "Power strategy", patterns: /power|poe|poh|psu|watt/i },
];

function text(value: unknown, fallback = "") { const output = String(value ?? "").trim(); return output || fallback; }
function list(value: unknown): string[] { return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : text(value) ? [text(value)] : []; }
function unique(values: string[]) { return Array.from(new Set(values.filter(Boolean))); }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).filter(([key]) => !["compiledAt", "revisionId", "contentHash"].includes(key)).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function designProposalHash(value: unknown): string {
  const input = stable(value); let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) { hash ^= input.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return `dp1-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function consequence(field: string, value: string) {
  const blob = `${field} ${value}`.toLowerCase();
  if (/source|input/.test(blob)) return "Provide the correct source inputs, formats and connection experience.";
  if (/display|output|wall/.test(blob)) return "Provide the required number of independently controlled destinations and display behaviour.";
  if (/distance|route|location|cable/.test(blob)) return "Select transport and cabling that supports the measured installed route.";
  if (/usb|byod|byom|camera|host/.test(blob)) return "Define USB direction, host ownership, device bandwidth and extension distance.";
  if (/audio|microphone|speaker|dante/.test(blob)) return "Define capture, playback, routing and control for the complete audio path.";
  if (/network|avoip/.test(blob)) return "Confirm network ownership, bandwidth, switching, configuration and support responsibility.";
  if (/control/.test(blob)) return "Define the user actions, control interface, presets and third-party integration.";
  return "Carry this requirement into architecture, equipment selection and acceptance testing.";
}

function requirementsFrom(project: StoredProject): StoredDesignRequirementTrace[] {
  const explicit = (project.requirements ?? []).map((item) => ({
    id: item.id, customerStatement: `${item.label}: ${item.value}`,
    interpretation: item.status === "confirmed" ? `Confirmed requirement: ${item.value}` : `Wingman interpretation requires ${item.status === "unknown" ? "an answer" : "review"}: ${item.value}`,
    designConsequence: item.whyItMatters || consequence(item.category || item.label, item.value), source: item.source,
    state: (item.status === "review" ? "inferred" : item.status) as DesignRequirementState,
    confidence: item.status === "confirmed" ? "high" as const : "low" as const,
  }));
  const seen = new Set(explicit.map((item) => item.id));
  const evidence = (project.discoveryBrief?.decisionEvidence ?? []).filter((item) => !seen.has(item.field)).map((item) => ({
    id: item.field, customerStatement: `${item.field.replace(/-/g, " ")}: ${item.value}`,
    interpretation: item.state === "confirmed" ? `Confirmed requirement: ${item.value}` : `Wingman inferred: ${item.value}`,
    designConsequence: consequence(item.field, item.value), source: item.source, state: item.state, confidence: item.confidence,
  }));
  if (explicit.length || evidence.length) return [...explicit, ...evidence];
  return (project.discoveryBrief?.discoveryConversation ?? []).map((item) => ({
    id: item.stepId, customerStatement: item.note || `${item.question}: ${item.answer}`,
    interpretation: `${item.confirmed ? "Confirmed" : "Interpreted"}: ${item.answer}`,
    designConsequence: consequence(item.question, item.answer), source: "Discovery conversation",
    state: item.confirmed ? "confirmed" : "inferred", confidence: item.confidence === "high" ? "high" : item.confidence === "matched" ? "medium" : "low",
  }));
}

function roleCoverage(project: StoredProject, requirements: StoredDesignRequirementTrace[]): StoredDesignRoleCoverage[] {
  const requirementText = requirements.map((item) => `${item.id} ${item.customerStatement} ${item.interpretation}`).join(" ");
  const products = project.proposal?.bomRows?.length ? project.proposal.bomRows : (project.productSelections ?? []).map((item, index) => ({ item: index + 1, sku: item.sku, description: item.title ?? item.sku, role: item.category ?? item.family ?? "", qty: item.quantity ?? 1, status: "selected", notes: "" }));
  const productText = products.map((item) => `${item.sku} ${item.description} ${item.role} ${item.notes}`).join(" ");
  return ROLE_DEFINITIONS.map((definition) => {
    const required = ["source", "processing", "transport", "destination"].includes(definition.role) || definition.patterns.test(requirementText);
    const matchingRequirements = requirements.filter((item) => definition.patterns.test(`${item.id} ${item.customerStatement} ${item.designConsequence}`));
    const matchingProducts = products.filter((item) => definition.patterns.test(`${item.sku} ${item.description} ${item.role} ${item.notes}`));
    const roomModel = project.discoveryBrief?.roomModel ?? {};
    const byOthers = list(roomModel[`${definition.role}Needs`]).concat(list(roomModel[`${definition.role}Path`]));
    return { role: definition.role, label: definition.label, required, covered: matchingProducts.length > 0 || byOthers.length > 0 || (!required && definition.patterns.test(productText)), evidence: unique([...matchingProducts.map((item) => `${item.qty} × ${item.sku}`), ...byOthers]), requirementIds: matchingRequirements.map((item) => item.id) };
  });
}

function productOverviews(project: StoredProject, requirements: StoredDesignRequirementTrace[]): StoredDesignProductOverview[] {
  const rows = project.proposal?.bomRows?.length ? project.proposal.bomRows : (project.productSelections ?? []).map((item, index) => ({ item: index + 1, sku: item.sku, description: item.title ?? item.sku, role: item.category ?? item.family ?? "System product", qty: item.quantity ?? 1, status: "selected", evidence: item.evidence?.join("; "), notes: item.cautions?.join("; ") ?? "" }));
  return rows.filter((row) => row.qty > 0 && !row.sku.startsWith("BY-OTHERS")).map((row) => {
    const story = getProductStory(row.sku); const blob = `${row.sku} ${row.description} ${row.role} ${story?.whatItDoes ?? ""}`;
    const matched = requirements.filter((item) => ROLE_DEFINITIONS.some((definition) => definition.patterns.test(blob) && definition.patterns.test(`${item.customerStatement} ${item.designConsequence}`)));
    const dependencies = (project.proposal?.governedDependencies ?? []).filter((item) => item.sourceSku === row.sku || item.sku === row.sku).map((item) => `${item.qty} × ${item.sku}: ${item.label}`);
    return { sku: row.sku, name: story?.plainEnglishName || row.description, quantity: row.qty, designRole: row.role || "System product", requirementIds: matched.map((item) => item.id), reason: matched.length ? `Selected to address: ${matched.map((item) => item.customerStatement).join("; ")}` : story?.customerProblem || `Selected for the ${row.role || "system"} role.`, proof: unique([...(story?.keyFeatures.slice(0, 4) ?? []), ...(row.evidence ? [row.evidence] : [])]), dependencies, validation: unique([...(story?.quoteChecks.slice(0, 4) ?? []), ...(row.notes ? [row.notes] : [])]) };
  });
}

export function compileDesignProposal(project: StoredProject, compiledAt = new Date().toISOString()): StoredDesignProposalRevision {
  const requirements = requirementsFrom(project);
  const coverage = roleCoverage(project, requirements);
  const products = productOverviews(project, requirements);
  const unresolved = requirements.filter((item) => item.state !== "confirmed");
  const missingRoles = coverage.filter((item) => item.required && !item.covered);
  const blockers = unique([
    ...(requirements.length ? [] : ["Customer requirements have not been captured."]),
    ...requirements.filter((item) => item.state === "conflict" || item.state === "unknown").map((item) => `Resolve ${item.customerStatement}.`),
    ...missingRoles.map((item) => `Complete the ${item.label.toLowerCase()} design role.`),
    ...(products.length ? [] : ["Select at least one product or system item."]),
  ]);
  const warnings = unique([...unresolved.filter((item) => item.state === "inferred").map((item) => `Confirm Wingman’s interpretation of ${item.customerStatement}.`), ...(project.proposal?.governanceWarnings ?? []), ...(project.proposal?.validationNotes ?? [])]);
  const customerRequirement = requirements.map((item) => item.customerStatement).join(" · ") || "Customer requirement not captured.";
  const architecture = text(project.proposal?.applicationProposal?.solutionOverview, text(project.discoveryBrief?.inference?.architecture, "Architecture requires confirmation."));
  const draft: StoredDesignProposalRevision = { schemaVersion: 1, revisionId: "", contentHash: "", projectId: project.id, projectName: project.name, compiledAt, customerRequirement, interpretedRequirement: requirements.map((item) => item.interpretation).join(" · ") || "Wingman cannot interpret the requirement yet.", architecture, requirements, roleCoverage: coverage, productOverviews: products, assumptions: unique(project.proposal?.assumptions ?? []), blockers, warnings, canIssue: blockers.length === 0 };
  const contentHash = designProposalHash(draft);
  return { ...draft, revisionId: contentHash, contentHash };
}

export function approvalMatchesDesignRevision(project: StoredProject) {
  const proposal = project.proposal; if (!proposal?.designRevision) return false;
  return proposal.approvalStatus !== "approved" || proposal.approvedRevisionHash === proposal.designRevision.contentHash;
}
