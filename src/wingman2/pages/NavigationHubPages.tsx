import { ArrowRight, BookOpen, Bot, Boxes, FileSearch, FileText, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey, type WingmanRouteKey } from "../app/routeCatalog";

type PolishAccent = "aqua" | "blue" | "violet" | "magenta" | "amber" | "green";

type HubAction = {
  title: string;
  intent: string;
  to: string;
  action: string;
  icon: LucideIcon;
  accent: PolishAccent;
  note?: string;
  linkLabel?: string;
};

type HubPageProps = {
  eyebrow: string;
  title: string;
  intent: string;
  subModes: string[];
  primaryActions: HubAction[];
  secondaryActions?: HubAction[];
  heroIcon: LucideIcon;
  accent: PolishAccent;
  tip: string;
};

type RouteActionOptions = {
  note?: string;
  accent?: PolishAccent;
  linkLabel?: string;
};

function routeAction(
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
  };
}

function HubCard({ item }: { item: HubAction }) {
  const Icon = item.icon;

  return (
    <Link to={item.to} className={`wm-navhub-card wm-polish-card wm-polish-${item.accent}`}>
      <span className="wm-polish-card-icon" aria-hidden="true">
        <Icon />
      </span>

      <span className="wm-polish-card-copy">
        <span className="wm-navhub-card-action wm-polish-card-kicker">{item.action}</span>
        <strong className="wm-polish-card-title">{item.title}</strong>
        <span className="wm-navhub-card-intent wm-polish-card-body">{item.intent}</span>
        {item.note ? <small className="wm-polish-card-note">{item.note}</small> : null}
        <span className="wm-polish-card-link">
          {item.linkLabel ?? "Open in Wingman"}
          <ArrowRight aria-hidden="true" />
        </span>
      </span>

      <span className="wm-polish-card-art" aria-hidden="true">
        <Icon />
      </span>
    </Link>
  );
}

function HubPage({
  eyebrow,
  title,
  intent,
  subModes,
  primaryActions,
  secondaryActions = [],
  heroIcon: HeroIcon,
  accent,
  tip,
}: HubPageProps) {
  return (
    <main
      data-wingman-page="true"
      data-wingman-page-key={title}
      className="wm-navhub-page wm-polish-shell"
    >
      <section
        className={`wm-navhub-hero wm-polish-hero wm-polish-${accent}`}
        aria-labelledby="wingman-navhub-title"
      >
        <span className="wm-polish-hero-icon" aria-hidden="true">
          <HeroIcon />
        </span>

        <div className="wm-polish-hero-copy">
          <p className="wm-navhub-eyebrow wm-polish-eyebrow">{eyebrow}</p>
          <h1 id="wingman-navhub-title">{title}</h1>
          <p>{intent}</p>
        </div>
      </section>

      <section className="wm-navhub-submodes" aria-label={`${title} sub-modes`}>
        {subModes.map((mode) => (
          <span key={mode}>{mode}</span>
        ))}
      </section>

      <section className="wm-navhub-grid wm-polish-grid" aria-label={`${title} primary actions`}>
        {primaryActions.map((item) => (
          <HubCard key={item.title} item={item} />
        ))}
      </section>

      {secondaryActions.length ? (
        <section
          className="wm-navhub-secondary wm-polish-secondary"
          aria-label={`${title} supporting tools`}
        >
          <div className="wm-polish-secondary-head">
            <p className="wm-navhub-eyebrow wm-polish-eyebrow">Supporting routes</p>
            <h2>Other useful tools</h2>
          </div>
          <div className="wm-navhub-secondary-grid wm-polish-grid wm-polish-grid-secondary">
            {secondaryActions.map((item) => (
              <HubCard key={item.title} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="wm-polish-tip">
        <Sparkles aria-hidden="true" />
        <span>
          <strong>Suggested starting point:</strong> {tip}
        </span>
      </div>
    </main>
  );
}

export function CallCoachPage() {
  return (
    <HubPage
      eyebrow="Wingman / Call Coach"
      title="Call Coach"
      intent="Live sales support for product conversations, customer discovery and escalation decisions."
      subModes={[
        "Product-specific call",
        "Discovery / requirement capture",
        "Call-out day",
        "Escalation check",
      ]}
      heroIcon={Bot}
      accent="aqua"
      tip="Begin with Capture Requirements when the customer has described an application but has not provided enough technical detail."
      primaryActions={[
        routeAction(
          "productCallCards",
          "Open SKU Call Card",
          "Search for a WyreStorm SKU and view what it is, what it does, how to position it and the key specification points.",
          "PRODUCT-SPECIFIC GUIDANCE",
          {
            accent: "aqua",
            linkLabel: "Choose product",
          },
        ),
        routeAction(
          "discovery",
          "Capture Requirements",
          "Record the application, sources, displays, distances, USB, audio, control and network requirements before selecting products.",
          "CUSTOMER DISCOVERY",
          {
            accent: "blue",
            linkLabel: "Start discovery",
          },
        ),
        routeAction(
          "salesHelper",
          "Open Sales Helper",
          "Choose whether the opportunity is room-led, display-led, UC-led, competitor-led, product-led or proposal-led.",
          "GUIDED CONVERSATION SUPPORT",
          {
            accent: "green",
            linkLabel: "Choose conversation type",
          },
        ),
        routeAction(
          "support",
          "Check Escalation",
          "Review complexity, missing information, compatibility risks and quote readiness before progressing.",
          "TECHNICAL REVIEW AND HANDOVER",
          {
            accent: "amber",
            linkLabel: "Check requirements",
          },
        ),
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
      subModes={["Find Product", "Product Families", "SKU Call Card", "Product Positioning", "Attach Products", "Follow-up Wording"]}
      heroIcon={Boxes}
      accent="blue"
      tip="Use Find Product when you know the requirement; use Product Families when you first need to understand the available technology routes."
      primaryActions={[
        routeAction(
          "finder",
          "Find Product",
          "Search the product intelligence index and move from requirement to shortlist.",
          "Find products",
          { accent: "blue" },
        ),
        routeAction(
          "productFamilies",
          "Product Families",
          "Understand the family-level story before choosing a SKU.",
          "Browse families",
          { accent: "violet" },
        ),
        routeAction(
          "productCallCards",
          "SKU Call Card",
          "Selection-first product call cards: choose a SKU before the detailed sales content appears.",
          "Select SKU first",
          {
            accent: "aqua",
            note: "Includes one-line positioning, one-minute brief, questions, listen-for triggers, objections, disqualifiers, attach products and follow-up wording.",
          },
        ),
        routeAction(
          "productPitch",
          "Product Dashboard",
          "Select a SKU and show product facts, I/O, what to say, what to ask and what to check before recommending.",
          "Open dashboard",
          { accent: "green" },
        ),
      ]}
      secondaryActions={[
        routeAction(
          "proposal",
          "Attach Products",
          "Carry selected products into response-pack output when the project is ready.",
          "Attach to output",
          { accent: "green" },
        ),
        routeAction(
          "compare",
          "Competitor route",
          "Start from a competitor product when the customer already has an alternative in mind.",
          "Compare competitor",
          { accent: "amber" },
        ),
        routeAction(
          "videowall",
          "Videowall Builder",
          "Shape LED or LCD wall signal flow when the product conversation is display-wall led.",
          "Open wall builder",
          { accent: "magenta" },
        ),
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
      heroIcon={FileSearch}
      accent="violet"
      tip="Begin with Decode request for unstructured emails, BOMs or tender text, then move only the relevant items into Compare or Response Pack."
      primaryActions={[
        routeAction(
          "ingest",
          "Decode request",
          "Decode emails, RFIs, RFQs, BOMs, scopes and rough notes into requirements, unknowns, system shape and next action.",
          "Decode request",
          { accent: "violet" },
        ),
        routeAction(
          "templates",
          "Room / BOM templates",
          "Use editable room templates when the document resembles a known room archetype.",
          "Open templates",
          { accent: "aqua" },
        ),
        routeAction(
          "compare",
          "Competitor substitutions",
          "Check competitor items and decide whether WyreStorm has a good, partial or no-match path.",
          "Check substitutions",
          { accent: "amber" },
        ),
        routeAction(
          "proposal",
          "Send to Response Pack",
          "Turn extracted requirements into a customer requirement summary and products-to-review output.",
          "Create response",
          { accent: "green" },
        ),
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
      heroIcon={FileText}
      accent="amber"
      tip="Start with Response Pack Builder when requirements and products are known; add a schematic only when it materially improves customer understanding."
      primaryActions={[
        routeAction(
          "proposal",
          "Response Pack Builder",
          "Build the customer-facing response, BOM-style product review list and review-gated output.",
          "Build response pack",
          { accent: "amber" },
        ),
        routeAction(
          "support",
          "Review gates",
          "Check technical review, commercial review before quotation, escalation and completion gaps.",
          "Request review",
          { accent: "violet" },
        ),
        routeAction(
          "visualStudio",
          "Visual Studio",
          "Create AV schematics and customer-facing concept visuals from captured requirements or sample scenarios.",
          "Open visual studio",
          { accent: "blue" },
        ),
        routeAction(
          "visualDesign",
          "Schematic Builder",
          "Create end-to-end schematics with WyreStorm devices, known third-party items and TBC products.",
          "Create schematic",
          { accent: "aqua" },
        ),
        routeAction(
          "templates",
          "Template response",
          "Start from a room archetype when a known application template is enough.",
          "Use template",
          { accent: "green" },
        ),
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
      subModes={["Glossary", "Support", "Training / reference"]}
      heroIcon={BookOpen}
      accent="green"
      tip="Use Glossary for a specific term and Product family learning when you need the broader sales and application context."
      primaryActions={[
        routeAction(
          "glossary",
          "Glossary",
          "Look up AV terms, acronyms and customer-safe explanations.",
          "Search terms",
          { accent: "green" },
        ),
        routeAction(
          "support",
          "Support guidance",
          "Find escalation guidance and completion gaps.",
          "Open support",
          { accent: "amber" },
        ),
        routeAction(
          "productFamilies",
          "Product family learning",
          "Learn how product families fit real sales conversations.",
          "Learn families",
          { accent: "blue" },
        ),
      ]}
    />
  );
}
