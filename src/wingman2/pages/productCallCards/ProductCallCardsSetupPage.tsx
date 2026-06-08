import { useState } from "react";
import { ProductCallCardsShell } from "./ProductCallCardsShell";
import { PRODUCT_CALL_LANGUAGE_LEVELS, loadCallContext, navigateCallCardPage, saveCallContext } from "./store";
import type { ProductCallContext } from "./store";

const applicationOptions = [
  "Meeting room / UC",
  "Presentation switching",
  "Classroom AV",
  "Hospitality",
  "Video wall",
  "AVoIP / distribution"
];

export function ProductCallCardsSetupPage() {
  const [context, setContext] = useState<ProductCallContext>(() => loadCallContext());

  const updateField = (field: keyof ProductCallContext, value: string) => {
    const next = saveCallContext({ [field]: value || undefined });
    setContext(next);
  };

  const updateKnownRequirement = (value: string) => {
    const next = saveCallContext({ knownRequirement: value });
    setContext(next);
  };

  return (
    <ProductCallCardsShell
      activeStep="setup"
      title="Set the product language"
      intro="Keep this simple. Choose the language level only if it helps the salesperson explain the product more clearly."
    >
      <section className="wm-pcc-panel">
        <article className="wm-pcc-fast-path">
          <div>
            <p className="wm-pcc-eyebrow">Fast path</p>
            <h2>Pick a product and use Normal language</h2>
            <p>Normal uses a balanced mix of plain sales wording and practical AV terms. Simple removes most technical language. Advanced uses more recognised AV acronyms and system-role language.</p>
          </div>
          <button type="button" className="wm-pcc-primary" onClick={() => navigateCallCardPage("/select")}>
            Select product
          </button>
        </article>

        <div className="wm-pcc-grid">
          <article className="wm-pcc-card">
            <header className="wm-pcc-card-header">
              <h2>Language level</h2>
              <span>Optional</span>
            </header>
            <p className="wm-pcc-card-note">This controls tone and word selection across the product dashboard and response pack.</p>
            <div className="wm-pcc-choice-grid">
              {PRODUCT_CALL_LANGUAGE_LEVELS.map((profile) => (
                <button
                  key={profile.level}
                  type="button"
                  className={`wm-pcc-choice ${context.salespersonConfidence === profile.level ? "is-selected" : ""}`}
                  onClick={() => updateField("salespersonConfidence", profile.level)}
                >
                  {profile.level}
                </button>
              ))}
            </div>
          </article>

          <article className="wm-pcc-card">
            <header className="wm-pcc-card-header">
              <h2>Environment / use case</h2>
              <span>Optional</span>
            </header>
            <p className="wm-pcc-card-note">Only choose this if it affects the example language.</p>
            <div className="wm-pcc-choice-grid">
              {applicationOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`wm-pcc-choice ${context.application === option ? "is-selected" : ""}`}
                  onClick={() => updateField("application", option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </article>
        </div>

        <article className="wm-pcc-card wm-pcc-known-requirement">
          <header className="wm-pcc-card-header">
            <h2>Known requirement</h2>
            <span>Optional</span>
          </header>
          <p className="wm-pcc-card-note">Use this for a direct task such as “sell this product into a small BYOD meeting room”.</p>
          <textarea
            value={context.knownRequirement || ""}
            onChange={(event) => updateKnownRequirement(event.target.value)}
            placeholder="Example: sell this product into a small BYOD meeting room where the customer wants fewer separate devices."
            className="wm-pcc-textarea"
          />
        </article>

        <footer className="wm-pcc-actions">
          <button type="button" className="wm-pcc-secondary" onClick={() => navigateCallCardPage("/select")}>
            Skip setup
          </button>
          <button type="button" className="wm-pcc-primary" onClick={() => navigateCallCardPage("/select")}>
            Select product
          </button>
        </footer>
      </section>
    </ProductCallCardsShell>
  );
}