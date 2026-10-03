import { PagedItems } from "../components/PagedItems";
import { ArrowRight, FileSearch, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";
import { HubCardArt, type HubCardArtKind } from "../components/HubCardArt";
import {
  canonicalWorkflowForRoute,
  installWorkflowAbandonmentTracking,
  type CanonicalWorkflowId,
  workflowTelemetry,
} from "../features/navigation";
import { SalesHelperPage } from "./SalesHelperPage";

const ProductCatalogueView = lazy(() => import("./CatalogBrowserPage").then((module) => ({ default: module.CatalogBrowserPage })));
const ProductFamiliesView = lazy(() => import("./ProductFamilyPage").then((module) => ({ default: module.ProductFamilyPage })));
const ProductCallCardsView = lazy(() => import("./ProductCallCardsPage"));
const ProductPositioningView = lazy(() => import("./ProductPitchPage").then((module) => ({ default: module.ProductPitchPage })));

function ProductWorkspaceMode({ view }: { view: string }) {
  const Page = view === "catalogue" ? ProductCatalogueView : view === "families" ? ProductFamiliesView : view === "call-cards" ? ProductCallCardsView : ProductPositioningView;
  return <Suspense fallback={<div className="wm-ui-card p-6">Loading Product Workspace…</div>}><Page /></Suspense>;
}
type PolishAccent = "aqua" | "blue" | "violet" | "magenta" | "amber" | "green";

export type HubAction = {
  title: string;
  intent: string;
  to: string;
  action: string;
  icon: LucideIcon;
  accent: PolishAccent;
  note?: string;
  linkLabel?: string;
  art?: HubCardArtKind;
  routeKey: WingmanRouteKey;
};

type HubPageProps = {
  eyebrow: string;
  title: string;
  intent: string;
  primaryActions: HubAction[];
  secondaryActions?: HubAction[];
  heroIcon: LucideIcon;
  accent: PolishAccent;
  tip: string;
  workflowId?: CanonicalWorkflowId;
  entryRoute?: WingmanRouteKey;
};

type RouteActionOptions = {
  note?: string;
  accent?: PolishAccent;
  linkLabel?: string;
  art?: HubCardArtKind;
};

export function routeAction(
  routeKey: WingmanRouteKey,
  title: string,
  intent: string,
  action: string,
  options: RouteActionOptions = {},
): HubAction {
  return {
    title,
    intent,
    action,
    note: options.note,
    linkLabel: options.linkLabel,
    accent: options.accent ?? "aqua",
    icon: routeCatalogByKey[routeKey].icon,
    to: routeCatalogByKey[routeKey].path,
    art: options.art,
    routeKey,
  };
}

export function HubCard({ item, workflowId }: { item: HubAction; workflowId?: CanonicalWorkflowId }) {
  const Icon = item.icon;
  const destinationWorkflowId = canonicalWorkflowForRoute(item.routeKey);

  return (
    <Link
      to={item.to}
      className={`wm-sh-choice-card wm-polish-card wm-polish-${item.accent}`}
      aria-label={`Open ${item.title} in Wingman`}
      onClick={() => {
        const selectedWorkflowId = workflowId ?? destinationWorkflowId;
        if (selectedWorkflowId) {
          workflowTelemetry.handoff(selectedWorkflowId, {
            destinationRoute: item.routeKey,
            source: "hub-card",
          });
          workflowTelemetry.complete(selectedWorkflowId, {
            destinationRoute: item.routeKey,
            completion: "hub-handoff",
          });
        }
      }}
    >
      <span className="wm-polish-card-icon" aria-hidden="true">
        <Icon />
      </span>

      <span className="wm-sh-choice-content wm-polish-card-copy">
        
        <span className="wm-sh-choice-title wm-polish-card-title">{item.title}</span>
        <span className="wm-sh-choice-body wm-polish-card-body">{item.intent}</span>
        
        <span className="wm-sh-choice-action wm-polish-card-link">
          {item.linkLabel ?? "Open in Wingman"}
          <ArrowRight aria-hidden="true" />
        </span>
      </span>

      <span
        className={`wm-polish-card-art${item.art ? ` wm-polish-card-art-${item.art}` : ""}`}
        aria-hidden="true"
      >
        {item.art ? <HubCardArt kind={item.art} /> : <Icon />}
      </span>
    </Link>
  );
}

function HubPage({
  eyebrow: _eyebrow,
  title,
  intent,
  primaryActions,
  secondaryActions = [],
  heroIcon: HeroIcon,
  accent,
  tip,
  workflowId,
  entryRoute,
}: HubPageProps) {
  const actions = [...primaryActions, ...secondaryActions];

  useEffect(() => {
    installWorkflowAbandonmentTracking();
    if (workflowId && entryRoute) {
      workflowTelemetry.start(workflowId, { entryRoute });
    }
  }, [entryRoute, workflowId]);

  return (
    <main
      data-wingman-page="true"
      data-wingman-page-key={title}
      className="wm-sh-page wm-polish-shell"
    >
      <section
        className={`wm-sh-page-hero wm-polish-hero wm-polish-${accent}`}
        aria-labelledby="wingman-navhub-title"
      >
        <span className="wm-polish-hero-icon" aria-hidden="true">
          <HeroIcon />
        </span>

        <div className="wm-polish-hero-copy">
          
          <h1 id="wingman-navhub-title">{title}</h1>
          <p>{intent}</p>
        </div>
      </section>

      <section className="wm-sh-page-section" aria-label={`${title} actions`}>
        <PagedItems items={actions} pageSize={4} resetKey={title}>{(pageItems) => (<div className="wm-sh-card-grid wm-polish-grid">
          {pageItems.map((item) => (
            <HubCard key={item.title} item={item} workflowId={workflowId} />
          ))}
        </div>)}</PagedItems>

        <details><summary>Help choosing a tool</summary><p>{tip}</p></details>
      </section>
    </main>
  );
}

export function CallCoachPage() {
  useEffect(() => {
    installWorkflowAbandonmentTracking();
    workflowTelemetry.start("sales-conversation", { entryRoute: "callCoach" });
  }, []);

  const governedStartingPoints = [
    routeAction(
      "productCallCards",
      "Product-specific call", "Prepare governed product proof and customer-ready talking points.",
      "Prepare product conversation",
      { accent: "aqua", linkLabel: "Open product call cards", art: "call-card" },
    ),
    routeAction(
      "discovery",
      "Discovery / requirement capture", "Capture the room, application and technical requirements before recommending.",
      "Capture requirements",
      { accent: "blue", linkLabel: "Start Discovery", art: "room" },
    ),
    routeAction(
      "salesHelper",
      "Call-out day", "Choose a conversation starting point and carry its context into the next workflow.",
      "Plan the next call",
      { accent: "green", linkLabel: "Open Sales Helper", art: "growth" },
    ),
    routeAction(
      "support",
      "Escalation check", "Find the right specialist path when a conversation needs technical confirmation.",
      "Check escalation path",
      { accent: "amber", linkLabel: "Open Support", art: "support" },
    ),
  ];

  return <div className="wm-polish-shell wm-call-coach-workspace">
    <section className="wm-sh-page-section" aria-label="Call Coach workflows">
      <PagedItems items={governedStartingPoints} pageSize={4} resetKey="call-coach">{(pageItems) => (<div className="wm-sh-card-grid wm-polish-grid">
        {pageItems.map((item) => <HubCard key={item.routeKey} item={item} workflowId="sales-conversation" />)}
      </div>)}</PagedItems>
    </section>
    <SalesHelperPage />
  </div>;
}

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");
  const activeView = view && ["catalogue", "families", "call-cards", "positioning"].includes(view)
    ? view
    : searchParams.has("sku") ? "positioning" : "catalogue";
  return <ProductWorkspaceMode view={activeView} />;
}
export function DocumentsPage() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("mode") === "publication") return <ResponsePackPage embedded />;
  return (
    <HubPage
      eyebrow="Wingman / Documents"
      title="Documents"
      intent="Customer sent me a document, BOM, scope or competitor specification. Help me understand what matters to WyreStorm."
      heroIcon={FileSearch}
      accent="violet"
      tip="Begin with Decode request for unstructured emails, BOMs or tender text, then move only the relevant items into Compare or Response Pack."
      workflowId="response-authoring"
      entryRoute="documents"
      primaryActions={[
        routeAction(
          "ingest",
          "Decode request",
          "Decode emails, RFIs, RFQs, BOMs, scopes and rough notes into requirements, unknowns, system shape and next action.",
          "Decode request",
          { accent: "violet", art: "decode" },
        ),
        routeAction(
          "templates",
          "Room / BOM templates",
          "Use editable room templates when the document resembles a known room archetype.",
          "Open templates",
          { accent: "aqua", art: "templates" },
        ),
        routeAction(
          "compare",
          "Competitor substitutions",
          "Check competitor items and decide whether WyreStorm has a good, partial or no-match path.",
          "Check substitutions",
          { accent: "amber", art: "competitor" },
        ),
        routeAction(
          "proposal",
          "Send to Response Pack",
          "Turn extracted requirements into a customer requirement summary and products-to-review output.",
          "Create response",
          { accent: "green", art: "proposal" },
        ),
      ]}
    />
  );
}

export function ResponsePackPage({ embedded = false }: { embedded?: boolean }) {
  return (
    <HubPage
      eyebrow={embedded ? "Wingman / Documents / Publication" : "Wingman / Response Pack"}
      title="Response Pack"
      intent="Create a usable response: quick email reply, RFI response, formal RFQ support, project summary, internal handover or schematic-backed response pack."
      heroIcon={FileText}
      accent="amber"
      tip="Start with Response Pack Builder when requirements and products are known; add a schematic only when it materially improves customer understanding."
      workflowId="response-authoring"
      entryRoute="responsePack"
      primaryActions={[
        routeAction(
          "proposal",
          "Response Pack Builder",
          "Build the customer-facing response, BOM-style product review list and review-gated output.",
          "Build response pack",
          { accent: "amber", art: "proposal" },
        ),
        routeAction(
          "support",
          "Review gates",
          "Check technical review, commercial review before quotation, escalation and completion gaps.",
          "Request review",
          { accent: "violet", art: "support" },
        ),
        routeAction(
          "proposalVisuals",
          "Create proposal visual",
          "Build a customer block diagram, governed technical schematic or conceptual room/application visual from the active project.",
          "Proposal visuals",
          { accent: "blue", art: "studio", linkLabel: "Choose visual type" },
        ),
        routeAction(
          "templates",
          "Template response",
          "Start from a room archetype when a known application template is enough.",
          "Use template",
          { accent: "green", art: "templates" },
        ),
      ]}
    />
  );
}
