import { PagedItems } from "../components/PagedItems";

import { createCustomTemplateEditHandoff, writeDiscoveryHandoff } from "../lib/discoveryTemplateHandoff";
import { useUiMode } from "../data/uiMode";

import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, Check, FilePenLine, LayoutGrid, List, X } from "lucide-react";
import { TemplateLibraryCard } from "../components/TemplateLibraryCard";
import { useProjectStore } from "../features/projects";
import { routeCatalogByKey } from "../app/routeCatalog";
import { deleteCustomRoomTemplate, duplicateCustomRoomTemplate, useCustomRoomTemplates, type CustomRoomTemplate } from "../lib/customRoomTemplates";

import { roomTemplates, type RoomTemplate } from "../lib/roomTemplates";
import { getTemplateApplicationProfile } from "../lib/templateApplicationProfiles";
import { templateImageFor } from "../lib/templateImages";
import { TEMPLATE_MARKETS, TEMPLATE_MARKET_FILTERS, templateMatchesMarketFilter } from "../lib/templateMarkets";
import { templateMatchesSourceProject, templateSourceProjects } from "../lib/templateLineage";
import { WALL_ENTRY_INTRO, WALL_ENTRY_NAME } from "../lib/wallEntry";
import { applyOrganisationDocumentDefaults, defaultPersonalisation, loadTemplateDraft, saveTemplateDraft, toSolutionTemplate, validatePublishedTemplate, type DocumentPersonalisation, type SolutionTemplateDefinition } from "../lib/solutionTemplates";

type AvailableTemplate = RoomTemplate | CustomRoomTemplate;
const isCustom = (template: AvailableTemplate): template is CustomRoomTemplate => "customTemplate" in template && template.customTemplate === true;

export function TemplatesPage() {
  const { isGuided } = useUiMode();
  const customTemplates = useCustomRoomTemplates();
  const { projects } = useProjectStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // A room already decided elsewhere opens the library on its own market, so a
  // rep arriving from the room brief reads designs for that vertical rather than
  // whichever market the catalogue happens to list first. An unknown value is
  // ignored rather than trusted: the market on screen is always one the rail can
  // show as pressed.
  const [market, setMarket] = useState<string>(() => {
    const requested = searchParams.get("market") ?? "";
    return (TEMPLATE_MARKET_FILTERS as readonly string[]).includes(requested) ? requested : TEMPLATE_MARKETS[0];
  });
  const [sourceProject, setSourceProject] = useState<string | null>(null);
  const [view, setView] = useState<"picture" | "list">("picture");
  const [selected, setSelected] = useState<AvailableTemplate | null>(null);
  const [personalising, setPersonalising] = useState(false);
  const [personalisation, setPersonalisation] = useState<DocumentPersonalisation | null>(null);
  const [saved, setSaved] = useState(false);
  const [brandNote, setBrandNote] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const templates = useMemo(() => [...customTemplates, ...roomTemplates], [customTemplates]);
  const sourceProjects = useMemo(() => templateSourceProjects(customTemplates, projects), [customTemplates, projects]);
  const lineage = sourceProjects.find((project) => project.id === sourceProject) ?? null;
  // A source project answers "which of my designs came from this room", so it
  // searches the whole library rather than the market on screen. Choosing a
  // market clears it: a rep is browsing one way or the other.
  const filtered = useMemo(() => sourceProject
    ? templates.filter((item) => templateMatchesSourceProject(item, sourceProject))
    : templates.filter((item) => templateMatchesMarketFilter(item, market)), [templates, market, sourceProject]);
  const definition = selected ? toSolutionTemplate(selected) : null;

  function personaliseTemplate(template: AvailableTemplate) {
    const governed = toSolutionTemplate(template);
    setSelected(template); setPersonalising(true); setSaved(false); setBrandNote("");
    setPersonalisation(loadTemplateDraft(template.id)?.personalisation || defaultPersonalisation(governed));
  }
  function applyTemplate(template: AvailableTemplate) {
    navigate(`${routeCatalogByKey.templates.path}/${template.id}`);
  }
  function startCustom() { navigate(`${routeCatalogByKey.templates.path}/new`); }
  function manageCustom(template: CustomRoomTemplate) {
    writeDiscoveryHandoff(createCustomTemplateEditHandoff(template));
    navigate(`${routeCatalogByKey.templates.path}/${encodeURIComponent(template.id)}/edit`);
  }
  function update<K extends keyof DocumentPersonalisation>(key: K, value: DocumentPersonalisation[K]) { setPersonalisation((current) => current ? { ...current, [key]: value } : current); setSaved(false); setBrandNote(""); }
  function applyDraft() { if (definition && personalisation) { saveTemplateDraft(definition, personalisation); setSaved(true); } }
  /**
   * Take the organisation's saved brand into the draft on screen.
   *
   * The drawer's old action reloaded the page, which threw this draft away and
   * never read what Settings stored. Only the six brand fields move, so the
   * title, scope and summary a rep wrote for this room stay as they are — and so
   * do the audience and detail they picked for this customer.
   */
  function useSavedDefaults() {
    if (!personalisation) return;
    setPersonalisation(applyOrganisationDocumentDefaults(personalisation));
    setSaved(false);
    setBrandNote("Brand defaults applied — logo, colours, font, footer and disclaimer now match Settings. Your audience, detail and words are unchanged.");
  }

  return <main className="wm-templates-page wm-page" data-wingman-page="templates">
    <header className="wm-solution-header">
      <div><p className="wm-ui-kicker">Guided solution documents</p><h1 data-testid="templates-title" className="wm-page-title">Solution Templates</h1><p className="wm-ui-copy">Choose a market and application, then review and adjust its equipment schedule before producing the proposal.</p></div>
      <div className="wm-solution-header-actions"><Link className="wm-button wm-button-secondary" to={routeCatalogByKey.videowall.path} title={WALL_ENTRY_INTRO}>{WALL_ENTRY_NAME}</Link><button className="wm-button wm-button-secondary" type="button" onClick={() => { setMarket("Custom"); setSourceProject(null); }}>Manage Templates</button>{!isGuided && <button className="wm-button wm-button-primary" type="button" onClick={startCustom}>+ New Custom Template</button>}</div>
    </header>
    <nav className="wm-template-stages" aria-label="Template workflow stages">
      {["Market", "Application", "Configure", "Draft"].map((stage, index) => <span key={stage} className={index === (personalising ? 2 : selected ? 1 : 0) ? "is-active" : index < (selected ? 1 : 0) ? "is-complete" : ""}><i>{index < (selected ? 1 : 0) ? <Check /> : index + 1}</i>{stage}</span>)}
    </nav>
    <div className="wm-template-browser">
      <aside className="wm-market-rail wm-ui-card" aria-label="Market filters"><h2 className="wm-section-title">Markets</h2>{TEMPLATE_MARKET_FILTERS.map((item) => <button key={item} type="button" aria-label={item} aria-pressed={!sourceProject && item === market} className={!sourceProject && item === market ? "is-active" : ""} onClick={() => { setMarket(item); setSourceProject(null); }}><Building2 /> <span>{item}</span><small>{templates.filter((t) => templateMatchesMarketFilter(t, item)).length}</small></button>)}</aside>
      <section className="wm-template-results wm-section-card" aria-label="Application templates" data-template-view={view}>
        <div className="wm-template-results-heading"><div><p className="wm-ui-kicker">{lineage ? `Saved from ${lineage.name}` : market}</p><h2 className="wm-section-title">{filtered.length} templates</h2></div><div className="wm-template-view-toggle" role="group" aria-label="Template view"><button type="button" className={`wm-button wm-button-${view === "picture" ? "primary" : "secondary"}`} aria-pressed={view === "picture"} onClick={() => setView("picture")}><LayoutGrid size={16} aria-hidden="true" />Picture view</button><button type="button" className={`wm-button wm-button-${view === "list" ? "primary" : "secondary"}`} aria-pressed={view === "list"} onClick={() => setView("list")}><List size={16} aria-hidden="true" />List view</button></div><p className="wm-ui-copy">Purpose-led room blueprints with an editable WyreStorm BOM.</p></div>
        {sourceProjects.length ? <div className="wm-template-source-filter" role="group" aria-label="Templates saved from a project"><span>Saved from project</span>{sourceProjects.map((project) => <button key={project.id} type="button" aria-pressed={project.id === sourceProject} className={project.id === sourceProject ? "is-active" : ""} onClick={() => setSourceProject((current) => current === project.id ? null : project.id)}>{project.name}<small>{project.templateIds.length}</small></button>)}{lineage ? <button type="button" className="wm-template-source-clear" onClick={() => setSourceProject(null)}>Show all markets</button> : null}</div> : null}
        {!sourceProject && market === "Custom" && filtered.length === 0 ? <div className="wm-ui-card"><h3 className="wm-section-title">No custom designs yet</h3><p className="wm-ui-copy">Choose an existing template from one of the markets, modify its equipment schedule, then select Save as template to save it as a custom design. Your saved designs will appear here.</p></div> : null}
        <PagedItems items={filtered} pageSize={8} resetKey={`${market}|${sourceProject ?? ""}`}>{(pageItems) => <div className="wm-solution-card-grid">{pageItems.map((template) => <TemplateLibraryCard key={template.id} template={template} onReview={() => applyTemplate(template)} onPersonalise={() => personaliseTemplate(template)} {...(isCustom(template) ? { onEdit: () => manageCustom(template), onDuplicate: () => duplicateCustomRoomTemplate(template.id), onDelete: () => confirmDeleteId === template.id ? deleteCustomRoomTemplate(template.id) : setConfirmDeleteId(template.id), onCancelDelete: () => setConfirmDeleteId(null), deletePending: confirmDeleteId === template.id } : {})} />)}</div>}</PagedItems>
      </section>
    </div>
    {selected && definition && personalisation ? <TemplateDrawer template={selected} definition={definition} personalisation={personalisation} personalising={personalising} saved={saved} brandNote={brandNote} onClose={() => setSelected(null)} onPersonalise={() => setPersonalising(true)} onBack={() => setPersonalising(false)} onUpdate={update} onApply={applyDraft} onUseDefaults={useSavedDefaults} onUse={() => applyTemplate(selected)} /> : null}
  </main>;
}

function TemplateDrawer({ template, definition, personalisation, personalising, saved, brandNote, onClose, onPersonalise, onBack, onUpdate, onApply, onUseDefaults, onUse }: { template: AvailableTemplate; definition: SolutionTemplateDefinition; personalisation: DocumentPersonalisation; personalising: boolean; saved: boolean; brandNote: string; onClose: () => void; onPersonalise: () => void; onBack: () => void; onUpdate: <K extends keyof DocumentPersonalisation>(key: K, value: DocumentPersonalisation[K]) => void; onApply: () => void; onUseDefaults: () => void; onUse: () => void }) {
  const publicationIssues = validatePublishedTemplate(definition);
  const profile = getTemplateApplicationProfile(template);
  return <div className="wm-template-drawer-backdrop"><button className="wm-template-drawer-scrim" type="button" onClick={onClose} aria-label="Close template preview" /><aside className="wm-template-preview-drawer" role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
    <header><div><p className="wm-ui-kicker">{personalising ? "Configure document" : `${definition.market} · ${template.scale}`}</p><h2 id="template-preview-title">{personalising ? `Personalise ${definition.title}` : definition.title}</h2></div><button className="wm-icon-button" type="button" onClick={onClose} aria-label="Close template preview"><X /></button></header>
    {personalising ? <PersonalisationForm value={personalisation} onUpdate={onUpdate} brandNote={brandNote} /> : <div className="wm-template-preview-content">
      <figure className="wm-template-brief-image"><img src={templateImageFor(template)} alt={`${definition.title} application`} /><figcaption><span>{profile.canonicalMarket}</span><strong>{template.scale}</strong><p>{template.summary}</p></figcaption></figure>
      <section className="wm-section-card"><h3 className="wm-section-title">Application brief</h3><p className="wm-copy">{profile.userJourney}</p></section>
      <div className="wm-template-preview-split"><section><h3>Architecture</h3><strong>{profile.architectureFamily}</strong><p>{definition.architectureDirection}</p></section><section><h3>Sizing basis</h3><ul>{profile.sizingBasis.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
      <div className="wm-template-preview-split"><section><h3>Included WyreStorm scope</h3><ul>{profile.inclusions.map((x) => <li key={x}>{x}</li>)}</ul></section><section><h3>Third-party scope</h3><ul>{profile.exclusions.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
      <div className="wm-template-preview-split"><section><h3>Assumptions</h3><ul>{definition.assumptions.map((x) => <li key={x}><span className="wm-status is-assumed">Assumed</span>{x}</li>)}</ul></section><section><h3>Site validation required</h3><ul>{template.validationItems.map((x) => <li key={x}>{x}</li>)}</ul></section></div>
      {publicationIssues.length ? <p className="wm-template-validation-warning">Draft only: missing {publicationIssues.join(", ")}.</p> : null}
    </div>}
    <footer>{personalising ? <><button className="wm-button wm-button-secondary" type="button" onClick={onBack}>Back to preview</button><button className="wm-button wm-button-secondary" type="button" onClick={onUseDefaults} data-testid="template-personalisation-brand-defaults">Use document defaults</button><button className="wm-button wm-button-primary" type="button" onClick={onApply}>{saved ? "Draft saved" : "Apply to Draft"}</button></> : <><Link className="wm-button wm-button-secondary" to={`${routeCatalogByKey.templates.path}/${template.id}`}>Review Template</Link><button className="wm-button wm-button-secondary" type="button" onClick={onPersonalise}><FilePenLine /> Personalise</button><button className="wm-button wm-button-primary" type="button" onClick={onUse}>Use Template <ArrowRight /></button></>}</footer>
  </aside></div>;
}

function PersonalisationForm({ value, onUpdate, brandNote }: { value: DocumentPersonalisation; onUpdate: <K extends keyof DocumentPersonalisation>(key: K, value: DocumentPersonalisation[K]) => void; brandNote: string }) {
  const field = (key: keyof DocumentPersonalisation, label: string, type = "text") => <label>{label}<input type={type} value={String(value[key])} onChange={(e) => onUpdate(key, e.target.value as never)} /></label>;
  return <div className="wm-personalisation-form">{brandNote ? <p className="wm-ui-copy" role="status" data-testid="template-brand-defaults-note">{brandNote}</p> : null}<fieldset><legend>Document details</legend><div className="wm-form-grid">{field("documentTitle", "Document title")}{field("customerName", "Customer name")}{field("site", "Site")}{field("projectReference", "Project reference")}{field("author", "Author")}{field("date", "Date", "date")}{field("revision", "Revision")}</div></fieldset>
    <fieldset><legend>Brand</legend><div className="wm-form-grid">{field("organisationLogo", "Organisation logo URL")}{field("customerLogo", "Customer logo URL")}{field("primaryColour", "Primary colour", "color")}{field("secondaryColour", "Secondary colour", "color")}{field("font", "Font")}{field("coverImage", "Cover image URL")}{field("footer", "Footer")}{field("disclaimer", "Disclaimer")}</div></fieldset>
    <fieldset><legend>Content</legend>{(["purpose", "customerStory", "objectives", "executiveSummary", "scope", "exclusions", "nextSteps"] as const).map((key) => <label key={key}>{key.replace(/([A-Z])/g, " $1")}<textarea value={value[key]} onChange={(e) => onUpdate(key, e.target.value)} /></label>)}</fieldset>
    <fieldset><legend>Audience and detail</legend><div className="wm-form-grid"><label>Audience<select value={value.audience} onChange={(e) => onUpdate("audience", e.target.value as DocumentPersonalisation["audience"])}>{["Customer", "Consultant", "Integrator", "Internal"].map(x => <option key={x}>{x}</option>)}</select></label><label>Detail<select value={value.detail} onChange={(e) => onUpdate("detail", e.target.value as DocumentPersonalisation["detail"])}>{["Executive", "Standard", "Technical"].map(x => <option key={x}>{x}</option>)}</select></label></div></fieldset>
  </div>;
}

export default TemplatesPage;
