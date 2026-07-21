import type { StoredCompareRun, StoredIngestAnalysis, StoredProductSelection } from "../data/projectStore";
import {
  buildGovernedDependencies,
  governedDependencyToBomRow,
  type GovernedDependency,
} from "./dependencyGovernance";

export type SalesBomType = "Required" | "Optional" | "Validate";
export type SalesMotionType = "Product gap" | "Competitor replacement" | "Outcome SKU" | "Room/tender BOM";

export type SalesBomRow = {
  item: number;
  sku: string;
  description: string;
  role: string;
  qty: number;
  type: SalesBomType;
  status: string;
  evidence: string;
  notes: string;
};

export type SalesReadinessInput = {
  products: StoredProductSelection[];
  discovery: {
    projectTitle: string;
    summary: string;
    roomSize: string;
    displays: string;
    displayCount?: string;
    displayBehaviour?: string;
    sourceCount?: string;
    usb: string;
    distance: string;
    network?: string;
    audio?: string;
    control?: string;
    budget: string;
  };
  assumptions: string[];
  ingest?: StoredIngestAnalysis;
  compareRun?: StoredCompareRun | null;
};

export type SalesReadinessPackage = {
  outputPurpose: {
    motion: SalesMotionType;
    summary: string;
    customerOutput: string;
    nextAction: string;
  };
  governedDependencies: GovernedDependency[];
  bomRows: SalesBomRow[];
  evidence: string[];
  governanceWarnings: string[];
  repGuidance: string[];
  validationNotes: string[];
  readinessScore: number;
  reviewRequired: boolean;
};

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

const SOURCE_SIDE_PATTERN = /\btx\b|\btrx\b|transmitter|encoder/i;
const DISPLAY_SIDE_PATTERN = /\brx\b|receiver|decoder/i;
const CORE_DEVICE_PATTERN = /matrix|switcher|controller|processor|\bdsp\b|\bhub\b/i;

function numberFromCountBand(value: unknown): number | null {
  const match = String(value ?? "").match(/\d+/);
  const parsed = Number(match?.[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// TX/encoder and RX/decoder endpoints are sold per source or per display; a
// matrix, switcher, controller or DSP is a single core unit regardless of how
// many sources/displays it serves, so it is deliberately excluded here.
function defaultBomQty(product: StoredProductSelection, discovery: SalesReadinessInput["discovery"]): number {
  const blob = `${product.sku} ${product.title ?? ""} ${product.family ?? ""} ${product.category ?? ""}`;
  if (CORE_DEVICE_PATTERN.test(blob)) return 1;

  if (SOURCE_SIDE_PATTERN.test(blob)) {
    const sourceCount = numberFromCountBand(discovery.sourceCount);
    if (sourceCount) return sourceCount;
  }

  if (DISPLAY_SIDE_PATTERN.test(blob)) {
    const displayCount = numberFromCountBand(discovery.displayCount);
    if (displayCount) return displayCount;
  }

  return 1;
}

function determineOutputPurpose(input: SalesReadinessInput): SalesReadinessPackage["outputPurpose"] {
  const requirementText = [
    input.discovery.projectTitle,
    input.discovery.summary,
    input.discovery.roomSize,
    input.discovery.displays,
    input.discovery.usb,
    input.discovery.distance,
    ...(input.ingest?.requirements ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (!input.products.length) {
    return {
      motion: "Product gap",
      summary: "Discovery has captured the room requirement, but no WyreStorm product has been selected yet.",
      customerOutput: "This is an internal design brief, not a customer-ready proposal. It should not be exported as a BOM until Recommendations adds at least one core WyreStorm product.",
      nextAction: "Open Recommendations, load the Discovery brief, select the core WyreStorm product path, then return to Proposal Builder.",
    };
  }

  if (input.compareRun?.competitorSku || input.compareRun?.competitorName || input.compareRun?.competitorBrand) {
    const competitor = input.compareRun.competitorSku || input.compareRun.competitorName || "the competitor product";
    return {
      motion: "Competitor replacement",
      summary: `Use Wingman to identify the closest WyreStorm SKU or BOM to replace ${competitor}.`,
      customerOutput: "A WyreStorm-only recommendation with comparison evidence and no competitor products in the BOM.",
      nextAction: "Validate the match evidence, then present the WyreStorm replacement path and assumptions.",
    };
  }

  if (
    input.products.length > 1 ||
    (input.ingest?.requirements?.length ?? 0) > 3 ||
    hasAny(requirementText, [
      "tender",
      "bom",
      "bill of materials",
      "room",
      "classroom",
      "boardroom",
      "meeting",
      "huddle",
      "training",
      "retail",
      "hospitality",
      "video wall",
      "videowall",
      "system",
      "rollout",
    ])
  ) {
    return {
      motion: "Room/tender BOM",
      summary: "Use Wingman to package the selected WyreStorm product path into a room or tender BOM.",
      customerOutput: "A proposal draft with selected WyreStorm SKUs, design assumptions, dependency prompts, and evidence basis.",
      nextAction: "Validate architecture-sensitive items: endpoint counts, USB topology, network requirements, audio, control, wall behaviour, accessories, power and mounting.",
    };
  }

  return {
    motion: "Outcome SKU",
    summary: "Use Wingman to present a specific WyreStorm product or compact BOM for a defined customer outcome.",
    customerOutput: "A focused SKU recommendation with the reason it fits and the dependencies that must be checked.",
    nextAction: "Confirm the outcome, signal path, distance, USB/audio/control needs, then present the recommended SKU.",
  };
}

function uniqueRows(rows: SalesBomRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.sku}::${row.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildSalesReadinessPackage(input: SalesReadinessInput): SalesReadinessPackage {
  const outputPurpose = determineOutputPurpose(input);
  const governedDependencies = buildGovernedDependencies(input);
  const evidence = [
    `Sales motion: ${outputPurpose.motion}.`,
    `Project/application: ${input.discovery.projectTitle}.`,
    `Display basis: ${input.discovery.displays}.`,
    `USB basis: ${input.discovery.usb}.`,
    `Distance basis: ${input.discovery.distance}.`,
  ];
  const governanceWarnings = [
    "Validate datasheets, firmware notes, lifecycle status, regional suitability, and accessory requirements before issue.",
    "Exact accessory/dependency rows are added only from governed SKU rules; validate and prompt rows remain design review items until confirmed.",
    "Competitor information is comparison-only and is excluded from WyreStorm proposal/BOM outputs.",
  ];
  const validationNotes = [
    "Wingman produces technical sales scaffolds for AV design review and proposal drafting.",
    "Use approved business systems for any non-technical customer terms outside Wingman scope.",
  ];
  const repGuidance: string[] = [
    outputPurpose.nextAction,
    "Confirm source and display count before treating the BOM as customer-ready.",
    "State assumptions clearly if the customer is still early in discovery.",
    "Escalate to pre-sales when any validate item affects architecture, USB, network, or wall behaviour.",
  ];
  const bomRows: SalesBomRow[] = [];

  input.products.forEach((product, index) => {
    const productEvidence = product.evidence?.[0] || `Selected WyreStorm product carried from ${product.source || "Wingman workflow"}.`;
    bomRows.push({
      item: index + 1,
      sku: product.sku,
      description: product.title || product.family || product.category || "Selected WyreStorm product",
      role: product.category || product.family || "Core product",
      qty: defaultBomQty(product, input.discovery),
      type: "Required",
      status: product.status || "alternative",
      evidence: productEvidence,
      notes: product.cautions?.[0] || "Validate accessories, receiver/transmitter pairing, firmware, power, mounting, lifecycle, and regional suitability before issue.",
    });

    if (product.evidence?.length) evidence.push(...product.evidence.map((item) => `${product.sku}: ${item}`));
    if (product.cautions?.length) governanceWarnings.push(...product.cautions.map((item) => `${product.sku}: ${item}`));
  });

  if (input.products.length) {
    bomRows.push(...governedDependencies.map((dependency) => governedDependencyToBomRow(dependency)));
  }
  evidence.push(
    ...governedDependencies.map((dependency) => {
      const governanceKind = dependency.governanceKind ?? (dependency.sku.startsWith("TBC-") ? "Prompt" : "Exact");
      return `${governanceKind} dependency ${dependency.sku}: ${dependency.evidence}`;
    }),
  );
  governanceWarnings.push(
    ...governedDependencies
      .filter((dependency) => dependency.confidence === "Low" || dependency.status === "validate")
      .map((dependency) => `${dependency.label}: ${dependency.validationQuestion}`),
  );

  if (input.ingest?.requirements?.length) {
    evidence.push(...input.ingest.requirements.slice(0, 4).map((item) => `Document ingest: ${item}`));
  }

  if (input.compareRun?.matchScore) {
    evidence.push(`Competitor comparison evidence captured: ${input.compareRun.wyrestormSku || input.compareRun.wyrestormTitle || "WyreStorm candidate"} scored ${input.compareRun.matchScore}.`);
  }

  const openAssumptionCount = input.assumptions.filter((item) => !/validate final product specifications/i.test(item)).length;
  const validateRowCount = bomRows.filter((row) => row.type === "Validate").length;
  const noCoreProductSelected = input.products.length === 0;
  const readinessScore = noCoreProductSelected
    ? Math.max(10, Math.min(42, 34 - openAssumptionCount * 4))
    : Math.max(25, Math.min(92, 88 - openAssumptionCount * 6 - validateRowCount * 5 + input.products.length * 4));
  const reviewRequired = noCoreProductSelected || readinessScore < 74 || validateRowCount > 2 || openAssumptionCount > 2;

  if (noCoreProductSelected) {
    governanceWarnings.unshift("No WyreStorm core product has been selected. Open Recommendations and add the recommended product path before customer export.");
    validationNotes.unshift("This proposal is currently a discovery/design brief only. The BOM is intentionally blank until products are selected.");
    repGuidance.unshift("Do not present this as a customer proposal yet. Use it to continue qualification or move into Recommendations.");
  } else if (reviewRequired) {
    repGuidance.unshift("Position this as a design direction until the validate items are resolved.");
  } else {
    repGuidance.unshift("This is suitable for a proposal draft after final datasheet and dependency validation.");
  }

  return {
    outputPurpose,
    governedDependencies,
    bomRows: uniqueRows(bomRows).map((row, index) => ({ ...row, item: index + 1 })),
    evidence: Array.from(new Set(evidence)),
    governanceWarnings: Array.from(new Set(governanceWarnings)),
    repGuidance,
    validationNotes,
    readinessScore,
    reviewRequired,
  };
}
