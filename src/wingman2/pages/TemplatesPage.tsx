import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutTemplate } from "lucide-react";

import { routeCatalogByKey } from "../app/routeCatalog";
import {
  deleteCustomRoomTemplate,
  duplicateCustomRoomTemplate,
  useCustomRoomTemplates,
  type CustomRoomTemplate,
} from "../lib/customRoomTemplates";
import { buildDiscoveryHandoffFromTemplate, writeDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { roomTemplates, type RoomTemplate } from "../lib/roomTemplates";
import { ALL_MARKET_FILTER, TEMPLATE_MARKET_FILTERS, templateMatchesMarketFilter } from "../lib/templateMarkets";

function isCustomRoomTemplate(template: RoomTemplate | CustomRoomTemplate): template is CustomRoomTemplate {
  return "customTemplate" in template && template.customTemplate === true;
}

export function TemplatesPage() {
  const customTemplates = useCustomRoomTemplates();
  const navigate = useNavigate();
  const [marketFilter, setMarketFilter] = useState<string>(ALL_MARKET_FILTER);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const availableTemplates = useMemo(
    () => [...customTemplates, ...roomTemplates],
    [customTemplates],
  );

  const filteredTemplates = useMemo(
    () => availableTemplates.filter((template) => templateMatchesMarketFilter(template, marketFilter)),
    [availableTemplates, marketFilter],
  );

  function startNewCustomTemplate() {
    writeDiscoveryHandoff({ mode: "template-create" });
    navigate(routeCatalogByKey.discovery.path);
  }

  function applyTemplateToDiscovery(template: RoomTemplate | CustomRoomTemplate) {
    writeDiscoveryHandoff(buildDiscoveryHandoffFromTemplate(template));
    navigate(routeCatalogByKey.discovery.path);
  }

  function editCustomTemplate(template: CustomRoomTemplate) {
    writeDiscoveryHandoff({
      mode: "template-edit",
      templateId: template.id,
      templateName: template.name,
      templateMarket: template.vertical,
      sourceTemplateId: template.sourceTemplateId,
      sourceTemplateName: template.name,
      answers: template.discoveryAnswers,
      notes: template.discoveryNotes,
    });
    navigate(routeCatalogByKey.discovery.path);
  }

  function duplicateTemplate(template: CustomRoomTemplate) {
    duplicateCustomRoomTemplate(template.id);
  }

  function confirmDelete(template: CustomRoomTemplate) {
    if (confirmDeleteId === template.id) {
      deleteCustomRoomTemplate(template.id);
      setConfirmDeleteId(null);
      return;
    }

    setConfirmDeleteId(template.id);
  }

  return (
    <main className="wm-templates-page wm-polish-shell wm-page" data-wingman-page="templates">
      <header className="wm-polish-hero wm-polish-aqua">
        <span className="wm-polish-hero-icon" aria-hidden="true"><LayoutTemplate /></span>
        <div className="wm-polish-hero-copy">
          <p className="wm-polish-eyebrow">Template library</p>
          <h1>Room and application templates</h1>
          <p>Start from a proven room archetype or reuse a custom design.</p>
        </div>
      </header>

      <section
        className="wm-template-library-toolbar wm-section-card"
        aria-label="Template library summary"
      >
        <div className="wm-template-library-summary">
          <p className="wm-template-kicker wm-ui-kicker">Template library</p>
          <h2 className="wm-template-library-count" aria-live="polite">
            {filteredTemplates.length} templates
          </h2>
        </div>

        <button
          type="button"
          className="wm-button wm-button-primary wm-template-library-create"
          onClick={startNewCustomTemplate}
        >
          + New Custom Template
        </button>
      </section>

      <section className="wm-template-filter-toolbar" aria-label="Template filters">
        <div className="wm-template-filter-group" aria-label="Vertical filter">
          <span className="wm-template-filter-label">Vertical market</span>
          <div className="wm-template-filter-strip">
            {TEMPLATE_MARKET_FILTERS.map((market) => (
              <button
                key={market}
                type="button"
                className={`wm-filter-chip${market === marketFilter ? " is-active" : ""}`}
                onClick={() => setMarketFilter(market)}
                aria-pressed={market === marketFilter}
              >
                {market}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="wm-section wm-template-card-grid" aria-label="Room templates">
        {filteredTemplates.map((template) => {
          const isCustom = isCustomRoomTemplate(template);

          return (
            <article
              key={template.id}
              className="wm-action-card wm-template-card"
              data-custom-template={isCustom ? "true" : undefined}
            >
              <div className="wm-template-card-top">
                {isCustom ? <span className="wm-badge wm-template-custom-badge">Custom</span> : null}
                <span className="wm-badge">{template.vertical}</span>
                <span className="wm-badge">{template.scale}</span>
              </div>

              <h3 className="wm-card-title">{template.name}</h3>
              <p className="wm-copy wm-template-summary">{template.summary}</p>
              <p className="wm-copy wm-template-direction">{template.application}</p>

              <div className="wm-template-actions wm-action-row">
                <Link
                  className="wm-button wm-button-primary"
                  to={`${routeCatalogByKey.templates.path}/${template.id}`}
                  data-template-build-pack="true"
                >
                  Review template
                </Link>
                <button type="button" className="wm-button wm-button-secondary" onClick={() => applyTemplateToDiscovery(template)}>
                  Use template
                </button>

                {isCustom ? (
                  <>
                    <button type="button" className="wm-button wm-button-secondary" onClick={() => editCustomTemplate(template)}>
                      Edit
                    </button>
                    <button type="button" className="wm-button wm-button-secondary" onClick={() => duplicateTemplate(template)}>
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="wm-button wm-button-secondary"
                      onClick={() => confirmDelete(template)}
                    >
                      {confirmDeleteId === template.id ? "Confirm delete?" : "Delete"}
                    </button>
                    {confirmDeleteId === template.id ? (
                      <button type="button" className="wm-button wm-button-secondary" onClick={() => setConfirmDeleteId(null)}>
                        Keep template
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {filteredTemplates.length === 0 ? (
        <section className="wm-output-panel" aria-live="polite">
          <h2 className="wm-section-title">Nothing matches that filter</h2>
          <p className="wm-copy">Choose a different vertical market, or create a new custom template.</p>
        </section>
      ) : null}
    </main>
  );
}

export default TemplatesPage;
