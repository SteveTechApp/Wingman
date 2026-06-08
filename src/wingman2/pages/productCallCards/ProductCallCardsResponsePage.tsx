import { useMemo, useState } from "react";
import { ProductCallCardsShell } from "./ProductCallCardsShell";
import { findProduct, getLanguageAwareWording, getLanguageProfile, loadCallContext, navigateCallCardPage } from "./store";

type ProductCallCardsResponsePageProps = {
  sku?: string;
};

const outputTypes = ["Customer email", "Internal notes", "Proposal support wording", "Dealer follow-up"];
const tones = ["Use selected language", "Commercial", "Technical", "Simple", "Consultant-level"];

export function ProductCallCardsResponsePage({ sku }: ProductCallCardsResponsePageProps) {
  const product = findProduct(sku);
  const context = loadCallContext();
  const profile = getCallModeProfile(context.wordingMode);
  const wording = getModeAwareWording(product, context);
  const [outputType, setOutputType] = useState(outputTypes[0]);
  const [tone, setTone] = useState(tones[0]);

  const generatedText = useMemo(() => {
    const environment = context.environment || context.application || "the room";
    const requirement = context.knownRequirement || product.bestFor;

    return `${product.sku} — ${product.name}

Language level: ${profile.label}
Tone: ${tone === "Use selected language" ? profile.tone : tone}
Output: ${outputType}

${wording.headline}

What it is:
${wording.whatItIs}

What it does:
${wording.whatItDoes}

Why it matters:
${wording.whyItMatters}

Useful sales angle:
${wording.salespersonAngle}

Customer benefit:
${wording.customerBenefit}

Use this when:
${product.goodFit.slice(0, 4).map((item) => `- ${item}`).join("\n")}

Only ask if it affects the outcome:
${product.askNext.slice(0, 5).map((item) => `- ${item}`).join("\n")}

Known environment:
${environment}

Known requirement:
${requirement}`;
  }, [context.application, context.environment, context.knownRequirement, outputType, product, profile.label, profile.tone, tone, wording]);

  const copyText = () => {
    if (!navigator.clipboard) {
      return;
    }

    void navigator.clipboard.writeText(generatedText);
  };

  return (
    <ProductCallCardsShell
      activeStep="response"
      title="Create response pack"
      intro="Generate wording that follows the selected mode. If setup was skipped, Wingman uses benefit-led sales language."
    >
      <section className="wm-pcc-panel">
        <div className="wm-pcc-select-grid">
          <label className="wm-pcc-field">
            <span>Output type</span>
            <select value={outputType} onChange={(event) => setOutputType(event.target.value)}>
              {outputTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="wm-pcc-field">
            <span>Tone</span>
            <select value={tone} onChange={(event) => setTone(event.target.value)}>
              {tones.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <article className="wm-pcc-selected-card">
          <p className="wm-pcc-eyebrow">Selected product</p>
          <h2>{product.sku}</h2>
          <h3>{product.name}</h3>
          <p>{wording.headline}</p>
        </article>

        <textarea className="wm-pcc-response-area" value={generatedText} readOnly />

        <footer className="wm-pcc-actions">
          <button type="button" className="wm-pcc-secondary" onClick={() => navigateCallCardPage(`/product/${encodeURIComponent(product.sku)}`)}>
            Back to sales page
          </button>
          <button type="button" className="wm-pcc-primary" onClick={copyText}>
            Copy response wording
          </button>
        </footer>
      </section>
    </ProductCallCardsShell>
  );
}