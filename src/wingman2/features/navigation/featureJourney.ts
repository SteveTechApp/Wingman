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

/**
 * What a strip entry calls the route it opens.
 *
 * An entry names a destination, so its words belong to the route rather than to
 * the page's chrome: the page a rep lands on prints its own label
 * (`.wingman-topbar-page-label`), and an entry that repeated that label would say
 * the same thing twice — once in the list, once on arrival. Most routes are known
 * by one word in both places (`Call Coach`, `Compare`, `Projects`), and the strip
 * uses it. Five are not, and the words are decided here in two classes.
 *
 * Three name the route:
 *
 * - `discovery` — the route is `/wingman/discovery` and renders
 *   `OpportunitiesPage`, whose nav row prints `Opportunities`. The strip says
 *   `Discovery`: the route's own name, and the work its entries send a rep to do
 *   (`Start Discovery`, `Validate in Discovery`, `Add to Discovery`).
 * - `products` — the route renders the product workspace
 *   (`ProductWorkspaceMode` in `pages/NavigationHubPages.tsx`, the
 *   `ProductWorkspaceHeader`/`ProductWorkspaceNav` chrome, and its own
 *   "Loading Product Workspace…"), while its nav row prints `Products`. The strip
 *   says `Product Workspace`, the name the page carries.
 * - `videowall` — the manifest's `label` prints `Video wall designer` on arrival
 *   and its `navLabel` keeps `Video Wall`. The strip says `Video Wall`, the short
 *   form; `lib/wallEntry.ts` owns that page's name and treats this entry as the
 *   one link that keeps its own words.
 *
 * Two name the move instead, because the entry offers what a rep does there rather
 * than asking them to open a page by name. A move needs an object, so each of
 * those entries says what the rep is carrying into it:
 *
 * - `productPitch` — the manifest's `label` is `Product Positioning` and the page's
 *   own eyebrow prints `Products / Positioning`. Its entries are the two things a
 *   rep arrives holding: `Position the shortlisted product` (`catalogBrowser`) and
 *   `Position this product for the call` (`productCallCards`). Both name the move
 *   and the thing it is done to; `product detail`, the phrase they used to share,
 *   names the artefact instead — and `recommendations` already offers `Inspect
 *   product detail` to the Products route in those words. Naming the page would
 *   read `Open Product Positioning`, the label a rep reads on arrival and so the
 *   one thing the strip exists not to promise twice.
 * - `responsePack` — the manifest's `label` is `Responses`, and the page's own nav
 *   row already says `Build response`. Every entry that opens it therefore names
 *   what it contributes: `Add this product to the response` (`productPitch`),
 *   `Draft the response from this recommendation` (`recommendations`), `Carry the
 *   comparison into the response` (`compare`), `Use this design in the response`
 *   (`templates`), `Answer the document in the response` (`documents`), `Turn the
 *   extracted request into a response` (`ingest`), `Use the visual in the response`
 *   (`proposalVisuals`) and `Open the customer response` (`projects`). Eight
 *   entries once read three phrases between them (`Add to response`, `Build the
 *   response`, `Create response`), so a rep moving between pages could not tell
 *   which of them would put what in it. The singular is the artefact rather than
 *   the route: the customer receives a response whatever the route is filed under.
 *
 * So the words here are the app's own, for a route or for a move, rather than
 * either of the manifest's names for it (`label` or `navLabel`), because the page
 * prints its own on arrival either way. Renaming a page without this table moves
 * the strip out of step, which is why `featureJourney.test.ts` holds all five
 * against the manifest's labels, and holds the two move words to a second fact —
 * neither of the manifest's names for the route — which is the difference between
 * them and a route word like `Video Wall`, that page's own `navLabel`.
 *
 * The two move destinations are also held to each other: no two of their entries
 * may print the same words. That is the half a reader cannot check by eye once the
 * list grows — three entries reading `Build the response` looked like a considered
 * vocabulary, which is why they survived — and it is the half that keeps an entry
 * naming what it carries rather than pointing at a page.
 */
const relationships: Partial<Record<WingmanRouteKey, readonly RelatedFeature[]>> = {
  callCoach: [
    { routeKey: "discovery", label: "Capture the requirement", reason: "Turn the conversation into a reusable project brief." },
    { routeKey: "products", label: "Open Product Workspace", reason: "Move from the conversation to governed product detail." },
    { routeKey: "compare", label: "Compare a competitor", reason: "Check a named competitor product and its fit gaps." },
  ],
  products: [
    { routeKey: "callCoach", label: "Get product conversation prompts", reason: "Use the current product in a customer conversation." },
    { routeKey: "discovery", label: "Start Discovery", reason: "Validate the room and system need before selecting." },
    { routeKey: "compare", label: "Compare a competitor", reason: "Check the product direction against another manufacturer." },
  ],
  catalogBrowser: [
    { routeKey: "callCoach", label: "Coach the product call", reason: "Turn a selected product into useful customer questions." },
    { routeKey: "productPitch", label: "Position the shortlisted product", reason: "Review positioning and governed technical evidence." },
    { routeKey: "discovery", label: "Validate in Discovery", reason: "Confirm the application before adding a product." },
  ],
  productFamilies: [
    { routeKey: "products", label: "Browse products", reason: "Move from the family direction to a specific SKU." },
    { routeKey: "callCoach", label: "Use in Call Coach", reason: "Explain the architecture during the customer conversation." },
    { routeKey: "discovery", label: "Validate the architecture", reason: "Capture the details that can rule this family in or out." },
  ],
  productCallCards: [
    { routeKey: "callCoach", label: "Continue in Call Coach", reason: "Use this product context in the live conversation." },
    { routeKey: "productPitch", label: "Position this product for the call", reason: "Review evidence, fit, and qualification checks." },
    { routeKey: "discovery", label: "Add to Discovery", reason: "Validate the system need before recommending." },
  ],
  productPitch: [
    { routeKey: "callCoach", label: "Coach the conversation", reason: "Use the product positioning with safer customer prompts." },
    { routeKey: "discovery", label: "Validate in Discovery", reason: "Confirm dependencies and room requirements." },
    { routeKey: "responsePack", label: "Add this product to the response", reason: "Carry the selected product into the customer response." },
  ],
  discovery: [
    { routeKey: "callCoach", label: "Get conversation help", reason: "Use prompts when the customer requirement is unclear." },
    { routeKey: "recommendations", label: "Review recommendations", reason: "Turn captured evidence into governed product direction." },
    { routeKey: "videowall", label: "Open Video Wall", reason: "Use the specialist workflow for wall-led opportunities." },
  ],
  recommendations: [
    { routeKey: "products", label: "Inspect product detail", reason: "Review the selected SKU in Product Workspace." },
    { routeKey: "compare", label: "Check competitor fit", reason: "Validate a competitor-led alternative." },
    { routeKey: "responsePack", label: "Draft the response from this recommendation", reason: "Carry the recommendation into the customer response." },
  ],
  compare: [
    { routeKey: "products", label: "Inspect the WyreStorm option", reason: "Open governed product detail and positioning." },
    { routeKey: "responsePack", label: "Carry the comparison into the response", reason: "Carry the comparison decision into the customer response." },
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
    { routeKey: "responsePack", label: "Use this design in the response", reason: "Use the selected design in the customer response." },
    { routeKey: "projects", label: "Open Projects", reason: "Review saved template-based opportunities." },
  ],
  documents: [
    { routeKey: "ingest", label: "Decode a document", reason: "Extract requirements, products, and unknowns." },
    { routeKey: "compare", label: "Check substitutions", reason: "Validate competitor items found in the request." },
    { routeKey: "responsePack", label: "Answer the document in the response", reason: "Publish a customer-safe response from the evidence." },
  ],
  ingest: [
    { routeKey: "discovery", label: "Continue Discovery", reason: "Resolve missing requirements from the document." },
    { routeKey: "compare", label: "Compare extracted products", reason: "Check competitor substitutions with governed evidence." },
    { routeKey: "responsePack", label: "Turn the extracted request into a response", reason: "Turn decoded requirements into a customer response." },
  ],
  responsePack: [
    { routeKey: "proposalVisuals", label: "Create a visual", reason: "Add a governed diagram or room concept." },
    { routeKey: "projects", label: "Review the project", reason: "Check evidence and readiness before issue." },
  ],
  proposal: [
    { routeKey: "proposalVisuals", label: "Add a visual", reason: "Create a governed diagram for the response." },
    { routeKey: "projects", label: "Review the project", reason: "Check the complete Design Project record." },
    { routeKey: "approvalQueue", label: "Request approval", reason: "Move the publication through its review gate." },
  ],
  proposalVisuals: [
    { routeKey: "responsePack", label: "Use the visual in the response", reason: "Use the saved visual in the customer response." },
    { routeKey: "projects", label: "Open the project", reason: "Review the evidence that generated this visual." },
  ],
  projects: [
    { routeKey: "discovery", label: "Start Discovery", reason: "Capture a new opportunity or resume missing evidence." },
    { routeKey: "quoteSafetyDashboard", label: "Review quote readiness", reason: "See blockers and stale projects across the portfolio." },
    { routeKey: "responsePack", label: "Open the customer response", reason: "Build the active project's customer response." },
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
  if (context.projectId && ["proposal", "responsePack", "proposalVisuals", "discovery", "recommendations"].includes(routeKey)) params.set("projectId", context.projectId);
  const query = params.toString();
  return `${route.path}${query ? `?${query}` : ""}`;
}

export function featureJourneyActions(routeKey: WingmanRouteKey, context: FeatureJourneyContext = {}): FeatureJourneyAction[] {
  return (relationships[routeKey] ?? [])
    .filter((action) => action.routeKey !== routeKey)
    .map((action) => ({ ...action, to: contextualPath(action.routeKey, context, action.mode) }));
}

export const featureJourneyRouteKeys = Object.freeze(Object.keys(relationships) as WingmanRouteKey[]);
