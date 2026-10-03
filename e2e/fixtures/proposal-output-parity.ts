import type { StoredProjectProposal } from "../../src/wingman2/data/projectStore";
import type { SalesBomRow } from "../../src/wingman2/lib/salesReadiness";
import { createProposalWizardDefaults } from "../../src/wingman2/lib/proposalWizard";

export const PARITY_MARKERS = {
  requirement: "Route two operator sources to four displays with resilient 4K distribution.",
  recommendation: "NetworkHD",
  dependency: "NET-SWITCH-10G-MANAGED",
  assumption: "Customer IT will provide a dedicated 10GbE AV VLAN.",
  risk: "Confirm redundant power and switch failover behaviour during commissioning.",
  discoveryQuestion: "How many displays must receive independently routed content?",
  discoveryAnswer: "Four displays",
  schematic: "Operator sources → NetworkHD encoders → 10GbE network → NetworkHD decoders → Four displays",
  disclaimer: "best-efforts basis",
} as const;

export const parityBom: SalesBomRow[] = [
  { item: 1, sku: "NHD-600-TX", description: "NetworkHD 600 encoder", role: "Encode operator sources", qty: 2, type: "Required", status: "included", evidence: "Two confirmed operator sources", notes: "Install in the equipment rack." },
  { item: 2, sku: "NHD-600-RX", description: "NetworkHD 600 decoder", role: "Decode display feeds", qty: 4, type: "Required", status: "included", evidence: "Four independently routed displays", notes: "One decoder per display." },
  { item: 3, sku: "NHD-CTL-PRO-V2", description: "NetworkHD controller", role: "Routing control", qty: 1, type: "Required", status: "included", evidence: "Central routing and control requirement", notes: "Confirm firmware compatibility." },
];

export const parityProposal: StoredProjectProposal = {
  title: "Northstar Operations Room",
  summary: PARITY_MARKERS.requirement,
  sections: [],
  products: parityBom.map((row) => ({ sku: row.sku, quantity: row.qty, title: row.description, family: "NetworkHD 600", category: "AV over IP", evidence: [row.evidence] })),
  productFamilyScores: [{ family: PARITY_MARKERS.recommendation, score: 96, reasons: ["The confirmed routing and resilience requirement needs a scalable 10GbE fabric."], cautions: [PARITY_MARKERS.risk] }],
  assumptions: [PARITY_MARKERS.assumption],
  governedDependencies: [{ id: "dep-network", sku: PARITY_MARKERS.dependency, label: "Managed 10GbE network switch", role: "AV network", qty: 1, type: "Required", status: "by others", confidence: "confirmed", governanceKind: "Prompt", trigger: "AV-over-IP architecture", evidence: "NetworkHD endpoints require managed 10GbE switching.", validationQuestion: "Confirm switch model, port budget, VLAN and multicast configuration.", customerSafeNote: "Customer IT or the integrator must provide and configure the managed switch." }],
  bomRows: parityBom,
  governanceWarnings: [PARITY_MARKERS.risk],
  validationNotes: [],
  repGuidance: ["Approve the network design and complete acceptance testing."],
  discoveryConversation: [{ stepId: "display-count", question: PARITY_MARKERS.discoveryQuestion, answer: PARITY_MARKERS.discoveryAnswer, note: "Each operator needs independent routing.", confirmed: true, confidence: "high", confidenceScore: 12 }],
  applicationProposal: {
    vertical: "Government", application: "Operations room", executiveSummary: PARITY_MARKERS.requirement,
    customerNeed: PARITY_MARKERS.requirement, solutionOverview: PARITY_MARKERS.recommendation,
    benefits: [{ title: "Operational continuity", detail: "Operators retain controlled access to approved sources." }],
    userJourney: ["Operators select an approved source and route it to any display."], technicalFacts: [],
    architectureDiagram: PARITY_MARKERS.schematic,
    acceptanceCriteria: ["Every approved source-to-display route passes functional testing."], visualBriefs: [], verifiedDesignParameters: [], deploymentConditions: [],
    marketStory: "The room supports controlled, resilient operational decision-making.", productSpecifications: [], thirdPartyScope: [],
  },
  companyName: "WyreStorm", preparedBy: "Solutions Team", proposalFooter: "Northstar parity evidence fixture",
  updatedAt: "2026-09-11T00:00:00.000Z",
};

export const parityWizard = (() => {
  const wizard = createProposalWizardDefaults({
    projectId: "northstar-parity", projectName: parityProposal.title, preparedBy: "Solutions Team",
    executiveSummary: PARITY_MARKERS.requirement, architectureNarrative: PARITY_MARKERS.schematic,
    proposedSolution: "NetworkHD 600 resilient AV-over-IP fabric", assumptions: [PARITY_MARKERS.assumption], dependencies: [PARITY_MARKERS.dependency], customerName: "Northstar Council",
  });
  wizard.proposalReference = "WM-PARITY-001";
  wizard.proposalDate = "2026-09-11";
  wizard.bomUnitPrices = { "NHD-600-TX": "1000", "NHD-600-RX": "1100", "NHD-CTL-PRO-V2": "1250" };
  wizard.solutionConfirmed = true;
  wizard.reviewConfirmed = true;
  return wizard;
})();
