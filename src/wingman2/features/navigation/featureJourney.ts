import { routeCatalogByKey, type WingmanRouteKey } from "../../app/routeCatalog";

export type FeatureJourneyContext = {
  projectId?: string;
  sku?: string;
};

export type FeatureJourneyAction = {
  routeKey: WingmanRouteKey;
  label: string;
  reason: string;
  to: string;
};

type RelatedFeature = Omit<FeatureJourneyAction, "to"> & { mode?: string };

const relationships: Partial<Record<WingmanRouteKey, readonly RelatedFeature[]>> = {
  callCoach: [
    { routeKey: "discovery", label: "Capture the requirement", reason: "Turn the conversation into a reusable project brief." },
    { routeKey: "products", label: "Open Product Workspace", reason: "Move from the conversation to governed product detail." },
    { routeKey: "compare", label: "Compare a competitor", reason: "Check a named competitor product and its fit gaps." },
  ],
  products: [
    { routeKey: "callCoach", label: "Open Call Coach", reason: "Use the current product in a customer conversation." },
    { routeKey: "discovery", label: "Start Discovery", reason: "Validate the room and system need before selecting." },
    { routeKey: "compare", label: "Compare a competitor", reason: "Check the product direction against another manufacturer." },
  ],
  catalogBrowser: [
    { routeKey: "callCoach", label: "Coach the product call", reason: "Turn a selected product into useful customer questions." },
    { routeKey: "productPitch", label: "Open product detail", reason: "Review positioning and governed technical evidence." },
    { routeKey: "discovery", label: "Validate in Discovery", reason: "Confirm the application before adding a product." },
  ],
  productFamilies: [
    { routeKey: "products", label: "Browse products", reason: "Move from the family direction to a specific SKU." },
    { routeKey: "callCoach", label: "Use in Call Coach", reason: "Explain the architecture during the customer conversation." },
    { routeKey: "discovery", label: "Validate the architecture", reason: "Capture the details that can rule this family in or out." },
  ],
  productCallCards: [
    { routeKey: "callCoach", label: "Continue in Call Coach", reason: "Use this product context in the live conversation." },
    { routeKey: "productPitch", label: "Open full product detail", reason: "Review evidence, fit, and qualification checks." },
    { routeKey: "discovery", label: "Add to Discovery", reason: "Validate the system need before recommending." },
  ],
  productPitch: [
    { routeKey: "callCoach", label: "Coach the conversation", reason: "Use the product positioning with safer customer prompts." },
    { routeKey: "discovery", label: "Validate in Discovery", reason: "Confirm dependencies and room requirements." },
    { routeKey: "proposal", label: "Add to response", reason: "Carry the selected product into Publication." },
  ],
  discovery: [
    { routeKey: "callCoach", label: "Get conversation help", reason: "Use prompts when the customer requirement is unclear." },
    { routeKey: "recommendations", label: "Review recommendations", reason: "Turn captured evidence into governed product direction." },
    { routeKey: "videowall", label: "Open Video Wall", reason: "Use the specialist workflow for wall-led opportunities." },
  ],
  recommendations: [
    { routeKey: "products", label: "Inspect product detail", reason: "Review the selected SKU in Product Workspace." },
    { routeKey: "compare", label: "Check competitor fit", reason: "Validate a competitor-led alternative." },
    { routeKey: "proposal", label: "Build the response", reason: "Carry the recommendation into Publication." },
  ],
  compare: [
    { routeKey: "battleCards", label: "Review objections", reason: "Use battle-card guidance for the current competitor." },
    { routeKey: "products", label: "Inspect the WyreStorm option", reason: "Open governed product detail and positioning." },
    { routeKey: "proposal", label: "Add to response", reason: "Carry the comparison decision into Publication." },
  ],
  battleCards: [
    { routeKey: "compare", label: "Run governed Compare", reason: "Validate equivalence rather than relying on talking points." },
    { routeKey: "callCoach", label: "Prepare the conversation", reason: "Turn objections into safe questions and next actions." },
  ],
  videowall: [
    { routeKey: "discovery", label: "Continue Discovery", reason: "Carry the wall design into the wider system brief." },
    { routeKey: "products", label: "Review products", reason: "Inspect the recommended processing direction." },
    { routeKey: "proposalVisuals", label: "Create a visual", reason: "Turn the wall design into a customer-ready visual." },
  ],
  templates: [
    { routeKey: "discovery", label: "Personalise in Discovery", reason: "Adapt the template to the real room and customer." },
    { routeKey: "proposal", label: "Build the response", reason: "Use the selected design in Publication." },
    { routeKey: "projects", label: "Open Projects", reason: "Review saved template-based opportunities." },
  ],
  documents: [
    { routeKey: "ingest", label: "Decode a document", reason: "Extract requirements, products, and unknowns." },
    { routeKey: "compare", label: "Check substitutions", reason: "Validate competitor items found in the request." },
    { routeKey: "proposal", label: "Build the response", reason: "Publish a customer-safe response from the evidence." },
  ],
  ingest: [
    { routeKey: "discovery", label: "Continue Discovery", reason: "Resolve missing requirements from the document." },
    { routeKey: "compare", label: "Compare extracted products", reason: "Check competitor substitutions with governed evidence." },
    { routeKey: "proposal", label: "Create response", reason: "Turn decoded requirements into Publication." },
  ],
  responsePack: [
    { routeKey: "proposal", label: "Build response pack", reason: "Create the customer-facing publication." },
    { routeKey: "proposalVisuals", label: "Create a visual", reason: "Add a governed diagram or room concept." },
    { routeKey: "projects", label: "Review the project", reason: "Check evidence and readiness before issue." },
  ],
  proposal: [
    { routeKey: "proposalVisuals", label: "Add a visual", reason: "Create a governed diagram for the response." },
    { routeKey: "projects", label: "Review the project", reason: "Check the complete Design Project record." },
    { routeKey: "approvalQueue", label: "Request approval", reason: "Move the publication through its review gate." },
  ],
  proposalVisuals: [
    { routeKey: "proposal", label: "Return to response", reason: "Use the saved visual in Publication." },
    { routeKey: "projects", label: "Open the project", reason: "Review the evidence that generated this visual." },
  ],
  projects: [
    { routeKey: "discovery", label: "Start Discovery", reason: "Capture a new opportunity or resume missing evidence." },
    { routeKey: "quoteSafetyDashboard", label: "Review quote readiness", reason: "See blockers and stale projects across the portfolio." },
    { routeKey: "proposal", label: "Open Publication", reason: "Build the active project's customer response." },
  ],
  quoteSafetyDashboard: [
    { routeKey: "projects", label: "Open Projects", reason: "Resolve blockers in the owning project records." },
    { routeKey: "approvalQueue", label: "Open approvals", reason: "Review publications awaiting a decision." },
  ],
  approvalQueue: [
    { routeKey: "projects", label: "Review project evidence", reason: "Inspect the Design Project behind a publication." },
    { routeKey: "quoteSafetyDashboard", label: "Review quote safety", reason: "Check portfolio-wide blockers and staleness." },
  ],
  learn: [
    { routeKey: "glossary", label: "Open the glossary", reason: "Look up an AV term in plain English." },
    { routeKey: "products", label: "Apply product learning", reason: "Explore live governed product information." },
    { routeKey: "callCoach", label: "Practise in Call Coach", reason: "Use learning in a customer conversation." },
  ],
  glossary: [
    { routeKey: "learn", label: "Continue learning", reason: "Put the term into a structured learning path." },
    { routeKey: "callCoach", label: "Use in Call Coach", reason: "Explain the term during a customer conversation." },
  ],
  support: [
    { routeKey: "callCoach", label: "Open Call Coach", reason: "Get contextual conversation and escalation guidance." },
    { routeKey: "projects", label: "Open Projects", reason: "Review the evidence and next action for the opportunity." },
  ],
  analyticsDashboard: [
    { routeKey: "projects", label: "Inspect Projects", reason: "Review the records behind portfolio patterns." },
  ],
};

function contextualPath(routeKey: WingmanRouteKey, context: FeatureJourneyContext, mode?: string) {
  const route = routeCatalogByKey[routeKey];
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (context.sku && ["products", "productPitch", "productCallCards"].includes(routeKey)) params.set("sku", context.sku);
  if (context.projectId && ["proposal", "proposalVisuals", "discovery", "recommendations"].includes(routeKey)) params.set("projectId", context.projectId);
  const query = params.toString();
  return `${route.path}${query ? `?${query}` : ""}`;
}

export function featureJourneyActions(routeKey: WingmanRouteKey, context: FeatureJourneyContext = {}): FeatureJourneyAction[] {
  return (relationships[routeKey] ?? [])
    .filter((action) => action.routeKey !== routeKey)
    .map((action) => ({ ...action, to: contextualPath(action.routeKey, context, action.mode) }));
}

export const featureJourneyRouteKeys = Object.freeze(Object.keys(relationships) as WingmanRouteKey[]);
