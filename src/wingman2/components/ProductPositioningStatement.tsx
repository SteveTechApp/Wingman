/**
 * ProductPositioningStatement
 *
 * A single, easy-to-read positioning statement for a WyreStorm product, used
 * across the product/sales surfaces in place of dense multi-box advisory layouts.
 *
 * It answers four things, in order:
 *   1. What it is
 *   2. Where it fits — the real-world problem it solves
 *   3. When & how to talk about it
 *   4. Worth mentioning (standout talking points)
 *
 * Content is drawn from curated product call cards where available, then from
 * each product record's `salesLanguage` block with sensible fallbacks.
 */

import { getBestProductPositioningCardForSku } from "../data/productPositioningCards";
import { buildProductSalesNarrative } from "../lib/productSalesPositioning";
import type {
  WingmanApplicationContext,
  WingmanAudience,
  WingmanCallMode,
} from "../types/productPositioning";

type RawProduct = Record<string, unknown>;

function isObject(value: unknown): value is RawProduct {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function asList(value: unknown, max = 4): string[] {
  if (Array.isArray(value)) {
    return value.map(asText).filter(Boolean).slice(0, max);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|;|•|\u2022/g)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, max);
  }
  return [];
}

function pickText(record: RawProduct, keys: string[]): string {
  for (const key of keys) {
    const value = asText(record[key]);
    if (value) return value;
  }
  return "";
}

export type ProductPositioningStatementProps = {
  product: RawProduct | null | undefined;
  /** Show the SKU/title/family header above the statement. Default: true. */
  showHeader?: boolean;
  audience?: WingmanAudience;
  callMode?: WingmanCallMode;
  application?: WingmanApplicationContext;
};

export function ProductPositioningStatement({
  product,
  showHeader = true,
  audience = "DEALER",
  callMode = "PROJECT_DISCOVERY",
  application = "GENERAL",
}: ProductPositioningStatementProps) {
  if (!isObject(product)) {
    return null;
  }

  const sl = isObject(product.salesLanguage) ? product.salesLanguage : {};
  const sku = pickText(product, ["sku", "id", "model"]);
  const title = pickText(product, ["name", "title", "productName"]) || sku;
  const family = pickText(product, ["family", "productFamily", "series"]);
  const category = pickText(product, ["category", "type", "productType"]);

  const headline = sku
    ? asText(sl.headline).replace(new RegExp(`^${sku}\\s*[:\\-–]\\s*`, "i"), "").trim()
    : asText(sl.headline);
  const summary = asText(sl.plainEnglishSummary) || pickText(product, ["description", "summary", "overview"]);
  const whatItIs = headline || summary || [title, category].filter(Boolean).join(" — ");
  const realWorld = asText(sl.realWorldApplication);
  const customerValue = asText(sl.customerValue);
  const howToTalk = asText(sl.salespersonCue);
  const talkTrack = asList(sl.talkTrack, 4);
  const points = talkTrack.length > 0 ? talkTrack : asList(product.features, 4);
  const card = sku ? getBestProductPositioningCardForSku(sku) : undefined;
  const narrative = buildProductSalesNarrative({
    product: {
      sku,
      title,
      family,
      category,
      whatItIs,
      summary,
      realWorld,
      customerValue,
      howToTalk,
      talkingPoints: points,
      features: asList(product.features, 8),
      applications: asList(product.applications, 8),
    },
    card,
    audience,
    callMode,
    application,
  });

  return (
    <div
      className="wm-positioning-statement"
      style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }}
    >
      {showHeader ? (
        <div>
          {family ? <p className="wm-product-call-card-selector-label">{family}</p> : null}
          <h2 style={{ margin: 0 }}>{sku || title}</h2>
          {title && title !== sku ? <p style={{ margin: "2px 0 0" }}>{title}</p> : null}
        </div>
      ) : null}

      <section className="wm-product-call-card-panel">
        <h3>Say this</h3>
        <p>{narrative.sayThis}</p>
      </section>

      <section className="wm-product-call-card-panel">
        <h3>Why it fits</h3>
        <p>{narrative.whyItFits}</p>
        <p>{narrative.applicationAngle}</p>
        <p>{narrative.audienceAngle}</p>
        <p>{narrative.callModeAngle}</p>
      </section>

      {narrative.askNext.length > 0 ? (
        <section className="wm-product-call-card-panel">
          <h3>Ask next</h3>
          <ul>
            {narrative.askNext.slice(0, 4).map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="wm-product-call-card-panel">
        <h3>What to check before quoting</h3>
        <ul>
          {narrative.checkBeforeQuoting.slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default ProductPositioningStatement;
