const DISCOVERY_DENSITY_STYLE_ID = "wm-discovery-density-tuning";

const discoveryDensityCss = `
html[data-wm-visual-route="discovery"] {
  --wm-topbar-height: 52px;
  --wm-content-max: 1500px;
}

html[data-wm-visual-route="discovery"] .wingman-topbar {
  min-height: 52px;
  height: 52px;
  padding: 0 14px;
}

html[data-wm-visual-route="discovery"] .wingman-command-search,
html[data-wm-visual-route="discovery"] .wingman-new-project-button,
html[data-wm-visual-route="discovery"] .wingman-topbar-icon-button,
html[data-wm-visual-route="discovery"] .wingman-user-avatar {
  display: none !important;
}

html[data-wm-visual-route="discovery"] .wingman-topbar-title {
  max-width: none;
}

html[data-wm-visual-route="discovery"] .wingman-topbar-title p {
  font-size: 0.95rem;
  line-height: 1.05;
}

html[data-wm-visual-route="discovery"] .wingman-topbar-title span {
  font-size: 0.72rem;
  line-height: 1.2;
}

html[data-wm-visual-route="discovery"] .wingman-app-main {
  padding: 12px 16px 18px;
}

html[data-wm-visual-route="discovery"] .wingman-page-host {
  gap: 10px;
}

html[data-wm-visual-route="discovery"] .wm-page-hero,
html[data-wm-visual-route="discovery"] .wingman-page-hero,
html[data-wm-visual-route="discovery"] .wm-balanced-page-hero {
  min-height: 0;
  margin-bottom: 8px;
  padding: 12px 14px;
}

html[data-wm-visual-route="discovery"] .wm-page-hero h1,
html[data-wm-visual-route="discovery"] .wingman-page-hero h1,
html[data-wm-visual-route="discovery"] .wm-balanced-hero-title {
  font-size: clamp(1.18rem, 1.3vw, 1.52rem);
}

html[data-wm-visual-route="discovery"] .wm-page-hero__subtitle,
html[data-wm-visual-route="discovery"] .wingman-hero-purpose,
html[data-wm-visual-route="discovery"] .wm-balanced-hero-purpose {
  margin-top: 5px;
  max-width: 110ch;
  font-size: 0.78rem;
  line-height: 1.35;
}

html[data-wm-visual-route="discovery"] .wm-page-hero__actions,
html[data-wm-visual-route="discovery"] .wingman-hero-actions,
html[data-wm-visual-route="discovery"] .wm-balanced-hero-actions {
  display: none !important;
}

html[data-wm-visual-route="discovery"] section[aria-label="Sales conversation type"] {
  display: none !important;
}

html[data-wm-visual-route="discovery"] .wmg-engineering-canvas {
  gap: 9px;
  padding: 10px;
}

html[data-wm-visual-route="discovery"] .wmg-engineering-canvas__hero {
  grid-template-columns: minmax(0, 1fr) minmax(180px, 240px);
  gap: 10px;
  min-height: 0;
  padding: 10px 12px;
}

html[data-wm-visual-route="discovery"] .wmg-engineering-canvas h2 {
  font-size: clamp(1rem, 1.1vw, 1.28rem);
  line-height: 1.12;
}

html[data-wm-visual-route="discovery"] .wmg-engineering-canvas h3 {
  font-size: 0.9rem;
  line-height: 1.16;
}

html[data-wm-visual-route="discovery"] .wmg-engineering-canvas h4 {
  font-size: 0.72rem;
  line-height: 1.18;
}

html[data-wm-visual-route="discovery"] .wmg-engineering-canvas p {
  font-size: 0.75rem;
  line-height: 1.32;
}

html[data-wm-visual-route="discovery"] .wmg-canvas-panel,
html[data-wm-visual-route="discovery"] .wmg-mini-card,
html[data-wm-visual-route="discovery"] .wmg-warning-card,
html[data-wm-visual-route="discovery"] .wmg-empty-card,
html[data-wm-visual-route="discovery"] .wmg-position-guide,
html[data-wm-visual-route="discovery"] .wmg-flow-summary,
html[data-wm-visual-route="discovery"] .wmg-pair-summary,
html[data-wm-visual-route="discovery"] .wmg-topology-card,
html[data-wm-visual-route="discovery"] .wmg-brief-summary,
html[data-wm-visual-route="discovery"] .wmg-recommendation-card,
html[data-wm-visual-route="discovery"] .wmg-advanced-position-panel {
  padding: 10px;
}

html[data-wm-visual-route="discovery"] .wmg-chip-grid,
html[data-wm-visual-route="discovery"] .wmg-application-grid {
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 9px;
}

html[data-wm-visual-route="discovery"] .wmg-field-grid,
html[data-wm-visual-route="discovery"] .wmg-field-grid--compact,
html[data-wm-visual-route="discovery"] .wmg-field-grid--path,
html[data-wm-visual-route="discovery"] .wmg-card-grid,
html[data-wm-visual-route="discovery"] .wmg-recommendation-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 420px));
  justify-content: start;
  gap: 10px 12px;
}

html[data-wm-visual-route="discovery"] .wmg-field {
  gap: 4px;
}

html[data-wm-visual-route="discovery"] .wmg-field > span {
  font-size: 0.66rem;
  line-height: 1.12;
}

html[data-wm-visual-route="discovery"] .wingman-page-host :where(input, select) {
  min-height: 34px;
  padding: 0 10px;
  font-size: 0.78rem;
}

html[data-wm-visual-route="discovery"] .wingman-page-host textarea {
  min-height: 74px;
  padding: 8px 10px;
  font-size: 0.78rem;
}

html[data-wm-visual-route="discovery"] .wm-selection-grid,
html[data-wm-visual-route="discovery"] .wm-selection-grid[data-columns] {
  --wm-selection-columns: auto-fit;
  grid-template-columns: repeat(auto-fit, minmax(205px, 1fr)) !important;
  gap: 9px !important;
}

html[data-wm-visual-route="discovery"] .wingman-shell .wm-selection-card,
html[data-wm-visual-route="discovery"] .wingman-shell button.wm-selection-card,
html[data-wm-visual-route="discovery"] .wingman-shell [role="button"].wm-selection-card {
  grid-template-columns: 42px minmax(0, 1fr) !important;
  gap: 10px !important;
  min-height: 78px !important;
  padding: 9px 34px 9px 9px !important;
  border-radius: 18px !important;
}

html[data-wm-visual-route="discovery"] .wm-selection-card__visual {
  width: 42px;
  height: 42px;
  border-radius: 14px;
}

html[data-wm-visual-route="discovery"] .wm-selection-card__icon,
html[data-wm-visual-route="discovery"] .wm-selection-card__glyph {
  width: 20px;
  height: 20px;
}

html[data-wm-visual-route="discovery"] .wingman-shell .wm-selection-card__title {
  font-size: 0.84rem !important;
  line-height: 1.14 !important;
}

html[data-wm-visual-route="discovery"] .wingman-shell .wm-selection-card__description {
  font-size: 0.68rem !important;
  line-height: 1.24 !important;
}

html[data-wm-visual-route="discovery"] .wm-selection-card__check {
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
}

html[data-wm-visual-route="discovery"] .wm-selection-card__check-icon {
  width: 13px;
  height: 13px;
}

html[data-wm-visual-route="discovery"] .wmg-compact-chip,
html[data-wm-visual-route="discovery"] .wmg-inline-actions button,
html[data-wm-visual-route="discovery"] .wmg-output-add-row button,
html[data-wm-visual-route="discovery"] .wmg-secondary-toggle,
html[data-wm-visual-route="discovery"] .wmg-photo-action-button {
  min-height: 34px;
  padding: 7px 10px;
  font-size: 0.76rem;
  line-height: 1.16;
}

html[data-wm-visual-route="discovery"] .wmg-secondary-toggle {
  min-height: 40px;
}

html[data-wm-visual-route="discovery"] .wm-discovery-workflow {
  grid-template-columns: 205px minmax(0, 1fr) 280px !important;
  gap: 12px !important;
}

html[data-wm-visual-route="discovery"] .wm-workflow-rail,
html[data-wm-visual-route="discovery"] .wm-workflow-main,
html[data-wm-visual-route="discovery"] .wm-workflow-insight > div {
  padding: 12px !important;
}

html[data-wm-visual-route="discovery"] .wm-question-focus {
  padding: 12px !important;
}

@media (max-width: 1380px) {
  html[data-wm-visual-route="discovery"] .wm-discovery-workflow {
    grid-template-columns: 185px minmax(0, 1fr) !important;
  }

  html[data-wm-visual-route="discovery"] .wm-workflow-insight {
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  html[data-wm-visual-route="discovery"] .wmg-engineering-canvas__hero,
  html[data-wm-visual-route="discovery"] .wm-discovery-workflow,
  html[data-wm-visual-route="discovery"] .wm-workflow-insight {
    grid-template-columns: 1fr !important;
  }

  html[data-wm-visual-route="discovery"] .wmg-field-grid,
  html[data-wm-visual-route="discovery"] .wmg-field-grid--compact,
  html[data-wm-visual-route="discovery"] .wmg-field-grid--path,
  html[data-wm-visual-route="discovery"] .wmg-card-grid,
  html[data-wm-visual-route="discovery"] .wmg-recommendation-grid {
    grid-template-columns: 1fr;
  }
}
`;

export function installDiscoveryDensityTuning(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(DISCOVERY_DENSITY_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = DISCOVERY_DENSITY_STYLE_ID;
  style.textContent = discoveryDensityCss;
  document.head.appendChild(style);
}
