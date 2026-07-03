import { useMemo, useState } from "react";
import { ProductCallCardsShell } from "./ProductCallCardsShell";
import {
  findProduct,
  getLanguageAwareWording,
  getModeAwareWording,
  loadCallContext,
  navigateCallCardPage
} from "./store";

type ProductCallCardsResponsePageProps = {
  sku?: string;
};

const outputTypes = [
  "Customer email",
  "Dealer follow-up",
  "Internal handover",
  "Proposal support wording"
];

function buildOutputLabel(outputType: string) {
  if (outputType === "Customer email") return "Customer-facing response";
  if (outputType === "Dealer follow-up") return "Dealer / reseller follow-up";
  if (outputType === "Internal handover") return "Internal pre-sales handover";
  return "Proposal support wording";
}

export function ProductCallCardsResponsePage({ sku }: ProductCallCardsResponsePageProps) {
  const product = findProduct(sku);
  const context = loadCallContext();
  const [outputType, setOutputType] = useState(outputTypes[0]);
  const [copied, setCopied] = useState(false);

  const wording = useMemo(() => {
    if (context.wordingMode) {
      return getModeAwareWording(product, context);
    }

    return getLanguageAwareWording(product, context);
  }, [context, product]);

  const generatedText = useMemo(() => {
    const environment = context.roomType || context.environment || context.application || "the room";
    const requirement = context.knownRequirement || product.bestFor;
    const confirmation = (product.checks[0] || "the product job and room requirement")
      .replace(/^confirm\s+/i, "")
      .replace(/[.!?]+$/, "")
      .toLowerCase();

    return `${buildOutputLabel(outputType)}

Product:
${product.sku} — ${product.name}

What it does:
${product.whatItDoes}

How it fits here:
For ${environment}, use it where the customer needs ${requirement}

Say it like this:
${wording.salespersonAngle}

Confirm this:
I'm treating this as ${environment}. Can you confirm ${confirmation}?

Check before recommending:
${product.checks.slice(0, 4).map((item) => `- ${item}`).join("\n")}

Useful follow-up:
${product.followUp}`;
  }, [context.application, context.environment, context.knownRequirement, context.roomType, outputType, product, wording]);

  const copyText = () => {
    if (!navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(generatedText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <ProductCallCardsShell
      activeStep="response"
      title="Create focused response wording"
      intro="Select the output type and copy a concise response. The text is editable after copying."
    >
      <section className="wm-pcc-panel">
        <article className="wm-pcc-fast-path">
          <div>
            <p className="wm-pcc-eyebrow">Selected product</p>
            <h2>{product.sku}</h2>
            <p>{product.name}</p>
          </div>

          <button type="button" className="wm-pcc-primary" onClick={copyText}>
            {copied ? "Copied" : "Copy response wording"}
          </button>
        </article>

        <article className="wm-pcc-card">
          <header className="wm-pcc-card-header">
            <h2>Output type</h2>
            <span>Choose one</span>
          </header>

          <div className="wm-pcc-choice-grid">
            {outputTypes.map((item) => (
              <button
                key={item}
                type="button"
                className={`wm-pcc-choice ${outputType === item ? "is-selected" : ""}`}
                onClick={() => setOutputType(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </article>

        <textarea className="wm-pcc-response-area" value={generatedText} readOnly />

        <footer className="wm-pcc-actions">
          <button type="button" className="wm-pcc-secondary" onClick={() => navigateCallCardPage(`/product/${encodeURIComponent(product.sku)}`)}>
            Back to call card
          </button>

          <button type="button" className="wm-pcc-primary" onClick={copyText}>
            {copied ? "Copied" : "Copy response wording"}
          </button>
        </footer>
      </section>
    </ProductCallCardsShell>
  );
}
