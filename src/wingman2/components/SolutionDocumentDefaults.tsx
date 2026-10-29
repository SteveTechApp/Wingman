import { useState } from "react";
import {
  HOUSE_DOCUMENT_BRAND,
  clearOrganisationDocumentSettings,
  loadOrganisationDocumentSettings,
  saveOrganisationDocumentSettings,
  type DocumentAudience,
  type DocumentDetail,
  type OrganisationDocumentSettings,
} from "../lib/solutionTemplates";

type BrandDefaults = Required<OrganisationDocumentSettings>;

const AUDIENCES: DocumentAudience[] = ["Customer", "Consultant", "Integrator", "Internal"];
const DETAIL_LEVELS: DocumentDetail[] = ["Executive", "Standard", "Technical"];

/**
 * The organisation's own brand for solution documents.
 *
 * `defaultPersonalisation` seeds every new document from these eight values, so
 * this is the surface that decides what a rep's next document starts as. A
 * document already being edited keeps its own values: saving here never rewrites
 * a draft. Its personalisation panel can pull the stored brand in on request
 * (`applyOrganisationDocumentDefaults`), so a rep who sets the organisation's
 * brand after starting a document is not stuck with the earlier one. That pull
 * moves the six brand values only: audience and detail describe the reader of
 * one document and sit in the draft's own fieldset, so they stay as the rep
 * chose them.
 *
 * The form opens on what is stored, over the house values a document would
 * otherwise fall back to, so the fields show the document a rep is about to
 * produce instead of eight empty boxes — `HOUSE_DOCUMENT_BRAND` supplies both.
 * Saving writes all eight, so the form is the whole answer to "what will my next
 * document look like" rather than a record where the colours came from here and
 * the footer from the house table.
 */
export function SolutionDocumentDefaults() {
  const [defaults, setDefaults] = useState<BrandDefaults>(() => ({
    ...HOUSE_DOCUMENT_BRAND,
    ...loadOrganisationDocumentSettings(),
  }));
  const [status, setStatus] = useState("");

  function update<K extends keyof BrandDefaults>(key: K, value: BrandDefaults[K]) {
    setDefaults((current) => ({ ...current, [key]: value }));
  }

  function save() {
    saveOrganisationDocumentSettings(defaults);
    setStatus(
      "Saved. New solution documents will start from these values; a draft already open takes the brand with Use document defaults.",
    );
  }

  /**
   * Back to the house brand.
   *
   * The stored record goes with it rather than being rewritten with the house
   * values: the fallback table is what a document uses when nothing is stored,
   * so leaving a record that merely repeats it would claim this organisation had
   * chosen a brand it never set.
   */
  function reset() {
    clearOrganisationDocumentSettings();
    setDefaults({ ...HOUSE_DOCUMENT_BRAND });
    setStatus("Reset. New solution documents will use the house values again.");
  }

  return (
    <section className="wm-section-card" aria-labelledby="wingman-settings-document-defaults">
      <h2 id="wingman-settings-document-defaults" className="wm-card-title">
        Solution document defaults
      </h2>
      <p className="wm-copy">
        Brand, audience and detail every new solution document starts from. A document already being edited keeps its own
        wording, audience and detail — choose Use document defaults in its personalisation panel to take the logo, colours,
        font, footer and disclaimer, and keep the rest.
      </p>

      <div className="wm-form-grid">
        <label className="wm-field">
          Organisation logo URL
          <input
            className="wm-input"
            value={defaults.organisationLogo}
            onChange={(event) => update("organisationLogo", event.target.value)}
          />
        </label>

        <label className="wm-field">
          Font
          <input
            className="wm-input"
            value={defaults.font}
            onChange={(event) => update("font", event.target.value)}
          />
        </label>

        <label className="wm-field">
          Primary colour
          <input
            className="wm-input"
            type="color"
            value={defaults.primaryColour}
            onChange={(event) => update("primaryColour", event.target.value)}
          />
        </label>

        <label className="wm-field">
          Secondary colour
          <input
            className="wm-input"
            type="color"
            value={defaults.secondaryColour}
            onChange={(event) => update("secondaryColour", event.target.value)}
          />
        </label>

        <label className="wm-field">
          Document audience
          <select
            className="wm-select"
            value={defaults.audience}
            onChange={(event) => update("audience", event.target.value as BrandDefaults["audience"])}
          >
            {AUDIENCES.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>

        <label className="wm-field">
          Document detail
          <select
            className="wm-select"
            value={defaults.detail}
            onChange={(event) => update("detail", event.target.value as BrandDefaults["detail"])}
          >
            {DETAIL_LEVELS.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>

      <label className="wm-field">
        Document footer
        <input
          className="wm-input"
          value={defaults.footer}
          onChange={(event) => update("footer", event.target.value)}
        />
      </label>

      <label className="wm-field">
        Disclaimer
        <textarea
          className="wm-textarea"
          value={defaults.disclaimer}
          onChange={(event) => update("disclaimer", event.target.value)}
        />
      </label>

      <div className="wm-action-row">
        <button
          className="wm-button wm-button-primary"
          type="button"
          onClick={save}
          data-testid="settings-document-defaults-save"
        >
          Save document defaults
        </button>
        <button
          className="wm-button wm-button-secondary"
          type="button"
          onClick={reset}
          data-testid="settings-document-defaults-reset"
        >
          Reset to house values
        </button>
      </div>

      <p className="wm-copy" role="status">{status}</p>
    </section>
  );
}
