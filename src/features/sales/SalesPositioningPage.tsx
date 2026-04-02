import { startTransition, useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { getCatalogProducts } from "@/catalog/repository";
import type { CatalogProduct } from "@/catalog/types";
import SplitWorkspaceFrame from "@/components/workspace/SplitWorkspaceFrame";
import { WM_ROUTES } from "@/core/wingman/routeMap";
import { getActiveProject, subscribeProjects } from "@/features/projects/projectStore";
import {
  SALES_CONVERSATION_CARDS,
  SALES_PITCH_MODULES,
  buildProductPositioningGuide,
} from "./salesPositioningContent";
import "./sales-positioning-page.css";

type SalesWorkspaceMode = "product" | "flashcards" | "brand";

function tidy(value: unknown): string {
  return String(value ?? "").trim();
}

function buildSearchBlob(product: CatalogProduct): string {
  return [
    product.sku,
    product.name,
    product.family,
    product.category,
    product.subcategory,
    product.summary,
    product.technology,
    product.transport,
    ...(product.features || []),
    ...(product.normalizedTags || []),
    ...(product.matchKeywords || []),
    ...(product.control || []),
    ...(product.audio || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildMetricLabel(product: CatalogProduct): string {
  const parts = [product.family, product.category, product.transport].map((value) => tidy(value)).filter(Boolean);
  return parts.slice(0, 3).join(" | ");
}

function joinParagraphs(lines: string[]): string {
  return lines.filter(Boolean).join("\n");
}

function uniqueStrings(values: Array<string | undefined | null>, limit = 6): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

export default function SalesPositioningPage() {
  const activeProject = useSyncExternalStore(subscribeProjects, getActiveProject, () => undefined);
  const products = useMemo(
    () => getCatalogProducts().filter((product) => product.status !== "legacy"),
    [],
  );
  const families = useMemo(
    () => ["All", ...Array.from(new Set(products.map((product) => tidy(product.family)).filter(Boolean))).sort()],
    [products],
  );
  const defaultSku = useMemo(
    () => products.find((product) => product.sku === "NHD-500-TX")?.sku || products[0]?.sku || "",
    [products],
  );

  const [mode, setMode] = useState<SalesWorkspaceMode>("product");
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("All");
  const [selectedSku, setSelectedSku] = useState(defaultSku);
  const [selectedFlashCardId, setSelectedFlashCardId] = useState(SALES_CONVERSATION_CARDS[0]?.id || "");
  const [selectedPitchId, setSelectedPitchId] = useState(SALES_PITCH_MODULES[0]?.id || "wyrestorm");
  const [status, setStatus] = useState("");

  const deferredQuery = useDeferredValue(query);
  const normalizedFamilyOptions = useMemo(
    () => new Map(families.map((item) => [tidy(item).toLowerCase(), item])),
    [families],
  );

  const filteredProducts = useMemo(() => {
    const familyKey = tidy(family).toLowerCase();
    const q = tidy(deferredQuery).toLowerCase();

    return products.filter((product) => {
      const matchesFamily = familyKey === "all" || tidy(product.family).toLowerCase() === familyKey;
      if (!matchesFamily) return false;
      if (!q) return true;
      return buildSearchBlob(product).includes(q);
    });
  }, [deferredQuery, family, products]);

  useEffect(() => {
    if (!filteredProducts.length) return;
    if (!filteredProducts.some((product) => product.sku === selectedSku)) {
      setSelectedSku(filteredProducts[0].sku);
    }
  }, [filteredProducts, selectedSku]);

  useEffect(() => {
    if (!selectedSku && defaultSku) {
      setSelectedSku(defaultSku);
    }
  }, [defaultSku, selectedSku]);

  const selectedProduct = useMemo(() => {
    if (filteredProducts.length === 0) return null;
    return filteredProducts.find((product) => product.sku === selectedSku) || filteredProducts[0] || null;
  }, [filteredProducts, selectedSku]);

  const productGuide = useMemo(
    () => (selectedProduct ? buildProductPositioningGuide(selectedProduct) : null),
    [selectedProduct],
  );
  const selectedProductTags = useMemo(
    () =>
      selectedProduct
        ? uniqueStrings([
            ...(selectedProduct.features || []),
            ...(selectedProduct.normalizedTags || []),
            ...(selectedProduct.matchKeywords || []),
          ])
        : [],
    [selectedProduct],
  );
  const visibleProducts = useMemo(() => {
    if (filteredProducts.length <= 12) return filteredProducts;

    const topProducts = filteredProducts.slice(0, 12);
    if (!selectedSku || topProducts.some((product) => product.sku === selectedSku)) {
      return topProducts;
    }

    const selectedMatch = filteredProducts.find((product) => product.sku === selectedSku);
    return selectedMatch ? [...topProducts.slice(0, 11), selectedMatch] : topProducts;
  }, [filteredProducts, selectedSku]);

  const selectedFlashCard = useMemo(
    () =>
      SALES_CONVERSATION_CARDS.find((card) => card.id === selectedFlashCardId) ||
      SALES_CONVERSATION_CARDS[0] ||
      null,
    [selectedFlashCardId],
  );

  const selectedPitch = useMemo(
    () =>
      SALES_PITCH_MODULES.find((pitch) => pitch.id === selectedPitchId) ||
      SALES_PITCH_MODULES[0] ||
      null,
    [selectedPitchId],
  );

  function focusSku(sku: string) {
    startTransition(() => {
      setMode("product");
      setFamily("All");
      setQuery(sku);
      setSelectedSku(sku);
    });
  }

  function focusFamily(targetFamily: string) {
    const resolvedFamily = normalizedFamilyOptions.get(tidy(targetFamily).toLowerCase());

    startTransition(() => {
      setMode("product");
      if (resolvedFamily && resolvedFamily !== "All") {
        setFamily(resolvedFamily);
        setQuery("");
        return;
      }

      setFamily("All");
      setQuery(targetFamily);
    });
  }

  function openFlashCard(cardId: string) {
    setMode("flashcards");
    setSelectedFlashCardId(cardId);
  }

  function openPitch(pitchId: string) {
    setMode("brand");
    setSelectedPitchId(pitchId);
  }

  async function copyText(label: string, text: string) {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard access is not available in this browser.");
      }
      await navigator.clipboard.writeText(text);
      setStatus(`${label} copied to the clipboard.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `Could not copy ${label.toLowerCase()}.`);
    }
  }

  const left = (
    <div className="wm-workspace-stack wm-sales-page__column">
      <div className="wm-start-step">
        Build the story before the customer call. Search a SKU when you already know the product,
        use flash cards when you need an outcome-led opener, or pull a WyreStorm elevator pitch to
        start the conversation with more confidence.
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Enablement view</h3>
          <p className="wm-workspace-card__copy">
            Move between product talk tracks, guided flash cards, and the wider WyreStorm story
            without leaving the workspace.
          </p>
        </div>

        <div className="wm-workspace-tab-row">
          <button
            type="button"
            className={`wm-workspace-tab${mode === "product" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setMode("product")}
          >
            Product positioning
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${mode === "flashcards" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setMode("flashcards")}
          >
            Flash cards
          </button>
          <button
            type="button"
            className={`wm-workspace-tab${mode === "brand" ? " wm-workspace-tab--active" : ""}`}
            onClick={() => setMode("brand")}
          >
            Position WyreStorm
          </button>
        </div>
      </section>

      <section className="wm-workspace-card wm-sales-page__project-context">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Current context</h3>
          <p className="wm-workspace-card__copy">
            The sales workspace works without an active project, but it can still sit alongside the
            live opportunity when one is open.
          </p>
        </div>

        {activeProject ? (
          <div className="wm-workspace-list-item">
            <span className="wm-workspace-list-item__eyebrow">Active project</span>
            <span className="wm-workspace-list-item__title">{activeProject.name}</span>
            <span className="wm-workspace-list-item__copy">
              {activeProject.customer ? `${activeProject.customer} | ` : ""}
              {tidy(activeProject.discovery?.applicationType) ||
                tidy(activeProject.discovery?.workflowTrack) ||
                "General AV opportunity"}
            </span>
          </div>
        ) : (
          <div className="wm-workspace-empty">
            No active project is linked right now. Use this page as a stand-alone sales coach, then
            jump into Compare, Product Intelligence, or Proposal when the conversation is ready.
          </div>
        )}
      </section>

      {mode === "product" ? (
        <>
          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">Find a WyreStorm SKU</h3>
              <p className="wm-workspace-card__copy">
                Search by SKU, family, or outcome, then use the right-hand panel as the live talk
                track for the customer conversation.
              </p>
            </div>

            <div className="wm-workspace-form">
              <div className="wm-workspace-field">
                <label htmlFor="sales-positioning-query">Search</label>
                <input
                  id="sales-positioning-query"
                  className="wm-input-dark"
                  type="text"
                  placeholder="SKU, range, feature, use case"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <div className="wm-workspace-grid-2">
                <div className="wm-workspace-field">
                  <label htmlFor="sales-positioning-family">Family</label>
                  <select
                    id="sales-positioning-family"
                    className="wm-input-dark"
                    value={family}
                    onChange={(event) => setFamily(event.target.value)}
                  >
                    {families.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="wm-workspace-metric">
                  <span>Matches</span>
                  <strong>{filteredProducts.length}</strong>
                </div>
              </div>
            </div>

            <div className="wm-next-step">
              Search by exact SKU when the customer already has a model in mind. Search by family or
              outcome when you are still helping them understand what category of WyreStorm solution
              fits the opportunity.
            </div>
          </section>

          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">Shortlist</h3>
              <p className="wm-workspace-card__copy">
                Pick the product you want to talk through. The first twelve matching products stay in
                view so the list remains easy to scan during a call.
              </p>
            </div>

            {visibleProducts.length > 0 ? (
              <div className="wm-workspace-list wm-sales-page__selector-list">
                {visibleProducts.map((product) => (
                  <button
                    key={product.sku}
                    type="button"
                    className={`wm-workspace-list-item wm-sales-page__selector-item${selectedProduct?.sku === product.sku ? " wm-workspace-list-item--active" : ""}`}
                    aria-pressed={selectedProduct?.sku === product.sku}
                    onClick={() => setSelectedSku(product.sku)}
                  >
                    <span className="wm-workspace-list-item__eyebrow">{product.sku}</span>
                    <span className="wm-workspace-list-item__title">{product.name}</span>
                    <span className="wm-workspace-list-item__copy">{buildMetricLabel(product)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="wm-workspace-empty">
                No WyreStorm products matched that search. Try a broader family, clear the query, or
                search by a simpler customer outcome.
              </div>
            )}
          </section>
        </>
      ) : null}

      {mode === "flashcards" ? (
        <>
          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">Conversation starters</h3>
              <p className="wm-workspace-card__copy">
                Start with the customer outcome before you narrow into product. This keeps the sales
                conversation confident even when the person using Wingman is not the AV expert.
              </p>
            </div>
            <div className="wm-next-step">
              Pick the outcome the customer is describing. Use the right-hand coaching panel to ask
              better questions, then jump back into Product Positioning when a family or SKU becomes
              obvious.
            </div>
          </section>

          <section className="wm-workspace-card">
            <div className="wm-workspace-list wm-sales-page__selector-list">
              {SALES_CONVERSATION_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`wm-workspace-list-item wm-sales-page__selector-item${selectedFlashCard?.id === card.id ? " wm-workspace-list-item--active" : ""}`}
                  aria-pressed={selectedFlashCard?.id === card.id}
                  onClick={() => setSelectedFlashCardId(card.id)}
                >
                  <span className="wm-workspace-list-item__eyebrow">{card.outcome}</span>
                  <span className="wm-workspace-list-item__title">{card.title}</span>
                  <span className="wm-workspace-list-item__copy">{card.opener}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {mode === "brand" ? (
        <>
          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">Position WyreStorm</h3>
              <p className="wm-workspace-card__copy">
                Use this when you need a cleaner opening story for the company, the platform, or one
                of the core ranges before you drop into product-level detail.
              </p>
            </div>
            <div className="wm-next-step">
              Open with the range story, earn the customer&apos;s confidence, then narrow into the
              right product family and SKU once the need is better defined.
            </div>
          </section>

          <section className="wm-workspace-card">
            <div className="wm-workspace-list wm-sales-page__selector-list">
              {SALES_PITCH_MODULES.map((pitch) => (
                <button
                  key={pitch.id}
                  type="button"
                  className={`wm-workspace-list-item wm-sales-page__selector-item${selectedPitch?.id === pitch.id ? " wm-workspace-list-item--active" : ""}`}
                  aria-pressed={selectedPitch?.id === pitch.id}
                  onClick={() => setSelectedPitchId(pitch.id)}
                >
                  <span className="wm-workspace-list-item__eyebrow">{pitch.eyebrow}</span>
                  <span className="wm-workspace-list-item__title">{pitch.title}</span>
                  <span className="wm-workspace-list-item__copy">{pitch.elevatorPitch}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );

  const right = mode === "product" ? (
    selectedProduct && productGuide ? (
      <div className="wm-workspace-stack wm-sales-page__column wm-sales-page__column--output">
        <section className="wm-workspace-card wm-workspace-card--muted wm-sales-page__hero-card">
          <div className="wm-workspace-card__header">
            <span className="wm-workspace-list-item__eyebrow">{selectedProduct.sku}</span>
            <h3 className="wm-workspace-card__title">{selectedProduct.name}</h3>
            <p className="wm-workspace-card__copy">{productGuide.headline}</p>
          </div>

          <div className="wm-workspace-prose">{productGuide.elevatorPitch}</div>

          <div className="wm-workspace-grid-3 wm-sales-page__meta-grid">
            <div className="wm-workspace-metric">
              <span>Family</span>
              <strong>{selectedProduct.family}</strong>
            </div>
            <div className="wm-workspace-metric">
              <span>Category</span>
              <strong>{selectedProduct.category}</strong>
            </div>
            <div className="wm-workspace-metric">
              <span>Transport</span>
              <strong>{tidy(selectedProduct.transport) || "General AV"}</strong>
            </div>
          </div>

          <div className="wm-workspace-tag-row">
            {selectedProductTags.map((tag) => (
              <span key={tag} className="wm-workspace-tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="wm-workspace-action-row">
            <button
              type="button"
              className="wm-btn-primary"
              onClick={() =>
                void copyText(
                  `${selectedProduct.sku} positioning pitch`,
                  joinParagraphs([
                    `${selectedProduct.sku} | ${selectedProduct.name}`,
                    productGuide.elevatorPitch,
                    "How to position it:",
                    ...productGuide.positioningHighlights.map((item) => `- ${item}`),
                    "Questions to ask:",
                    ...productGuide.discoveryQuestions.map((item) => `- ${item}`),
                  ]),
                )
              }
            >
              Copy talk track
            </button>
            <button
              type="button"
              className="wm-btn-secondary"
              onClick={() => openFlashCard(productGuide.recommendedFlashCardId)}
            >
              Open matching flash card
            </button>
            <button
              type="button"
              className="wm-btn-secondary"
              onClick={() => openPitch(productGuide.recommendedPitchId)}
            >
              Open range pitch
            </button>
            <Link to={WM_ROUTES.COMPARE} className="wm-btn">
              Compare against competition
            </Link>
            <Link to={WM_ROUTES.PRODUCT_INTELLIGENCE} className="wm-btn">
              Product intelligence
            </Link>
            {selectedProduct.sourceUrl ? (
              <a href={selectedProduct.sourceUrl} target="_blank" rel="noreferrer" className="wm-btn">
                Manufacturer page
              </a>
            ) : null}
          </div>
        </section>

        <div className="wm-sales-page__support-grid">
          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">How to position it</h3>
              <p className="wm-workspace-card__copy">
                Use these lines to translate the spec sheet into customer language.
              </p>
            </div>
            <ul className="wm-sales-page__bullet-list">
              {productGuide.positioningHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">Questions to ask next</h3>
              <p className="wm-workspace-card__copy">
                Keep the conversation moving toward a better-fit WyreStorm recommendation.
              </p>
            </div>
            <ul className="wm-sales-page__bullet-list">
              {productGuide.discoveryQuestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="wm-workspace-card">
          <div className="wm-workspace-card__header">
            <h3 className="wm-workspace-card__title">Proof points to promote</h3>
            <p className="wm-workspace-card__copy">{productGuide.rangeConnection}</p>
          </div>
          <ul className="wm-sales-page__bullet-list">
            {productGuide.proofPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    ) : (
      <div className="wm-workspace-empty">
        No product matches the current search. Clear the query or switch to a broader family to get
        back to a usable sales story.
      </div>
    )
  ) : mode === "flashcards" ? (
    selectedFlashCard ? (
      <div className="wm-workspace-stack wm-sales-page__column wm-sales-page__column--output">
        <section className="wm-workspace-card wm-workspace-card--muted wm-sales-page__hero-card">
          <div className="wm-workspace-card__header">
            <span className="wm-workspace-list-item__eyebrow">{selectedFlashCard.outcome}</span>
            <h3 className="wm-workspace-card__title">{selectedFlashCard.title}</h3>
            <p className="wm-workspace-card__copy">{selectedFlashCard.opener}</p>
          </div>

          <div className="wm-workspace-action-row">
            <button
              type="button"
              className="wm-btn-primary"
              onClick={() =>
                void copyText(
                  `${selectedFlashCard.title} flash card`,
                  joinParagraphs([
                    selectedFlashCard.title,
                    selectedFlashCard.opener,
                    "Qualification questions:",
                    ...selectedFlashCard.qualificationQuestions.map((item) => `- ${item}`),
                    "How to position WyreStorm:",
                    ...selectedFlashCard.wyrestormAngles.map((item) => `- ${item}`),
                  ]),
                )
              }
            >
              Copy flash card
            </button>
            <Link to={selectedFlashCard.route} className="wm-btn-secondary">
              Open recommended tool
            </Link>
          </div>
        </section>

        <div className="wm-sales-page__support-grid">
          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">Questions to ask</h3>
              <p className="wm-workspace-card__copy">
                Use these to qualify the customer need before you jump to product.
              </p>
            </div>
            <ul className="wm-sales-page__bullet-list">
              {selectedFlashCard.qualificationQuestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="wm-workspace-card">
            <div className="wm-workspace-card__header">
              <h3 className="wm-workspace-card__title">How to position WyreStorm</h3>
              <p className="wm-workspace-card__copy">
                Keep the conversation outcome-led, then let the product family support the story.
              </p>
            </div>
            <ul className="wm-sales-page__bullet-list">
              {selectedFlashCard.wyrestormAngles.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <section className="wm-workspace-card">
          <div className="wm-workspace-card__header">
            <h3 className="wm-workspace-card__title">Keep the conversation going</h3>
            <p className="wm-workspace-card__copy">
              Use these bridges to move from the opener into the right product family or next tool.
            </p>
          </div>

          <ul className="wm-sales-page__bullet-list">
            {selectedFlashCard.keepConversationMoving.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="wm-sales-page__chip-group">
            {selectedFlashCard.recommendedFamilies.map((item) => (
              <button
                key={item}
                type="button"
                className="wm-workspace-tag wm-sales-page__chip-button"
                onClick={() => focusFamily(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="wm-sales-page__chip-group">
            {selectedFlashCard.sampleSkus.map((sku) => (
              <button
                key={sku}
                type="button"
                className="wm-workspace-tag wm-sales-page__chip-button"
                onClick={() => focusSku(sku)}
              >
                {sku}
              </button>
            ))}
          </div>
        </section>
      </div>
    ) : null
  ) : selectedPitch ? (
    <div className="wm-workspace-stack wm-sales-page__column wm-sales-page__column--output">
      <section className="wm-workspace-card wm-workspace-card--muted wm-sales-page__hero-card">
        <div className="wm-workspace-card__header">
          <span className="wm-workspace-list-item__eyebrow">{selectedPitch.eyebrow}</span>
          <h3 className="wm-workspace-card__title">{selectedPitch.title}</h3>
          <p className="wm-workspace-card__copy">{selectedPitch.elevatorPitch}</p>
        </div>

        <div className="wm-workspace-action-row">
          <button
            type="button"
            className="wm-btn-primary"
            onClick={() =>
              void copyText(
                `${selectedPitch.title} elevator pitch`,
                joinParagraphs([
                  selectedPitch.title,
                  selectedPitch.elevatorPitch,
                  "Lead with:",
                  ...selectedPitch.leadWith.map((item) => `- ${item}`),
                  "Proof points:",
                  ...selectedPitch.proofPoints.map((item) => `- ${item}`),
                ]),
              )
            }
          >
            Copy elevator pitch
          </button>
          <Link to={selectedPitch.route} className="wm-btn-secondary">
            Open supporting tool
          </Link>
        </div>
      </section>

      <div className="wm-sales-page__support-grid">
        <section className="wm-workspace-card">
          <div className="wm-workspace-card__header">
            <h3 className="wm-workspace-card__title">Lead with</h3>
            <p className="wm-workspace-card__copy">
              These points help the salesperson open the conversation with confidence.
            </p>
          </div>
          <ul className="wm-sales-page__bullet-list">
            {selectedPitch.leadWith.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="wm-workspace-card">
          <div className="wm-workspace-card__header">
            <h3 className="wm-workspace-card__title">Keep the conversation moving</h3>
            <p className="wm-workspace-card__copy">
              Use these bridges when the customer wants more depth without losing the simple story.
            </p>
          </div>
          <ul className="wm-sales-page__bullet-list">
            {selectedPitch.keepConversationMoving.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="wm-workspace-card">
        <div className="wm-workspace-card__header">
          <h3 className="wm-workspace-card__title">Proof points and next moves</h3>
          <p className="wm-workspace-card__copy">
            Use these to support the elevator pitch once the customer asks for a little more.
          </p>
        </div>

        <ul className="wm-sales-page__bullet-list">
          {selectedPitch.proofPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="wm-sales-page__chip-group">
          {selectedPitch.relatedFamilies.map((item) => (
            <button
              key={item}
              type="button"
              className="wm-workspace-tag wm-sales-page__chip-button"
              onClick={() => focusFamily(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="wm-sales-page__chip-group">
          {selectedPitch.sampleSkus.map((sku) => (
            <button
              key={sku}
              type="button"
              className="wm-workspace-tag wm-sales-page__chip-button"
              onClick={() => focusSku(sku)}
            >
              {sku}
            </button>
          ))}
        </div>
      </section>
    </div>
  ) : null;

  return (
    <SplitWorkspaceFrame
      title="Sales Positioning"
      subtitle="Wingman is here to give the salesperson an AV expert on demand: open the conversation with confidence, move into the right WyreStorm range, and keep enough supporting detail in front of you to sell against the competition."
      leftTitle="Enablement Controls"
      rightTitle="Sales Support"
      left={left}
      right={right}
      top={
        <div className="wm-workspace-action-row wm-sales-page__top-actions">
          <Link to={WM_ROUTES.COMPARE} className="wm-btn-secondary">
            Competitor Compare
          </Link>
          <Link to={WM_ROUTES.PRODUCT_INTELLIGENCE} className="wm-btn-secondary">
            Product Intelligence
          </Link>
          <Link to={WM_ROUTES.TRAINING} className="wm-btn">
            Training Hub
          </Link>
          <Link to={WM_ROUTES.PROPOSAL} className="wm-btn">
            Proposal Builder
          </Link>
          <span className="wm-workspace-tag wm-sales-page__project-pill">
            {activeProject ? `Active project: ${activeProject.name}` : "Works with or without a live project"}
          </span>
        </div>
      }
      bottom={status ? <div className="wm-workspace-empty">{status}</div> : null}
    />
  );
}
