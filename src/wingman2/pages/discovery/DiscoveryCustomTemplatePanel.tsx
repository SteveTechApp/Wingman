import { TEMPLATE_MARKETS } from "../../lib/templateMarkets";

// Presentational panel shown when Discovery runs in a custom-template mode:
// review the captured brief, name the template, pick its vertical market and
// save. Extracted verbatim from DiscoveryPage.tsx; the save gating and mode
// condition stay in the page.

type DiscoveryCustomTemplatePanelProps = {
  name: string;
  onNameChange: (value: string) => void;
  market: string;
  onMarketChange: (value: string) => void;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  savedMessage: string;
};

export function DiscoveryCustomTemplatePanel({
  name,
  onNameChange,
  market,
  onMarketChange,
  canSave,
  onSave,
  onCancel,
  savedMessage,
}: DiscoveryCustomTemplatePanelProps) {
  return (
    <section className="wm-section-card wm-custom-template-panel" aria-label="Custom template details">
      <div className="wm-custom-template-copy">
        <p className="wm-template-kicker wm-ui-kicker">Custom template</p>
        <h2 className="wm-section-title">Review, then save this template</h2>
        <p className="wm-copy">
          Review the captured brief above, name the template and set its vertical market, then save. This does not
          create a project.
        </p>
      </div>

      <div className="wm-custom-template-grid">
        <label className="wm-field">
          Template name
          <input
            className="wm-input"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g. Council chamber hybrid meeting"
          />
        </label>
        <label className="wm-field wm-custom-template-wide">
          Vertical market
          <select
            className="wm-input"
            value={market}
            onChange={(event) => onMarketChange(event.target.value)}
          >
            {TEMPLATE_MARKETS.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="wm-template-actions wm-action-row">
        <button type="button" className="wm-button wm-button-primary" onClick={onSave} disabled={!canSave}>
          Save Custom Template
        </button>
        <button type="button" className="wm-button wm-button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {savedMessage && <p className="wm-copy">{savedMessage}</p>}
    </section>
  );
}
