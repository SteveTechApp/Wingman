import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, FilePenLine, Info, LayoutTemplate, X } from "lucide-react";
import { routeCatalogByKey } from "../app/routeCatalog";
import { deleteCustomRoomTemplate, duplicateCustomRoomTemplate, useCustomRoomTemplates, type CustomRoomTemplate } from "../lib/customRoomTemplates";
import { buildDiscoveryHandoffFromTemplate, writeDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { roomTemplates, type RoomTemplate } from "../lib/roomTemplates";
import { ALL_MARKET_FILTER, TEMPLATE_MARKET_FILTERS, templateMatchesMarketFilter } from "../lib/templateMarkets";
import { defaultPersonalisation, loadTemplateDraft, saveTemplateDraft, toSolutionTemplate, validatePublishedTemplate, type DocumentPersonalisation, type SolutionTemplateDefinition } from "../lib/solutionTemplates";

type AvailableTemplate = RoomTemplate | CustomRoomTemplate;
const isCustom = (template: AvailableTemplate): template is CustomRoomTemplate => "customTemplate" in template && template.customTemplate === true;
const templateTone = (vertical: string) => {
  const market = vertical.toLowerCase();
  if (market.includes("education")) return "blue";
  if (market.includes("retail") || market.includes("hospitality")) return "amber";
  if (market.includes("health") || market.includes("residential")) return "green";
  if (market.includes("government") || market.includes("control") || market.includes("transport")) return "violet";
  if (market.includes("broadcast") || market.includes("media") || market.includes("venue")) return "magenta";
  return "aqua";
};

export function TemplatesPage() {
  const customTemplates = useCustomRoomTemplates();
  const navigate = useNavigate();
  const [market, setMarket] = useState(ALL_MARKET_FILTER);
  const [selected, setSelected] = useState<AvailableTemplate | null>(null);
  const [personalising, setPersonalising] = useState(false);
  const [personalisation, setPersonalisation] = useState<DocumentPersonalisation | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const templates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);
  const filtered = useMemo(() => templates.filter((item) => templateMatchesMarketFilter(item, market)), [templates, market]);
  const definition = selected ? toSolutionTemplate(selected) : null;

  function openTemplate(template: AvailableTemplate) {
    const governed = toSolutionTemplate(template);
    setSelected(template); setPersonalising(false); setSaved(false);
    setPersonalisation(loadTemplateDraft(template.id)?.personalisation || defaultPersonalisation(governed));
  }
  function applyTemplate(template: AvailableTemplate) {
    writeDiscoveryHandoff(buildDiscoveryHandoffFromTemplate(template));
    navigate(routeCatalogByKey.discovery.path);
  }
  function startCustom() { writeDiscoveryHandoff({ mode: "template-create" }); navigate(routeCatalogByKey.discovery.path); }
  function manageCustom(template: CustomRoomTemplate) {
    writeDiscoveryHandoff({ mode: "template-edit", templateId: template.id, templateName: template.name, templateMarket: template.vertical, sourceTemplateId: template.sourceTemplateId, sourceTemplateName: template.name, answers: template.discoveryAnswers, notes: template.discoveryNotes });
    navigate(routeCatalogByKey.discovery.path);
  }
  function update<K extends keyof DocumentPersonalisation>(key: K, value: DocumentPersonalisation[K]) { setPersonalisation((current) => current ? { ...current, [key]: value } : current); setSaved(false); }
  function applyDraft() { if (definition && personalisation) { saveTemplateDraft(definition, personalisation); setSaved(true); } }

  return <main className="wm-templates-page wm-page" data-wingman-page="templates">
    <header className="wm-solution-header">
      <div><p className="wm-ui-kicker">Guided solution documents</p><h1>Solution Templates</h1><p>Choose a market and application, then configure a personalised, editable solution draft.</p></div>
      <div className="wm-solution-header-actions"><button className="wm-button wm-button-secondary" type="button" onClick={() => setMarket("Custom")}>Manage Templates</button><button className="wm-button wm-button-primary" type="button" onClick={startCustom}>+ New Custom Template</button></div>
    </header>
    <nav className="wm-template-stages" aria-label="Template workflow stages">
      {["Market", "Application", "Configure", "Draft"].map((stage, index) => <span key={stage} className={index === (personalising ? 2 : selected ? 1 : 0) ? "is-active" : index < (selected ? 1 : 0) ? "is-complete" : ""}><i>{index < (selected ? 1 : 0) ? <Check /> : index + 1}</i>{stage}</span>)}
    </nav>
    <div className="wm-template-browser">
      <aside className="wm-market-rail" aria-label="Market filters"><h2>Markets</h2>{TEMPLATE_MARKET_FILTERS.map((item) => <button key={item} type="button" aria-label={item} aria-pressed={item === market} className={item === market ? "is-active" : ""} onClick={() => setMarket(item)}><Building2 /> <span>{item}</span><small>{templates.filter((t) => templateMatchesMarketFilter(t, item)).length}</small></button>)}</aside>
      <section className="wm-template-results wm-section-card" aria-label="Application templates">
        <div className="wm-template-results-heading"><div><p className="wm-ui-kicker">{market === ALL_MARKET_FILTER ? "All markets" : market}</p><h2>{filtered.length} templates</h2></div><p>Purpose-led application blueprints. Products are resolved after Discovery.</p></div>
        <div className="wm-solution-card-grid">{filtered.map((template) => {
          const item = toSolutionTemplate(template);
          const purposeId = `template-purpose-${template.id}`;
          return <article className="wm-solution-card wm-action-card" key={template.id} tabIndex={0} data-template-tone={templateTone(template.vertical)} data-custom-template={isCustom(template) ? "true" : undefined}>
            <div className="wm-solution-card-visual" aria-hidden="true"><LayoutTemplate /><span className="wm-badge">{template.vertical}</span></div>
            <div className="wm-solution-card-body"><div className="wm-solution-card-meta"><span className={`wm-status is-${item.status === "published" ? "confirmed" : "assumed"} ${isCustom(template) ? "wm-template-custom-badge" : ""}`}>{item.status === "custom" ? "Custom" : item.status}</span><span>{template.scale}</span></div>
              <h3 className="wm-card-title">{item.title}</h3><div className="wm-template-card-tools"><div className="wm-template-info-trigger"><button type="button" aria-label={`More information about ${item.title}`} aria-describedby={purposeId}><Info /></button><p id={purposeId} role="tooltip" className="wm-copy wm-solution-card-purpose"><strong>{template.scale}</strong><span>{item.purpose}</span><Link className="wm-template-tooltip-review" to={`${routeCatalogByKey.templates.path}/${template.id}`}>Review template</Link></p></div></div>
              <div className="wm-template-actions"><button className="wm-button wm-button-secondary wm-template-action-view" type="button" onClick={() => openTemplate(template)}>View Template</button><button className="wm-button wm-button-primary wm-template-action-use" type="button" onClick={() => applyTemplate(template)}>Use template</button></div>
              {isCustom(template) ? <details className="wm-template-manage"><summary>Manage custom template</summary><div className="wm-template-manage-actions"><button type="button" onClick={() => manageCustom(template)}>Edit</button><button type="button" onClick={() => duplicateCustomRoomTemplate(template.id)}>Duplicate</button><button type="button" onClick={() => confirmDeleteId === template.id ? deleteCustomRoomTemplate(template.id) : setConfirmDeleteId(template.id)}>{confirmDeleteId === template.id ? "Confirm delete?" : "Delete"}</button>{confirmDeleteId === template.id ? <button type="button" onClick={() => setConfirmDeleteId(null)}>Keep template</button> : null}</div></details> : null}
            </div></article>;
        })}</div>
      </section>
    </div>
    {selected && definition && personalisation ? <TemplateDrawer template={selected} definition={definition} personalisation={personalisation} personalising={personalising} saved={saved} onClose={() => setSelected(null)} onPersonalise={() => setPersonalising(true)} onBack={() => setPersonalising(false)} onUpdate={update} onApply={applyDraft} onUse={() => applyTemplate(selected)} /> : null}
  </main>;
}

function TemplateDrawer({ template, definition, personalisation, personalising, saved, onClose, onPersonalise, onBack, onUpdate, onApply, onUse }: { template: AvailableTemplate; definition: SolutionTemplateDefinition; personalisation: DocumentPersonalisation; personalising: boolean; saved: boolean; onClose: () => void; onPersonalise: () => void; onBack: () => void; onUpdate: <K extends keyof DocumentPersonalisation>(key: K, value: DocumentPersonalisation[K]) => void; onApply: () => void; onUse: () => void }) {
  const publicationIssues = validatePublishedTemplate(definition);
  return <div className="wm-template-drawer-backdrop"><button className="wm-template-drawer-scrim" type="button" onClick={onClose} aria-label="Close template preview" /><aside className="wm-template-preview-drawer" role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
    <header><div><p className="wm-ui-kicker">{personalising ? "Configure document" : `${definition.market} · ${template.scale}`}</p><h2 id="template-preview-title">{personalising ? `Personalise ${definition.title}` : definition.title}</h2></div><button className="wm-icon-button" type="button" onClick={onClose} aria-label="Close template preview"><X /></button></header>
    {personalising ? <PersonalisationForm value={personalisation} onUpdate={onUpdate} /> : <div className="wm-template-preview-content">
      <section className="wm-section-card"><h3 className="wm-section-title">Purpose</h3><p className="wm-copy">{definition.purpose}</p></section><section className="wm-section-card"><h3 className="wm-section-title">Market-aware customer story</h3><p className="wm-copy">{definition.customerStory}</p></section><div className="wm-template-preview-split"><section><h3>User experience</h3><p>{definition.userExperience}</p></section><section><h3>Business outcomes</h3><ul>{definition.businessOutcomes.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
      <section><h3>Suggested architecture</h3><p>{definition.architectureDirection}</p></section><section><h3>Included AV paths</h3><ul>{definition.productFamilyRules.slice(0, 6).map((x) => <li key={x}>{x}</li>)}</ul></section>
      <div className="wm-template-preview-split"><section><h3>Assumptions</h3><ul>{definition.assumptions.map((x) => <li key={x}><span className="wm-status is-assumed">Assumed</span>{x}</li>)}</ul></section><section><h3>Information still required</h3><ul>{definition.qualificationQuestions.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
      <section><h3>Required dependencies</h3><ul>{definition.requiredDependencies.map((x) => <li key={x}>{x}</li>)}</ul></section><section><h3>Expected document contents</h3><p>{definition.documentBlueprint.join(" · ")}</p></section>
      {publicationIssues.length ? <p className="wm-template-validation-warning">Draft only: missing {publicationIssues.join(", ")}.</p> : null}
    </div>}
    <footer>{personalising ? <><button className="wm-button wm-button-secondary" type="button" onClick={onBack}>Back to preview</button><button className="wm-button wm-button-secondary" type="button" onClick={() => location.reload()}>Reset to Brand Defaults</button><button className="wm-button wm-button-primary" type="button" onClick={onApply}>{saved ? "Draft saved" : "Apply to Draft"}</button></> : <><Link className="wm-button wm-button-secondary" to={`${routeCatalogByKey.templates.path}/${template.id}`}>Review Template</Link><button className="wm-button wm-button-secondary" type="button" onClick={onPersonalise}><FilePenLine /> Personalise</button><button className="wm-button wm-button-primary" type="button" onClick={onUse}>Use Template <ArrowRight /></button></>}</footer>
  </aside></div>;
}

function PersonalisationForm({ value, onUpdate }: { value: DocumentPersonalisation; onUpdate: <K extends keyof DocumentPersonalisation>(key: K, value: DocumentPersonalisation[K]) => void }) {
  const field = (key: keyof DocumentPersonalisation, label: string, type = "text") => <label>{label}<input type={type} value={String(value[key])} onChange={(e) => onUpdate(key, e.target.value as never)} /></label>;
  return <div className="wm-personalisation-form"><fieldset><legend>Document details</legend><div className="wm-form-grid">{field("documentTitle", "Document title")}{field("customerName", "Customer name")}{field("site", "Site")}{field("projectReference", "Project reference")}{field("author", "Author")}{field("date", "Date", "date")}{field("revision", "Revision")}</div></fieldset>
    <fieldset><legend>Brand</legend><div className="wm-form-grid">{field("organisationLogo", "Organisation logo URL")}{field("customerLogo", "Customer logo URL")}{field("primaryColour", "Primary colour", "color")}{field("secondaryColour", "Secondary colour", "color")}{field("font", "Font")}{field("coverImage", "Cover image URL")}{field("footer", "Footer")}{field("disclaimer", "Disclaimer")}</div></fieldset>
    <fieldset><legend>Content</legend>{(["purpose", "customerStory", "objectives", "executiveSummary", "scope", "exclusions", "nextSteps"] as const).map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1")}<textarea value={value[key]} onChange={(e) => onUpdate(key, e.target.value)} /></label>)}</fieldset>
    <fieldset><legend>Audience and detail</legend><div className="wm-form-grid"><label>Audience<select value={value.audience} onChange={(e) => onUpdate("audience", e.target.value as DocumentPersonalisation["audience"])}>{["Customer", "Consultant", "Integrator", "Internal"].map(x => <option key={x}>{x}</option>)}</select></label><label>Detail<select value={value.detail} onChange={(e) => onUpdate("detail", e.target.value as DocumentPersonalisation["detail"])}>{["Executive", "Standard", "Technical"].map(x => <option key={x}>{x}</option>)}</select></label></div></fieldset>
    <fieldset><legend>Output structure</legend>{([ ["showOptionalUpgrades", "Optional upgrade section"], ["showThirdPartyPlaceholders", "Third-party equipment placeholders"], ["showAssumptionsAndRisks", "Assumptions and risk section"], ["showTechnicalAppendix", "Technical appendix"] ] as const).map(([key, label]) => <label className="wm-check-row" key={key}><input type="checkbox" checked={value[key]} onChange={(e) => onUpdate(key, e.target.checked)} />{label}</label>)}</fieldset>
  </div>;
}

export default TemplatesPage;
