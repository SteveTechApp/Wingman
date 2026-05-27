const DISCOVERY_PROPORTION_STYLE_ID = "wm-discovery-proportion-tuning";

const discoveryProportionCss = `
html[data-wm-visual-route="discovery"] .wmg-panel-heading {
  display: grid;
  gap: 2px;
  margin-bottom: 8px;
}

html[data-wm-visual-route="discovery"] .wmg-panel-heading h3 {
  font-size: 0.95rem;
}

html[data-wm-visual-route="discovery"] .wmg-panel-heading p {
  max-width: 96ch;
  font-size: 0.74rem;
  line-height: 1.25;
}

html[data-wm-visual-route="discovery"] .wmg-canvas-panel > h4 {
  margin: 8px 0 5px;
  color: #dbeafe;
  font-size: 0.66rem;
  line-height: 1.15;
  letter-spacing: 0.04em;
}

html[data-wm-visual-route="discovery"] .wmg-canvas-panel > .wm-selection-grid,
html[data-wm-visual-route="discovery"] .wmg-canvas-panel .wm-selection-grid[data-columns] {
  grid-template-columns: repeat(auto-fill, minmax(185px, 250px)) !important;
  justify-content: start !important;
  align-items: stretch !important;
  gap: 9px !important;
}

html[data-wm-visual-route="discovery"] .wmg-canvas-panel .wm-selection-grid[data-columns="5"] {
  grid-template-columns: repeat(auto-fill, minmax(190px, 250px)) !important;
}

html[data-wm-visual-route="discovery"] .wmg-application-grid,
html[data-wm-visual-route="discovery"] .wmg-chip-grid {
  grid-template-columns: repeat(auto-fill, minmax(185px, 250px)) !important;
  justify-content: start !important;
}

html[data-wm-visual-route="discovery"] .wmg-field-grid,
html[data-wm-visual-route="discovery"] .wmg-field-grid--compact,
html[data-wm-visual-route="discovery"] .wmg-field-grid--path {
  grid-template-columns: repeat(auto-fill, minmax(220px, 330px)) !important;
  justify-content: start !important;
  align-items: start !important;
  gap: 9px 12px !important;
  margin-top: 6px;
}

html[data-wm-visual-route="discovery"] .wmg-field {
  max-width: 330px;
}

html[data-wm-visual-route="discovery"] .wmg-field select,
html[data-wm-visual-route="discovery"] .wmg-field input {
  width: 100% !important;
}

html[data-wm-visual-route="discovery"] .wmg-checkline {
  display: inline-flex !important;
  width: fit-content !important;
  max-width: 100% !important;
  align-items: center !important;
  gap: 8px !important;
  min-height: 28px !important;
  margin: 5px 0 4px !important;
  color: var(--wm-text-soft) !important;
  font-size: 0.75rem !important;
  line-height: 1.2 !important;
}

html[data-wm-visual-route="discovery"] .wmg-checkline input[type="checkbox"] {
  width: 16px !important;
  min-width: 16px !important;
  max-width: 16px !important;
  height: 16px !important;
  min-height: 16px !important;
  padding: 0 !important;
  margin: 0 !important;
  border-radius: 4px !important;
  accent-color: var(--wm-cyan) !important;
}

html[data-wm-visual-route="discovery"] .wmg-checkline span {
  color: var(--wm-text-soft) !important;
  font-size: 0.75rem !important;
  font-weight: 720 !important;
}

html[data-wm-visual-route="discovery"] .wingman-shell .wm-selection-card,
html[data-wm-visual-route="discovery"] .wingman-shell button.wm-selection-card,
html[data-wm-visual-route="discovery"] .wingman-shell [role="button"].wm-selection-card {
  min-height: 70px !important;
  padding: 8px 31px 8px 8px !important;
}

html[data-wm-visual-route="discovery"] .wm-selection-card__visual {
  width: 38px !important;
  height: 38px !important;
  border-radius: 13px !important;
}

html[data-wm-visual-route="discovery"] .wm-selection-card__icon,
html[data-wm-visual-route="discovery"] .wm-selection-card__glyph {
  width: 18px !important;
  height: 18px !important;
}

html[data-wm-visual-route="discovery"] .wingman-shell .wm-selection-card__title {
  font-size: 0.78rem !important;
  line-height: 1.12 !important;
}

html[data-wm-visual-route="discovery"] .wingman-shell .wm-selection-card__description {
  font-size: 0.64rem !important;
  line-height: 1.2 !important;
}

html[data-wm-visual-route="discovery"] .wm-selection-card__check {
  top: 7px !important;
  right: 7px !important;
  width: 20px !important;
  height: 20px !important;
}

html[data-wm-visual-route="discovery"] .wmg-inline-actions {
  margin-top: 4px;
}

html[data-wm-visual-route="discovery"] .wmg-inline-actions button {
  min-height: 30px !important;
  padding: 6px 10px !important;
  font-size: 0.72rem !important;
}

@media (min-width: 1500px) {
  html[data-wm-visual-route="discovery"] .wmg-engineering-canvas {
    max-width: 1560px;
  }
}
`;

export function installDiscoveryProportionTuning(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(DISCOVERY_PROPORTION_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = DISCOVERY_PROPORTION_STYLE_ID;
  style.textContent = discoveryProportionCss;
  document.head.appendChild(style);
}
