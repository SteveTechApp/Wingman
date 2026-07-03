import { useMemo } from "react";
import { getBestProductPositioningCardForSku } from "../../data/productPositioningCards";
import { getProductCallCommercialOverride } from "../../lib/productCallCommercialOverrides";
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
  const knownContext = uniqueItems([
    firstText([context.roomType, context.environment]),
    firstText([context.application, context.knownRequirement]),
  ], 2);
  const scenario = knownContext.length > 0
    ? knownContext.join(" - ")
    : firstText([card?.bestFitApplications?.[0], product.goodFit[0], product.bestFor], product.bestFor);

  const productJob = product.whatItDoes.replace(/^it\s+/i, "").replace(/[.!?]+$/, "");
  const trigger = firstText([card?.listenForTriggers?.[0], product.conversationStarters[0]], product.askNext[0]);
  const confirmation = firstText([card?.reviewGates?.[0], card?.technicalCheckQuestions?.[0], product.checks[0]], product.checks[0]);
  const pausePoint = firstText([card?.disqualifiers?.[0], product.avoidSaying[0], product.avoidIf], product.avoidIf);

  return {
    scenario,
    body: `For ${scenario}, ${product.sku} ${productJob.charAt(0).toLowerCase()}${productJob.slice(1)}.`,
    confirmation: `I'm treating this as ${scenario}. Can you confirm ${confirmation
      .replace(/^confirm\s+/i, "")
      .replace(/[.!?]+$/, "")
      .toLowerCase()}?`,
    items: uniqueItems([
      `Listen for: ${trigger}`,
      `Confirm: ${confirmation}`,
      `Pause if: ${pausePoint}`,
    ], 3),
  };
}

function buildObjectionHelpers(product: ProductCallProduct, card?: ProductPositioningCard): ProductPositioningObjection[] {
  const commercialOverride = getProductCallCommercialOverride(product.sku);

  if (commercialOverride?.objections?.length) {
    return commercialOverride.objections.slice(0, 3).map((response, index) => ({
      objection: index === 0 ? "Likely pushback" : "What to clarify",
      response,
    }));
  }

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
      intro="Use this during the call for a simple explanation, the application fit and one point to confirm."
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

        <section className="wm-pcc-helper-grid" aria-label={`${product.sku} simple sales guidance`}>
          <article className="wm-pcc-helper-card">
            <span>Simple answer</span>
            <h2>What it does</h2>
            <p>{product.whatItDoes}</p>
            <p><strong>Technical description:</strong> {firstText([positioningCard?.salientPoint, product.whatItIs], product.whatItIs)}</p>
          </article>

          <article className="wm-pcc-helper-card">
            <span>Known application</span>
            <h2>How it fits here</h2>
            <p>{scenarioCheckpoint.body}</p>
          </article>

          <article className="wm-pcc-helper-card">
            <span>Ready-to-use wording</span>
            <h2>Say it like this</h2>
            <p>{wording.salespersonAngle}</p>
          </article>

          <article className="wm-pcc-helper-card">
            <span>One question</span>
            <h2>Confirm this</h2>
            <p>{scenarioCheckpoint.confirmation}</p>
          </article>
        </section>

        <details className="wm-pcc-card">
          <summary>More product and quote detail</summary>
          <section className="wm-pcc-dashboard-overview">
            <article className="wm-pcc-card">
              <h2>Product detail</h2>
              <ListBlock items={productIdentity} />
            </article>

            <article className="wm-pcc-card">
              <h2>Good fit</h2>
              <ListBlock items={product.goodFit.slice(0, 4)} />
            </article>

            <article className="wm-pcc-card">
              <h2>Checks before recommending</h2>
              <ListBlock items={confidenceItems} />
            </article>

            <article className="wm-pcc-card">
              <h2>Do not over-position</h2>
              <p>{product.avoidIf}</p>
            </article>

            <article className="wm-pcc-card wm-pcc-helper-card-objections">
              <h2>Objection help</h2>
              <ul className="wm-pcc-objection-list">
                {objectionHelpers.map((item) => (
                  <li key={`${item.objection}-${item.response}`}>
                    <strong>{item.objection}</strong>
                    <span>{item.response}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="wm-pcc-card">
              <h2>Other checks</h2>
              <ListBlock items={scenarioCheckpoint.items} />
            </article>
          </section>
        </details>

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
