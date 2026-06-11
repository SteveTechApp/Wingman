import { useState } from "react";
import { ProductCallCardsShell } from "./ProductCallCardsShell";
import {
  PRODUCT_CALL_LANGUAGE_LEVELS,
  PRODUCT_CALL_MODE_PROFILES,
  loadCallContext,
  navigateCallCardPage,
  saveCallContext
} from "./store";
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

  const continueToProductSelection = () => {
    navigateCallCardPage("/select");
  };

  return (
    <ProductCallCardsShell
      activeStep="setup"
      title="Set the speaking voice"
      intro="Choose only the context that helps the salesperson explain the product. Skip anything unknown."
    >
      <section className="wm-pcc-panel">
        <article className="wm-pcc-fast-path">
          <div>
            <p className="wm-pcc-eyebrow">Workflow rule</p>
            <h2>Set the voice, then choose a product</h2>
            <p>
              This step controls wording. It should not force a full discovery form. The product call card will still work if setup is skipped.
            </p>
          </div>

          <button type="button" className="wm-pcc-primary" onClick={continueToProductSelection}>
            Continue to product selection
          </button>
        </article>

        <div className="wm-pcc-grid">
          <article className="wm-pcc-card">
            <header className="wm-pcc-card-header">
              <h2>Language level</h2>
              <span>Required</span>
            </header>
            <p className="wm-pcc-card-note">
              This changes the words Wingman gives the salesperson.
            </p>

            <div className="wm-pcc-choice-grid">
              {PRODUCT_CALL_LANGUAGE_LEVELS.map((profile) => (
                <button
                  key={profile.level}
                  type="button"
                  className={`wm-pcc-choice ${context.salespersonConfidence === profile.level ? "is-selected" : ""}`}
                  onClick={() => updateField("salespersonConfidence", profile.level)}
                >
                  <strong>{profile.level}</strong>
                  <span>{profile.tone}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="wm-pcc-card">
            <header className="wm-pcc-card-header">
              <h2>Call mode</h2>
              <span>Optional</span>
            </header>
            <p className="wm-pcc-card-note">
              Choose the situation only if it changes the wording needed.
            </p>

            <div className="wm-pcc-choice-grid">
              {PRODUCT_CALL_MODE_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`wm-pcc-choice ${context.wordingMode === profile.id ? "is-selected" : ""}`}
                  onClick={() => updateField("wordingMode", profile.id)}
                >
                  <strong>{profile.label}</strong>
                  <span>{profile.purpose}</span>
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
          <p className="wm-pcc-card-note">
            Use this for a direct task such as “sell this product into a small BYOD meeting room”.
          </p>

          <textarea
            value={context.knownRequirement || ""}
            onChange={(event) => updateField("knownRequirement", event.target.value)}
            placeholder="Example: sell this product into a small BYOD meeting room where the customer wants fewer separate devices."
            className="wm-pcc-textarea"
          />
        </article>

        <article className="wm-pcc-card">
          <header className="wm-pcc-card-header">
            <h2>Environment / use case</h2>
            <span>Optional</span>
          </header>

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

        <footer className="wm-pcc-actions">
          <button type="button" className="wm-pcc-primary" onClick={continueToProductSelection}>
            Continue to product selection
          </button>
        </footer>
      </section>
    </ProductCallCardsShell>
  );
}