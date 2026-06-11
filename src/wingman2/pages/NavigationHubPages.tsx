import { Link } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";

type HubAction = {
  title: string;
  intent: string;
  to: string;
  action: string;
  note?: string;
};

type HubPageProps = {
  eyebrow: string;
  title: string;
  intent: string;
  subModes: string[];
  primaryActions: HubAction[];
  secondaryActions?: HubAction[];
};

function routeAction(routeKey: WingmanRouteKey, title: string, intent: string, action: string, note?: string): HubAction {
  return {
    title,
    intent,
    action,
    note,
    to: routeCatalogByKey[routeKey].path,
  };
}

function HubCard({ item }: { item: HubAction }) {
  return (
    <Link to={item.to} className="wm-navhub-card">
      <span>{item.action}</span>
      <strong>{item.title}</strong>
      <p>{item.intent}</p>
      {item.note ? <small>{item.note}</small> : null}
    </Link>
  );
}

function HubPage({ eyebrow, title, intent, subModes, primaryActions, secondaryActions = [] }: HubPageProps) {
  return (
    <main data-wingman-page="true" data-wingman-page-key={title} className="wm-navhub-page">
      <section className="wm-navhub-hero" aria-labelledby="wingman-navhub-title">
        <p className="wm-navhub-eyebrow">{eyebrow}</p>
        <h1 id="wingman-navhub-title">{title}</h1>
        <p>{intent}</p>
      </section>

      <section className="wm-navhub-submodes" aria-label={`${title} sub-modes`}>
        {subModes.map((mode) => (
          <span key={mode}>{mode}</span>
        ))}
      </section>

      <section className="wm-navhub-grid" aria-label={`${title} primary actions`}>
        {primaryActions.map((item) => (
          <HubCard key={item.title} item={item} />
        ))}
      </section>

      {secondaryActions.length ? (
        <section className="wm-navhub-secondary" aria-label={`${title} supporting tools`}>
          <div>
            <p className="wm-navhub-eyebrow">Still available</p>
            <h2>Supporting tools</h2>
          </div>
          <div className="wm-navhub-secondary-grid">
            {secondaryActions.map((item) => (
              <HubCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

export function CallCoachPage() {
  return (
    <HubPage
      eyebrow="Wingman / Call Coach"
      title="Call Coach"
      intent="Help me manage a sales conversation: listen, ask the next question, capture requirements, position a product, or decide when to escalate."
      subModes={["Inbound call", "Product-specific call", "Discovery / requirement capture", "Call-out day", "Escalation check"]}
      primaryActions={[
        routeAction("callCards", "Inbound call", "Use live call cards to guide a customer conversation and hand off useful notes.", "Guide a live call"),
        routeAction("productCallCards", "Product-specific call", "Select a SKU first, then load positioning, questions, objections, disqualifiers and follow-up wording.", "Open SKU call card"),
        routeAction("discovery", "Discovery / requirement capture", "Capture room purpose, sources, displays, USB, infrastructure and missing details.", "Capture requirements"),
        routeAction("salesHelper", "Call-out day", "Use rep guidance, readiness cues and call-out day prompts during active opportunity work.", "Open sales helper"),
        routeAction("support", "Escalation check", "Check whether technical review, support input or internal handover is needed.", "Check escalation"),
      ]}
    />
  );
}

export function ProductsPage() {
  return (
    <HubPage
      eyebrow="Wingman / Products"
      title="Products"
      intent="Help me find, understand or position a WyreStorm product."
      subModes={["Find Product", "Product Families", "SKU Call Card", "Product Pitch", "Attach Products", "Follow-up Wording"]}
      primaryActions={[
        routeAction("finder", "Find Product", "Search the product intelligence index and move from requirement to shortlist.", "Find products"),
        routeAction("productFamilies", "Product Families", "Understand the family-level story before choosing a SKU.", "Browse families"),
        routeAction(
          "productCallCards",
          "SKU Call Card",
          "Selection-first product call cards: choose a SKU before the detailed sales content appears.",
          "Select SKU first",
          "Includes one-line positioning, one-minute brief, questions, listen-for triggers, objections, disqualifiers, attach products and follow-up wording.",
        ),
        routeAction("productPitch", "Product Dashboard", "Select a SKU and show product facts, I/O, what to say, what to ask and what to check before recommending.", "Open dashboard"),
      ]}
      secondaryActions={[
        routeAction("proposal", "Attach Products", "Carry selected products into response-pack output when the project is ready.", "Attach to output"),
        routeAction("compare", "Competitor route", "Start from a competitor product when the customer already has an alternative in mind.", "Compare competitor"),
        routeAction("videowall", "Videowall Builder", "Shape LED or LCD wall signal flow when the product conversation is display-wall led.", "Open wall builder"),
      ]}
    />
  );
}

export function DocumentsPage() {
  return (
    <HubPage
      eyebrow="Wingman / Documents"
      title="Documents"
      intent="Customer sent me a document, BOM, scope or competitor specification. Help me understand what matters to WyreStorm."
      subModes={["Upload / Paste", "Extracted Items", "WyreStorm Relevance", "Competitor Substitutions", "Clarification Questions", "Send to Response Pack"]}
      primaryActions={[
        routeAction("ingest", "Decode request", "Decode emails, RFIs, RFQs, BOMs, scopes and rough notes into requirements, unknowns, system shape and next action.", "Decode request"),
        routeAction("templates", "Room / BOM templates", "Use editable room templates when the document resembles a known room archetype.", "Open templates"),
        routeAction("compare", "Competitor substitutions", "Check competitor items and decide whether WyreStorm has a good, partial or no-match path.", "Check substitutions"),
        routeAction("proposal", "Send to Response Pack", "Turn extracted requirements into a customer requirement summary and products-to-review output.", "Create response"),
      ]}
    />
  );
}

export function ResponsePackPage() {
  return (
    <HubPage
      eyebrow="Wingman / Response Pack"
      title="Response Pack"
      intent="Create a usable response: quick email reply, RFI response, formal RFQ support, project summary, internal handover or schematic-backed response pack."
      subModes={["Customer requirement summary", "Suggested system shape", "Products to review", "Technical review required", "Commercial review required before quotation"]}
      primaryActions={[
        routeAction("proposal", "Response Pack Builder", "Build the customer-facing response, BOM-style product review list and review-gated output.", "Build response pack"),
        routeAction("support", "Review gates", "Check technical review, commercial review before quotation, escalation and completion gaps.", "Request review"),
        routeAction("visualDesign", "Schematic Builder", "Create end-to-end schematics with WyreStorm devices, known third-party items and TBC products.", "Create schematic"),
        routeAction("templates", "Template response", "Start from a room archetype when a known application template is enough.", "Use template"),
      ]}
    />
  );
}

export function LearnPage() {
  return (
    <HubPage
      eyebrow="Wingman / Learn"
      title="Learn"
      intent="Help me understand AV terms, products, sales guidance or support context."
      subModes={["Glossary", "Product Intelligence", "Support", "Training / reference"]}
      primaryActions={[
        routeAction("glossary", "Glossary", "Look up AV terms, acronyms and customer-safe explanations.", "Search terms"),
        routeAction("intelligence", "Product Intelligence", "Review product data, classification and source confidence.", "Review intelligence"),
        routeAction("support", "Support guidance", "Find escalation guidance and completion gaps.", "Open support"),
        routeAction("productFamilies", "Product family learning", "Learn how product families fit real sales conversations.", "Learn families"),
      ]}
    />
  );
}
