import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { getCurrentWorkflowProject, saveVideowallToProject } from "../features/projects";
import { VideowallPreview } from "../components/VideowallPreview";
import { assessVideowallOptions, defaultWallRequirements, validateWallRequirements, wallApplications, WALL_RESEARCH_DATE, type WallRequirements, type WallLayout } from "../lib/videowallOptions";
import "../styles/wingman-videowall.css";

const draftKey = "wingman:videowall-builder:v2";
function restoreDraft(): { requirements: WallRequirements; selectedId: string } {
  const fallback = { requirements: { ...defaultWallRequirements }, selectedId: "mx-0404-scl" };
  try {
    const projectDraft = getCurrentWorkflowProject()?.videowall?.summary;
    const raw = projectDraft?.version === 2 ? projectDraft : JSON.parse(window.localStorage.getItem(draftKey) || "null");
    const r = raw?.requirements;
    if (!r || !wallApplications.some(a => a.value === r.application)
      || !["single", "split", "quad", "nine", "custom", "independent"].includes(r.layout)
      || !["local", "distributed"].includes(r.sourceLocation)
      || !["1080p", "4k30", "4k60"].includes(r.sourceResolution)
      || !["any", "none", "1g", "10g"].includes(r.network)
      || !["portrait", "landscape"].includes(r.orientation)
      || validateWallRequirements(r).length) return fallback;
    return { requirements: r as WallRequirements, selectedId: typeof raw.selectedId === "string" ? raw.selectedId : fallback.selectedId };
  } catch { return fallback; }
}

export function VideoWallPage() {
  const [draft] = useState(restoreDraft);
  const [requirements, setRequirements] = useState(draft.requirements);
  const [selectedId, setSelectedId] = useState(draft.selectedId);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const options = assessVideowallOptions(requirements);
  const selected = options.find(option => option.id === selectedId) || options[0];
  const errors = validateWallRequirements(requirements);
  const lcd = requirements.application.startsWith("lcd");
  const compatible = options.filter(option => !option.blockers.length);
  function update<K extends keyof WallRequirements>(key: K, value: WallRequirements[K]) {
    setRequirements(current => {
      const next = { ...current, [key]: value };
      if (key === "application" && value !== "lcd-direct" && current.layout === "independent") { next.layout = "single"; next.windows = 1; }
      return next;
    });
    setMessage("");
  }
  function layout(value: WallLayout) {
    const windows = { single: 1, split: 2, quad: 4, nine: 9, custom: requirements.windows, independent: 1 }[value];
    setRequirements(current => ({ ...current, layout: value, windows }));
    setMessage("");
  }
  function payload() {
    return { version: 2, source: "wingman-video-wall-workflow", requirements, selectedId: selected.id,
      recommendation: { title: selected.title, rationale: selected.summary, products: selected.equipment.map(item => item.sku), equipment: selected.equipment },
      signalPath: selected.path, checks: selected.checks, evidence: selected.sources, evidenceCheckedAt: WALL_RESEARCH_DATE, updatedAt: new Date().toISOString() };
  }
  function save(destination?: string) {
    if (selected.blockers.length) return;
    try {
      const summary = payload();
      const saved = saveVideowallToProject({ wallType: lcd ? "lcd" : requirements.application, summary });
      window.localStorage.setItem(draftKey, JSON.stringify(summary));
      window.localStorage.setItem("wingman:video-wall-last-summary", JSON.stringify(summary));
      setMessage(`Design direction saved to ${saved.name}. Equipment quantities and checks are included.`);
      if (destination) navigate(destination);
    } catch { setMessage("The design could not be saved. Try again or copy the summary to keep your work."); }
  }
  async function copy() {
    const text = ["Wingman video wall design", wallApplications.find(a => a.value === requirements.application)?.title,
      `${requirements.columns} × ${requirements.rows} array; ${requirements.sources} sources; ${requirements.windows} windows; ${requirements.sourceResolution}`,
      selected.title, selected.summary, ...selected.equipment.map(e => `${e.quantity} × ${e.sku} — ${e.role}`),
      `Signal path: ${selected.path.join(" → ")}`, ...selected.blockers.map(b => `Not suitable: ${b}`),
      "Confirm before ordering:", ...selected.checks, ...selected.sources.map(s => `${s.label}: ${s.url}`)].join("\n");
    try { await navigator.clipboard.writeText(text); setMessage("Design summary copied."); }
    catch { setMessage("Clipboard access is unavailable. Select the design text and copy it manually."); }
  }
  return <main className="vw-builder" data-wingman-page="videowall">
    <header className="vw-builder-header"><div><p className="wm-ui-kicker">Video wall builder</p><h1>One wall. The right signal path.</h1><p>Compare WyreStorm switching, per-display distribution and multiview composition.</p></div><Link to={routeCatalogByKey.discovery.path}>Back to Opportunities</Link></header>
    <div className="vw-builder-applications" role="group" aria-label="Display application">
      {wallApplications.map(application => <button key={application.value} type="button" aria-pressed={requirements.application === application.value} onClick={() => update("application", application.value)}><strong>{application.title}</strong><span>{application.description}</span></button>)}
    </div>
    <div className="vw-builder-workspace">
      <section className="vw-builder-requirements" aria-labelledby="wall-requirements-title"><h2 id="wall-requirements-title">Your requirements</h2>
        <div className="vw-builder-fields">
          {lcd && <><label>Columns<input type="number" min={1} max={16} value={requirements.columns || ""} onChange={e => update("columns", Number(e.target.value))} /></label><label>Rows<input type="number" min={1} max={16} value={requirements.rows || ""} onChange={e => update("rows", Number(e.target.value))} /></label>
          <label>Panel orientation<select value={requirements.orientation} onChange={e => update("orientation", e.target.value as WallRequirements["orientation"])}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></label></>}
          <label>Available sources<input type="number" min={1} max={64} value={requirements.sources || ""} onChange={e => update("sources", Number(e.target.value))} /></label>
          <label>Source location<select value={requirements.sourceLocation} onChange={e => update("sourceLocation", e.target.value as WallRequirements["sourceLocation"])}><option value="local">Local rack</option><option value="distributed">Distributed / remote</option></select></label>
          <label>Source resolution<select value={requirements.sourceResolution} onChange={e => update("sourceResolution", e.target.value as WallRequirements["sourceResolution"])}><option value="1080p">1080p60</option><option value="4k30">4K30</option><option value="4k60">4K60</option></select></label>
          <label>AV network<select value={requirements.network} onChange={e => update("network", e.target.value as WallRequirements["network"])}><option value="any">Compare all options</option><option value="none">No AV network</option><option value="1g">1GbE design</option><option value="10g">10GbE design</option></select></label>
          <label>Content layout<select value={requirements.layout} onChange={e => layout(e.target.value as WallLayout)}><option value="single">Full canvas · one source</option><option value="split">Split screen · two sources</option><option value="quad">Quad view · four sources</option><option value="nine">Nine sources</option><option value="custom">Custom window placement</option>{requirements.application === "lcd-direct" && <option value="independent">Independent source per panel</option>}</select></label>
          {requirements.layout === "custom" && <label>Visible windows<input type="number" min={1} max={16} value={requirements.windows || ""} onChange={e => update("windows", Number(e.target.value))} /></label>}
        </div>
        {errors.length > 0 && <ul className="vw-builder-warning" role="alert">{errors.map(error => <li key={error}>{error}</li>)}</ul>}
        <VideowallPreview requirements={requirements} />
        <p className="vw-builder-note">{lcd ? "The panel count does not create more source pixels. Agree crop, letterbox or stretch behaviour for the complete wall aspect ratio." : "This is one composed HDMI output. The downstream processor or projector still determines the final display canvas."}</p>
      </section>
      <section className="vw-builder-options" aria-labelledby="wall-options-title"><header><h2 id="wall-options-title">Compare design directions</h2><p>{compatible.length} options match the captured limits · confirm the checks below before ordering.</p></header>
        <div className="vw-builder-option-list" role="group" aria-label="WyreStorm architecture options">{options.map(option => <button key={option.id} type="button" aria-pressed={selected.id === option.id} onClick={() => { setSelectedId(option.id); setMessage(""); }}><span><strong>{option.title}</strong><small>{option.summary}</small></span><em>{option.blockers.length ? "Needs changes" : "Option to validate"}</em></button>)}</div>
      </section>
    </div>
    <section className="vw-builder-detail" aria-labelledby="wall-selected-title"><header><div><p className="wm-ui-kicker">Selected direction</p><h2 id="wall-selected-title">{selected.title}</h2></div><span>{selected.blockers.length ? "Resolve requirements before saving" : "Design direction · not a final quotation"}</span></header>
      {selected.blockers.length > 0 && <div className="vw-builder-warning"><h3>What needs to change</h3><ul>{selected.blockers.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
      <ol className="vw-builder-path" aria-label="Signal path">{selected.path.map((step, i) => <li key={i}><span>{i + 1}</span>{step}</li>)}</ol>
      <div className="vw-builder-detail-columns"><div><h3>Equipment allowance</h3><div className="vw-builder-table-wrap"><table><thead><tr><th scope="col">Qty</th><th scope="col">Product</th><th scope="col">Purpose</th></tr></thead><tbody>{selected.equipment.map(item => <tr key={item.sku}><td>{item.quantity}</td><th scope="row">{item.sku}</th><td>{item.role}</td></tr>)}</tbody></table></div><p className="vw-builder-note">Allow separately for displays, network switches, power, cables, transport, mounting and control programming. V2 encoder/receiver ordering codes need local catalogue confirmation.</p></div>
      <div><h3>Confirm before ordering</h3><ul>{selected.checks.map(check => <li key={check}>{check}</li>)}</ul><p className="vw-builder-note">Manufacturer references checked {WALL_RESEARCH_DATE}.</p><div className="vw-builder-references">{selected.sources.map(item => <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.label} ↗</a>)}</div></div></div>
      <footer className="vw-builder-actions"><button type="button" disabled={selected.blockers.length > 0} onClick={() => save()}>Save to project</button><button type="button" disabled={selected.blockers.length > 0} onClick={() => save(routeCatalogByKey.proposal.path)}>Save and open proposal</button><button type="button" onClick={copy}>Copy summary</button><button type="button" onClick={() => { setRequirements({ ...defaultWallRequirements }); setSelectedId("mx-0404-scl"); setMessage(""); }}>Start again</button></footer>
      {message && <p role="status">{message}</p>}
    </section>
    <p className="vw-builder-note">For existing installations: MX-0808-SCL and NHD-250-RX are listed as discontinued. MX-1616-SCL is a larger switching/scaling option, but wall processing and multiview must be verified for the exact card configuration; they are not assumed here.</p>
  </main>;
}
export const VideoWallBuilderPage = VideoWallPage;
export const VideowallBuilderPage = VideoWallPage;
export const VideowallPage = VideoWallPage;
export const VideoWallWizardPage = VideoWallPage;
export const VideoWallBuilder = VideoWallPage;
export const VideoWall = VideoWallPage;
export default VideoWallPage;
