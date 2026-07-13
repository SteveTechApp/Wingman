import { useMemo, useState } from "react";
import { ProductInSituDiagram } from "./ProductInSituDiagram";
import { getProductSalesKnowledge, type ProductSalesKnowledgeProduct, type ResolvedProductSalesKnowledge } from "../data/productSalesKnowledge";
import { getCompetitorLandscape, type CompetitorLandscape } from "../lib/competitorLandscape";

type ProductSalesKnowledgePanelProps = {
  product: ProductSalesKnowledgeProduct;
  mode?: "pitch" | "finder";
};

type ConversationKind =
  | "explain"
  | "competitors"
  | "endUser"
  | "dealer"
  | "consultant"
  | "distributor"
  | "validate"
  | "diagram"
  | "scope";

type ConversationCard = {
  kind: ConversationKind;
  eyebrow: string;
  title: string;
  summary: string;
  cta: string;
};

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <article className="wm-product-conversation-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function buildConversationCards(knowledge: ResolvedProductSalesKnowledge): ConversationCard[] {
  return [
    {
      kind: "explain",
      eyebrow: "Learn the product",
      title: "What is it?",
      summary: `Plain-English explanation of ${knowledge.classLabel.toLowerCase()} and where it sits in an AV system.`,
      cta: "Explain product",
    },
    {
      kind: "competitors",
      eyebrow: "Market context",
      title: "Known competitors & brand SKUs",
      summary: "Who else gets asked for in this product class, and which of their SKUs are logged against it.",
      cta: "Open competitor SKUs",
    },
    {
      kind: "endUser",
      eyebrow: "Customer conversation",
      title: "Talk to an end user",
      summary: "Outcome-led wording for a non-technical customer who cares about usability and business value.",
      cta: "Open end-user wording",
    },
    {
      kind: "dealer",
      eyebrow: "Installer conversation",
      title: "Support a dealer",
      summary: "Practical install and qualification prompts for a dealer or system integrator.",
      cta: "Open dealer notes",
    },
    {
      kind: "consultant",
      eyebrow: "Technical conversation",
      title: "Answer a consultant",
      summary: "Validation language for signal path, topology, USB, audio, control and system design.",
      cta: "Open consultant notes",
    },
    {
      kind: "distributor",
      eyebrow: "Channel conversation",
      title: "Equip another salesperson",
      summary: "Simple qualification prompts for a distributor or reseller salesperson.",
      cta: "Open sales prompts",
    },
    {
      kind: "validate",
      eyebrow: "Before quoting",
      title: "Ask these questions",
      summary: "Discovery questions and misuse warnings that protect the recommendation.",
      cta: "Open checklist",
    },
    {
      kind: "diagram",
      eyebrow: "Visual support",
      title: "Show in-situ diagram",
      summary: "A quick schematic showing source side, WyreStorm product position, transport and output side.",
      cta: "Open diagram",
    },
    {
      kind: "scope",
      eyebrow: "Complete system",
      title: "What else is needed?",
      summary: "Companion products and BY-OTHERS items needed to turn the WyreStorm path into a complete proposal.",
      cta: "Open scope notes",
    },
  ];
}

function ConversationModal({
  kind,
  knowledge,
  competitors,
  onClose,
}: {
  kind: ConversationKind;
  knowledge: ResolvedProductSalesKnowledge;
  competitors: CompetitorLandscape;
  onClose: () => void;
}) {
  const titleMap: Record<ConversationKind, string> = {
    explain: "Explain the product",
    competitors: "Known competitors & brand SKUs",
    endUser: "Talk to an end user",
    dealer: "Support a dealer / installer",
    consultant: "Answer a technical consultant",
    distributor: "Equip another salesperson",
    validate: "Check before quoting",
    diagram: "Product in-situ diagram",
    scope: "Complete-system scope",
  };

  return (
    <div className="wm-product-conversation-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="wm-product-conversation-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${knowledge.sku} ${titleMap[kind]}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="wm-product-conversation-modal-head">
          <div>
            <p>{knowledge.sku}</p>
            <h3>{titleMap[kind]}</h3>
            <span>{knowledge.classLabel} - {knowledge.productName}</span>
          </div>

          <button type="button" onClick={onClose} aria-label="Close product conversation">
            Close
          </button>
        </header>

        <div className="wm-product-conversation-modal-body">
          {kind === "explain" ? (
            <div className="wm-product-conversation-explain">
              <article>
                <h4>What it is</h4>
                <p>{knowledge.whatItIs}</p>
              </article>
              <article>
                <h4>Where it sits</h4>
                <p>{knowledge.whereItSits}</p>
              </article>
              <article>
                <h4>How it works</h4>
                <p>{knowledge.howItWorks}</p>
              </article>
              <article>
                <h4>How it relates to other WyreStorm options</h4>
                <p>{knowledge.howItRelates}</p>
              </article>
              {knowledge.featureHints.length ? (
                <ListBlock title="Feature notes to explain carefully" items={knowledge.featureHints} />
              ) : null}
            </div>
          ) : null}

          {kind === "competitors" ? (
            <div className="wm-product-conversation-script">
              <p className="wm-product-conversation-readout">{competitors.note}</p>
              {competitors.entries.map((entry) => (
                <article className="wm-product-conversation-list" key={`${entry.brand}-${entry.sku}`}>
                  <h4>{entry.brand} {entry.sku}</h4>
                  <ul>
                    {entry.name && entry.name !== entry.sku ? <li>{entry.name}</li> : null}
                    {entry.category ? <li>Category: {entry.category}</li> : null}
                    {entry.summary ? <li>{entry.summary}</li> : null}
                    {entry.knownLimitations ? <li>Known limitation: {entry.knownLimitations}</li> : null}
                    {entry.wingmanEquivalent ? <li>Logged WyreStorm equivalent: {entry.wingmanEquivalent}</li> : null}
                    <li>Evidence confidence: {entry.confidence}{entry.sourceUrl ? " (sourced from published specification)" : ""}</li>
                  </ul>
                </article>
              ))}
            </div>
          ) : null}

          {kind === "endUser" ? (
            <div className="wm-product-conversation-script">
              <p className="wm-product-conversation-readout">{knowledge.pitch.endUser}</p>
              <ListBlock title="Best real-world applications" items={knowledge.commonUseCases} />
              <ListBlock title="What it works with" items={knowledge.worksWith} />
            </div>
          ) : null}

          {kind === "dealer" ? (
            <div className="wm-product-conversation-script">
              <p className="wm-product-conversation-readout">{knowledge.pitch.dealer}</p>
              <ListBlock title="Ask the dealer / integrator" items={knowledge.discoveryQuestions} />
              <ListBlock title="Likely companion products" items={knowledge.companionProducts} />
            </div>
          ) : null}

          {kind === "consultant" ? (
            <div className="wm-product-conversation-script">
              <p className="wm-product-conversation-readout">{knowledge.pitch.consultant}</p>
              <ListBlock title="Validate before issue" items={knowledge.discoveryQuestions} />
              <ListBlock title="Do not use it when" items={knowledge.doNotUseWhen} />
            </div>
          ) : null}

          {kind === "distributor" ? (
            <div className="wm-product-conversation-script">
              <p className="wm-product-conversation-readout">{knowledge.pitch.distributorSales}</p>
              <ListBlock title="Simple sales prompts" items={knowledge.discoveryQuestions.slice(0, 4)} />
              <ListBlock title="What else to attach" items={knowledge.companionProducts} />
            </div>
          ) : null}

          {kind === "validate" ? (
            <div className="wm-product-conversation-script">
              <ListBlock title="Ask before quoting" items={knowledge.discoveryQuestions} />
              <ListBlock title="Do not use it when" items={knowledge.doNotUseWhen} />
              {knowledge.featureHints.length ? <ListBlock title="Feature warnings" items={knowledge.featureHints} /> : null}
            </div>
          ) : null}

          {kind === "diagram" ? (
            <ProductInSituDiagram knowledge={knowledge} />
          ) : null}

          {kind === "scope" ? (
            <div className="wm-product-conversation-script">
              <ListBlock title="Likely companion products" items={knowledge.companionProducts} />
              <ListBlock title="BY-OTHERS checklist" items={knowledge.byOthersChecklist} />
              <article className="wm-product-conversation-note">
                <h4>Proposal reminder</h4>
                <p>
                  Use these items as placeholders until the salesperson, dealer or consultant replaces them with confirmed third-party SKUs, installation scope or customer-supplied equipment.
                </p>
              </article>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ProductSalesKnowledgePanel({ product, mode = "pitch" }: ProductSalesKnowledgePanelProps) {
  const knowledge = getProductSalesKnowledge(product);
  const competitors = useMemo(() => getCompetitorLandscape(product), [product]);
  const [activeConversation, setActiveConversation] = useState<ConversationKind | null>(null);

  const cards = useMemo(() => buildConversationCards(knowledge), [knowledge]);

  const visibleCards = mode === "finder"
    ? cards.filter((card) => ["explain", "competitors", "endUser", "validate", "diagram"].includes(card.kind))
    : cards;

  return (
    <section className="wm-product-conversation-panel" data-mode={mode}>
      <div className="wm-product-conversation-panel-head">
        <div>
          <p>Product conversations</p>
          <h3>{knowledge.sku}: {knowledge.plainEnglishName}</h3>
          <span>
            Choose the conversation needed right now. The detail opens in a focused window so the page does not become overloaded.
          </span>
        </div>

        <strong>{knowledge.classLabel}</strong>
      </div>

      <div className="wm-product-conversation-card-grid">
        {visibleCards.map((card) => (
          <button
            key={card.kind}
            type="button"
            className="wm-product-conversation-card"
            onClick={() => setActiveConversation(card.kind)}
          >
            <span>{card.eyebrow}</span>
            <strong>{card.title}</strong>
            <small>{card.summary}</small>
            <em>{card.cta}</em>
          </button>
        ))}
      </div>

      {mode === "pitch" ? (
        <aside className="wm-product-conversation-inline-summary">
          <article>
            <strong>Quick explanation</strong>
            <span>{knowledge.whatItIs}</span>
          </article>
          <article>
            <strong>First question to ask</strong>
            <span>{knowledge.discoveryQuestions[0]}</span>
          </article>
          <article>
            <strong>Most important warning</strong>
            <span>{knowledge.doNotUseWhen[0]}</span>
          </article>
        </aside>
      ) : null}

      {activeConversation ? (
        <ConversationModal
          kind={activeConversation}
          knowledge={knowledge}
          competitors={competitors}
          onClose={() => setActiveConversation(null)}
        />
      ) : null}
    </section>
  );
}

export default ProductSalesKnowledgePanel;
