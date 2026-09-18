import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Check, FilePenLine, X } from "lucide-react";
import { TemplateLibraryCard } from "../components/TemplateLibraryCard";
import { routeCatalogByKey } from "../app/routeCatalog";
import { deleteCustomRoomTemplate, duplicateCustomRoomTemplate, useCustomRoomTemplates, type CustomRoomTemplate } from "../lib/customRoomTemplates";
import { writeDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { roomTemplates, type RoomTemplate } from "../lib/roomTemplates";
import { getTemplateApplicationProfile } from "../lib/templateApplicationProfiles";
import { templateImageFor } from "../lib/templateImages";
import { TEMPLATE_MARKETS, TEMPLATE_MARKET_FILTERS, templateMatchesMarketFilter } from "../lib/templateMarkets";
import { defaultPersonalisation, loadTemplateDraft, saveTemplateDraft, toSolutionTemplate, validatePublishedTemplate, type DocumentPersonalisation, type SolutionTemplateDefinition } from "../lib/solutionTemplates";

type AvailableTemplate = RoomTemplate | CustomRoomTemplate;
const isCustom = (template: AvailableTemplate): template is CustomRoomTemplate => "customTemplate" in template && template.customTemplate === true;

export function TemplatesPage() {
  const customTemplates = useCustomRoomTemplates();
  const navigate = useNavigate();
  const [market, setMarket] = useState<string>(TEMPLATE_MARKETS[0]);
  const [selected, setSelected] = useState<AvailableTemplate | null>(null);
  const [personalising, setPersonalising] = useState(false);
  const [personalisation, setPersonalisation] = useState<DocumentPersonalisation | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const templates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);
  const filtered = useMemo(() => templates.filter((item) => templateMatchesMarketFilter(item, market)), [templates, market]);
  const definition = selected ? toSolutionTemplate(selected) : null;

  function personaliseTemplate(template: AvailableTemplate) {
    const governed = toSolutionTemplate(template);
    setSelected(template); setPersonalising(true); setSaved(false);
    setPersonalisation(loadTemplateDraft(template.id)?.personalisation || defaultPersonalisation(governed));
  }
  function applyTemplate(template: AvailableTemplate) {
    navigate(`${routeCatalogByKey.templates.path}/${template.id}`);
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
      <div><p className="wm-ui-kicker">Guided solution documents</p><h1>Solution Templates</h1><p>Choose a market and application, then review and adjust its equipment schedule before producing the proposal.</p></div>
      <div className="wm-solution-header-actions"><button className="wm-button wm-button-secondary" type="button" onClick={() => setMarket("Custom")}>Manage Templates</button><button className="wm-button wm-button-primary" type="button" onClick={startCustom}>+ New Custom Template</button></div>
    </header>
    <nav className="wm-template-stages" aria-label="Template workflow stages">
      {["Market", "Application", "Configure", "Draft"].map((stage, index) => <span key={stage} className={index === (personalising ? 2 : selected ? 1 : 0) ? "is-active" : index < (selected ? 1 : 0) ? "is-complete" : ""}><i>{index < (selected ? 1 : 0) ? <Check /> : index + 1}</i>{stage}</span>)}
    </nav>
    <div className="wm-template-browser">
      <aside className="wm-market-rail" aria-label="Market filters"><h2>Markets</h2>{TEMPLATE_MARKET_FILTERS.map((item) => <button key={item} type="button" aria-label={item} aria-pressed={item === market} className={item === market ? "is-active" : ""} onClick={() => setMarket(item)}><Building2 /> <span>{item}</span><small>{templates.filter((t) => templateMatchesMarketFilter(t, item)).length}</small></button>)}</aside>
      <section className="wm-template-results wm-section-card" aria-label="Application templates">
        <div className="wm-template-results-heading"><div><p className="wm-ui-kicker">{market}</p><h2>{filtered.length} templates</h2></div><p>Purpose-led room blueprints with an editable WyreStorm BOM.</p></div>
        <div className="wm-solution-card-grid">{filtered.map((template) => <TemplateLibraryCard key={template.id} template={template} onReview={() => applyTemplate(template)} onPersonalise={() => personaliseTemplate(template)} {...(isCustom(template) ? { onEdit: () => manageCustom(template), onDuplicate: () => duplicateCustomRoomTemplate(template.id), onDelete: () => confirmDeleteId === template.id ? deleteCustomRoomTemplate(template.id) : setConfirmDeleteId(template.id), onCancelDelete: () => setConfirmDeleteId(null), deletePending: confirmDeleteId === template.id } : {})} />)}</div>
      </section>
    </div>
    {selected && definition && personalisation ? <TemplateDrawer template={selected} definition={definition} personalisation={personalisation} personalising={personalising} saved={saved} onClose={() => setSelected(null)} onPersonalise={() => setPersonalising(true)} onBack={() => setPersonalising(false)} onUpdate={update} onApply={applyDraft} onUse={() => applyTemplate(selected)} /> : null}
  </main>;
}

function TemplateDrawer({ template, definition, personalisation, personalising, saved, onClose, onPersonalise, onBack, onUpdate, onApply, onUse }: { template: AvailableTemplate; definition: SolutionTemplateDefinition; personalisation: DocumentPersonalisation; personalising: boolean; saved: boolean; onClose: () => void; onPersonalise: () => void; onBack: () => void; onUpdate: <K extends keyof DocumentPersonalisation>(key: K, value: DocumentPersonalisation[K]) => void; onApply: () => void; onUse: () => void }) {
  const publicationIssues = validatePublishedTemplate(definition);
  const profile = getTemplateApplicationProfile(template);
  return <div className="wm-template-drawer-backdrop"><button className="wm-template-drawer-scrim" type="button" onClick={onClose} aria-label="Close template preview" /><aside className="wm-template-preview-drawer" role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
    <header><div><p className="wm-ui-kicker">{personalising ? "Configure document" : `${definition.market} · ${template.scale}`}</p><h2 id="template-preview-title">{personalising ? `Personalise ${definition.title}` : definition.title}</h2></div><button className="wm-icon-button" type="button" onClick={onClose} aria-label="Close template preview"><X /></button></header>
    {personalising ? <PersonalisationForm value={personalisation} onUpdate={onUpdate} /> : <div className="wm-template-preview-content">
      <figure className="wm-template-brief-image"><img src={templateImageFor(template)} alt={`${definition.title} application`} /><figcaption><span>{profile.canonicalMarket}</span><strong>{template.scale}</strong><p>{template.summary}</p></figcaption></figure>
      <section className="wm-section-card"><h3 className="wm-section-title">Application brief</h3><p className="wm-copy">{profile.userJourney}</p></section>
      <div className="wm-template-preview-split"><section><h3>Architecture</h3><strong>{profile.architectureFamily}</strong><p>{definition.architectureDirection}</p></section><section><h3>Sizing basis</h3><ul>{profile.sizingBasis.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
      <div className="wm-template-preview-split"><section><h3>Included WyreStorm scope</h3><ul>{profile.inclusions.map((x) => <li key={x}>{x}</li>)}</ul></section><section><h3>Third-party scope</h3><ul>{profile.exclusions.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
      <div className="wm-template-preview-split"><section><h3>Assumptions</h3><ul>{definition.assumptions.map((x) => <li key={x}><span className="wm-status is-assumed">Assumed</span>{x}</li>)}</ul></section><section><h3>Site validation required</h3><ul>{template.validationItems.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
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
