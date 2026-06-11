import { useMemo } from "react";
import { getBestProductPositioningCardForSku } from "../../data/productPositioningCards";
import { DATA_CONFIDENCE_LABELS } from "../../types/productPositioning";
import type { ProductPositioningCard, ProductPositioningObjection } from "../../types/productPositioning";
import { ProductCallCardsShell } from "./ProductCallCardsShell";
import {
  findProduct,
  getLanguageAwareWording,
  getModeAwareWording,
  loadCallContext,
  navigateCallCardPage
} from "./store";
import type { ProductCallContext, ProductCallProduct } from "./store";

type ProductCallCardsProductPageProps = {
  sku?: string;
};

function ListBlock({ items }: { items: string[] }) {
  if (!items.length) return null;

  return (
    <ul className="wm-pcc-dashboard-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function firstText(values: unknown[], fallback = ""): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }

  return fallback;
}

function uniqueItems(values: string[], max = 5): string[] {
  return Array.from(new Set(values.map(cleanText).filter(Boolean))).slice(0, max);
}

function formatConfidence(value: ProductCallProduct["confidence"]): string {
  if (value === "high") return "High";
  if (value === "low") return "Low";
  return "Medium";
}

function buildProductIdentity(product: ProductCallProduct, card?: ProductPositioningCard): string[] {
  return uniqueItems([
    `Family: ${firstText([card?.productFamily, product.family], "WyreStorm")}`,
    `Role: ${firstText([card?.technologyType, product.category], "AV solution product")}`,
    `Best for: ${firstText([card?.bestFitApplications?.[0], product.goodFit[0], product.bestFor], product.bestFor)}`,
    `Avoid if: ${firstText([card?.weakFitApplications?.[0], product.avoidIf], product.avoidIf)}`,
  ], 4);
}

function buildScenarioCheckpoint(product: ProductCallProduct, context: ProductCallContext, card?: ProductPositioningCard) {
  const scenario = firstText(
    [
      context.knownRequirement,
      context.application,
      context.environment,
      card?.bestFitApplications?.[0],
      product.goodFit[0],
      product.bestFor,
    ],
    product.bestFor,
  );

  const fitLine = firstText([card?.oneLinePositioning, product.bestFor], product.bestFor);
  const trigger = firstText([card?.listenForTriggers?.[0], product.conversationStarters[0]], product.askNext[0]);
  const confirmation = firstText([card?.reviewGates?.[0], card?.technicalCheckQuestions?.[0], product.checks[0]], product.checks[0]);
  const pausePoint = firstText([card?.disqualifiers?.[0], product.avoidSaying[0], product.avoidIf], product.avoidIf);

  return {
    body: `Scenario: ${scenario}. Position ${product.sku} when the need matches this job: ${fitLine}`,
    items: uniqueItems([
      `Listen for: ${trigger}`,
      `Confirm: ${confirmation}`,
      `Pause if: ${pausePoint}`,
    ], 3),
  };
}

function buildObjectionHelpers(product: ProductCallProduct, card?: ProductPositioningCard): ProductPositioningObjection[] {
  if (card?.objectionHandling?.length) {
    return card.objectionHandling.slice(0, 3);
  }

  return product.objections.slice(0, 3).map((response) => ({
    objection: "Likely pushback",
    response,
  }));
}

function buildConfidenceItems(product: ProductCallProduct, card?: ProductPositioningCard): string[] {
  return uniqueItems([
    firstText([card?.reviewGates?.[0], product.checks[0]]),
    firstText([card?.openingQuestions?.[0], product.askNext[0]]),
    firstText([card?.followUpWording, product.followUp], product.followUp),
  ], 3);
}

export function ProductCallCardsProductPage({ sku }: ProductCallCardsProductPageProps) {
  const product = findProduct(sku);
  const context = loadCallContext();
  const positioningCard = getBestProductPositioningCardForSku(product.sku);
  const scenarioCheckpoint = buildScenarioCheckpoint(product, context, positioningCard);
  const objectionHelpers = buildObjectionHelpers(product, positioningCard);
  const confidenceItems = buildConfidenceItems(product, positioningCard);
  const productIdentity = buildProductIdentity(product, positioningCard);
  const dataConfidence = positioningCard
    ? DATA_CONFIDENCE_LABELS[positioningCard.dataConfidence]
    : "Call-card starter";

  const wording = useMemo(() => {
    if (context.wordingMode) {
      return getModeAwareWording(product, context);
    }

    return getLanguageAwareWording(product, context);
  }, [context, product]);

  const openResponsePack = () => {
    navigateCallCardPage(`/response/${encodeURIComponent(product.sku)}`);
  };

  return (
    <ProductCallCardsShell
      activeStep="product"
      title={`${product.sku} live product call card`}
      intro="Use this one product card during a call. Keep the conversation focused on what to say, what to ask, and what to check before recommending."
    >
      <section className="wm-pcc-panel">
        <article className="wm-pcc-dashboard-hero">
          <div>
            <p className="wm-pcc-eyebrow">{product.category}</p>
            <h2>{product.sku}</h2>
            <h3>{product.name}</h3>
            <p>{wording.headline}</p>
          </div>
          <div className="wm-pcc-confidence-badge" aria-label={`${formatConfidence(product.confidence)} sales confidence`}>
            <span>Sales confidence</span>
            <strong>{formatConfidence(product.confidence)}</strong>
            <small>{dataConfidence}</small>
          </div>
        </article>

        <section className="wm-pcc-helper-grid" aria-label={`${product.sku} sales helper cards`}>
          <article className="wm-pcc-helper-card">
            <span>Product identifier</span>
            <h2>Know what you are holding</h2>
            <p>{firstText([positioningCard?.salientPoint, product.whatItIs], product.whatItIs)}</p>
            <ListBlock items={productIdentity} />
          </article>

          <article className="wm-pcc-helper-card">
            <span>Scenario checkpoint</span>
            <h2>Use it in the right conversation</h2>
            <p>{scenarioCheckpoint.body}</p>
            <ListBlock items={scenarioCheckpoint.items} />
          </article>

          <article className="wm-pcc-helper-card wm-pcc-helper-card-objections">
            <span>Objection helper</span>
            <h2>Handle the likely pushback</h2>
            <ul className="wm-pcc-objection-list">
              {objectionHelpers.map((item) => (
                <li key={`${item.objection}-${item.response}`}>
                  <strong>{item.objection}</strong>
                  <span>{item.response}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="wm-pcc-helper-card">
            <span>Confidence cue</span>
            <h2>Keep the call under control</h2>
            <p>
              You can position this product confidently when you stay anchored to the product role, the scenario and the checks below before promising fit.
            </p>
            <ListBlock items={confidenceItems} />
          </article>
        </section>

        <section className="wm-pcc-dashboard-overview">
          <article className="wm-pcc-card">
            <h2>Say this first</h2>
            <p>{wording.salespersonAngle}</p>
          </article>

          <article className="wm-pcc-card">
            <h2>Why the customer should care</h2>
            <p>{wording.customerBenefit}</p>
          </article>

          <article className="wm-pcc-card">
            <h2>Ask only what affects fit</h2>
            <ListBlock items={product.askNext.slice(0, 5)} />
          </article>

          <article className="wm-pcc-card">
            <h2>Checks before recommending</h2>
            <ListBlock items={product.checks.slice(0, 5)} />
          </article>
        </section>

        <section className="wm-pcc-dashboard-overview">
          <article className="wm-pcc-card">
            <h2>Good fit</h2>
            <ListBlock items={product.goodFit.slice(0, 5)} />
          </article>

          <article className="wm-pcc-card">
            <h2>Do not over-position</h2>
            <p>{product.avoidIf}</p>
          </article>
        </section>

        <footer className="wm-pcc-actions">
          <button type="button" className="wm-pcc-secondary" onClick={() => navigateCallCardPage("/select")}>
            Change product
          </button>

          <button type="button" className="wm-pcc-primary" onClick={openResponsePack}>
            Create response wording
          </button>
        </footer>
      </section>
    </ProductCallCardsShell>
  );
}
