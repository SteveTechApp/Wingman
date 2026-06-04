import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";

type StartOption = {
  title: string;
  intent: string;
  action: string;
  to: string;
};

const startOptions: StartOption[] = [
  {
    title: "Guide a customer call",
    intent: "Use Call Coach for inbound calls, product-specific conversations, discovery, call-out day prompts and escalation checks.",
    action: "Open Call Coach",
    to: routeCatalogByKey.callCoach.path,
  },
  {
    title: "Position a specific WyreStorm product",
    intent: "Use Products to find a SKU, open Product Call Cards, build a product pitch or attach products to work in progress.",
    action: "Open Products",
    to: routeCatalogByKey.products.path,
  },
  {
    title: "Compare a competitor product",
    intent: "Use Compare when the customer names a competitor product and you need a GOOD MATCH, PARTIAL MATCH or NO MATCH decision.",
    action: "Open Compare",
    to: routeCatalogByKey.compare.path,
  },
  {
    title: "Review a document or BOM",
    intent: "Use Documents when a customer sends a scope, notes, BOM, email export or competitor specification.",
    action: "Open Documents",
    to: routeCatalogByKey.documents.path,
  },
  {
    title: "Create a response pack",
    intent: "Use Response Pack to create customer requirement summaries, suggested system shapes, products to review and review-gated output.",
    action: "Open Response Pack",
    to: routeCatalogByKey.responsePack.path,
  },
  {
    title: "Continue a project",
    intent: "Use Projects to resume saved calls, document reviews, comparisons, response packs and active work.",
    action: "Open Projects",
    to: routeCatalogByKey.projects.path,
  },
];

export function DashboardPage() {
  return (
    <main data-wingman-page="true" data-wingman-page-key="Home" className="wm-navhub-page wm-home-page">
      <section className="wm-navhub-hero" aria-labelledby="wingman-home-title">
        <p className="wm-navhub-eyebrow">WyreStorm Wingman</p>
        <h1 id="wingman-home-title">What are you trying to do?</h1>
        <p>
          Start from the customer task. Wingman will route you to the right tool without making you choose between
          overlapping feature names.
        </p>
      </section>

      <section className="wm-home-start-grid" aria-label="Wingman starting options">
        {startOptions.map((option) => (
          <Link key={option.title} to={option.to} className="wm-navhub-card">
            <span>{option.action}</span>
            <strong>{option.title}</strong>
            <p>{option.intent}</p>
          </Link>
        ))}
      </section>

      <section className="wm-navhub-secondary" aria-label="Wingman grouped destinations">
        <div>
          <p className="wm-navhub-eyebrow">Primary destinations</p>
          <h2>Grouped by user intent</h2>
        </div>
        <div className="wm-navhub-secondary-grid">
          {[
            routeCatalogByKey.callCoach,
            routeCatalogByKey.products,
            routeCatalogByKey.compare,
            routeCatalogByKey.documents,
            routeCatalogByKey.responsePack,
            routeCatalogByKey.projects,
            routeCatalogByKey.learn,
          ].map((route) => (
            <Link key={route.key} to={route.path} className="wm-navhub-card">
              <span>{route.navLabel}</span>
              <strong>{route.label}</strong>
              <p>{route.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
