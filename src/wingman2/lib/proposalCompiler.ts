import { getProductStory } from "../data/productStories";
import type {
  StoredApplicationProposal,
  StoredProductSelection,
  StoredProposalProductSpecification,
  StoredProposalScopeItem,
} from "../data/projectStore";
import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import type { SalesBomRow } from "./salesReadiness";

const MARKET_VALUE: Record<string, string> = {
  corporate: "consistent meeting experiences, faster collaboration and a room that support teams can operate predictably",
  education: "clear teaching workflows, inclusive participation and technology that teaching staff can use with confidence",
  government: "operational resilience, controlled access, rapid decision-making and serviceable infrastructure",
  healthcare: "reliable clinical or training workflows, privacy, intelligibility and straightforward operation",
  hospitality: "a dependable guest experience, rapid room turnaround and flexible event operation",
  retail: "consistent content delivery, strong visual impact and a repeatable path for future rollout",
  transport: "continuous operational visibility, resilient distribution and clear incident-response workflows",
  broadcast: "production flexibility, dependable signal management and repeatable operator workflows",
};

function marketValue(vertical: string) {
  const key = vertical.toLowerCase();
  return Object.entries(MARKET_VALUE).find(([term]) => key.includes(term))?.[1]
    ?? "a dependable user experience, supportable operation and a controlled path for future change";
}

function visualFor(template: RoomTemplate) {
  const text = `${template.id} ${template.application}`.toLowerCase();
  const match = (term: string, file: string) => text.includes(term) ? `/template-photos/${file}` : "";
  return match("control", "photo-control-room.jpg") || match("situation", "photo-situation-room.jpg") ||
    match("classroom", "photo-classroom.jpg") || match("teaching", "photo-hybrid-teaching.jpg") ||
    match("lecture", "photo-flexible-learning.jpg") || match("boardroom", "photo-boardroom.jpg") ||
    match("huddle", "photo-huddle-room.jpg") || match("sports", "photo-sportsbar.jpg") ||
    match("stadium", "photo-stadium.jpg") || match("signage", "photo-signage.jpg") ||
    match("wall", "photo-led-wall.jpg") || "/template-visuals/room-boardroom.jpg";
}

function productSpecifications(rows: Array<TemplateBomRow | SalesBomRow>): StoredProposalProductSpecification[] {
  return rows.filter((row) => !row.sku.startsWith("BY-OTHERS") && row.qty > 0).map((row) => {
    const story = getProductStory(row.sku);
    return {
      sku: row.sku,
      name: story?.plainEnglishName || row.description,
      role: row.role,
      quantity: row.qty,
      summary: story?.customerSafeWording || story?.whatItDoes || row.description,
      keyFeatures: story?.keyFeatures.slice(0, 6) ?? [],
      validation: story?.quoteChecks.slice(0, 4) ?? ["Confirm the current datasheet, accessories and regional availability before order."],
    };
  });
}

function thirdPartyScope(rows: Array<TemplateBomRow | SalesBomRow>): StoredProposalScopeItem[] {
  const mapped: StoredProposalScopeItem[] = rows.filter((row) => row.sku.startsWith("BY-OTHERS")).map((row) => ({
    category: row.role,
    description: row.description,
    responsibility: "Integrator / customer / appointed specialist",
    status: "by-others" as const,
    quantity: row.qty,
    notes: row.notes,
  }));
  const required = [
    ["Cabling and connectors", "Cable, termination, patching, containment, certification and consumables"],
    ["Installation labour", "Physical installation, coordination, access equipment and making good"],
    ["Project management", "Programme, site coordination, meetings, change control and reporting"],
    ["Commissioning", "Configuration, programming, testing, training and handover"],
    ["Drawings and documentation", "Visio/CAD schematics, elevations, rack layouts, cable schedules and as-builts"],
  ];
  for (const [category, description] of required) {
    if (!mapped.some((item) => `${item.category} ${item.description}`.toLowerCase().includes(category.toLowerCase().split(" ")[0]))) {
      mapped.push({ category, description, responsibility: "Integrator / customer", status: "allowance", quantity: 1, notes: "Enter the selected supplier, scope and commercial allowance before issue." });
    }
  }
  return mapped;
}

export function compileTemplateApplicationProposal(template: RoomTemplate, rows: TemplateBomRow[]): StoredApplicationProposal {
  const activeRows = rows.filter((row) => row.status !== "excluded" && row.qty > 0);
  const value = marketValue(template.vertical);
  const userJourney = [
    `Users enter the ${template.application.toLowerCase()} with the room ready for its normal operating mode.`,
    "Sources, collaboration devices or operational feeds are selected through the agreed user interface.",
    "WyreStorm distribution carries the selected content to the required display destinations while audio, control and specialist devices operate through their defined third-party interfaces.",
    "The completed system is tested against agreed acceptance criteria and handed over with responsibilities and unresolved allowances clearly recorded.",
  ];
  return {
    vertical: template.vertical,
    application: template.application,
    executiveSummary: `${template.customerNarrative} The proposal is designed to deliver ${value}.`,
    customerNeed: template.summary,
    solutionOverview: template.architecture,
    benefits: [
      { title: "Operational outcome", detail: value },
      { title: "User experience", detail: "A clear, repeatable workflow with specialist complexity kept behind the agreed control experience." },
      { title: "Lifecycle value", detail: "A documented architecture with explicit dependencies, ownership and a path for future expansion." },
    ],
    userJourney,
    technicalFacts: template.designNotes.map((note) => `${note.label}: ${note.description}`),
    architectureDiagram: activeRows.map((row) => `${row.role}: ${row.qty} × ${row.sku}`).join(" → "),
    acceptanceCriteria: [
      "Every agreed source routes to its nominated display or output.",
      "Audio, USB, camera and control behaviour matches the approved room workflow.",
      "All validation items are closed or recorded as accepted exclusions.",
      "The customer receives training, test results and agreed handover documentation.",
    ],
    visualBriefs: [{ title: `${template.name} room concept`, purpose: "Illustrate the intended market application and operating environment." }],
    verifiedDesignParameters: template.designNotes.map((note) => note.label),
    deploymentConditions: [...template.assumptions, ...template.validationItems.map((item) => `Validate: ${item}`)],
    marketStory: `For this ${template.vertical.toLowerCase()} application, success is measured by ${value}. The technology therefore supports the room's operational story rather than acting as an isolated equipment list.`,
    roomVisualUrl: visualFor(template),
    productSpecifications: productSpecifications(activeRows),
    thirdPartyScope: thirdPartyScope(activeRows),
  };
}

export function compileProjectApplicationProposal(input: {
  vertical: string;
  application: string;
  summary: string;
  architecture: string;
  products: StoredProductSelection[];
  bomRows: SalesBomRow[];
  assumptions: string[];
}): StoredApplicationProposal {
  const rows = input.bomRows;
  const value = marketValue(input.vertical || input.application);
  return {
    vertical: input.vertical || "Commercial AV",
    application: input.application,
    executiveSummary: `${input.summary} The recommended approach is intended to deliver ${value}.`,
    customerNeed: input.summary,
    solutionOverview: input.architecture,
    benefits: [{ title: "Business value", detail: value }, { title: "Supportability", detail: "Explicit ownership, assumptions and acceptance criteria reduce delivery and handover risk." }],
    userJourney: ["Enter and prepare the room.", "Select the required source or meeting workflow.", "Use the agreed displays, audio, camera and control experience.", "Close the session and return the room to its standard state."],
    technicalFacts: rows.map((row) => `${row.sku}: ${row.role}`),
    architectureDiagram: rows.map((row) => `${row.role}: ${row.qty} × ${row.sku}`).join(" → "),
    acceptanceCriteria: ["Signal routing and room modes operate as approved.", "Third-party interfaces and responsibilities are validated.", "Training and documentation are complete."],
    visualBriefs: [], verifiedDesignParameters: [], deploymentConditions: input.assumptions,
    marketStory: `The proposal is focused on ${value}, with WyreStorm forming the signal-management portion of the wider room system.`,
    productSpecifications: productSpecifications(rows), thirdPartyScope: thirdPartyScope(rows),
  };
}
