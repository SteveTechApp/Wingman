import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, AudioLines, Cable, Camera, Check, CircleHelp,
  Copy, Grid2X2, LayoutGrid, Monitor, Network, Presentation, Search,
  SlidersHorizontal, Usb, Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { ProductWorkspaceHeader, ProductWorkspaceNav } from "../components/ProductWorkspaceChrome";
import { loadWingmanProductSelectorDecisions, type ProductSelectorDecision } from "../lib/productSelectorEngine";
import { ProductAssuranceBadge } from "../components/ProductAssuranceBadge";
import { getProductAssurance } from "../lib/productAssurance";
import {
  finderConnectionLabels,
  rankProductFinderCandidates,
  type FinderConnection,
  type FinderNeed,
} from "./productFinder/productFinderRanking";
import { finderWorkflows, type FinderWorkflowOption } from "./productFinder/productFinderWorkflows";

const functions: Array<{ id: FinderNeed; label: string; detail: string; icon: typeof Cable }> = [
  { id: "extend", label: "Extend a signal", detail: "Carry AV or USB over a longer distance.", icon: Cable },
  { id: "duplicate", label: "Duplicate a source", detail: "Send one source to multiple displays.", icon: Copy },
  { id: "matrix", label: "Matrix switching", detail: "Route multiple sources to one or more outputs.", icon: Grid2X2 },
  { id: "network", label: "AV over IP", detail: "Distribute AV across an Ethernet network.", icon: Network },
  { id: "camera", label: "Camera systems", detail: "Connect PTZ, NDI or conferencing cameras.", icon: Camera },
  { id: "present", label: "Presentation / BYOD", detail: "Share laptops over HDMI, USB-C or wirelessly.", icon: Presentation },
  { id: "wall", label: "Video wall / multiview", detail: "Build layouts across several displays.", icon: LayoutGrid },
  { id: "sound", label: "Audio", detail: "Amplify, process or distribute room sound.", icon: AudioLines },
  { id: "usb", label: "USB / KVM", detail: "Extend or switch USB devices and peripherals.", icon: Usb },
  { id: "control", label: "Control", detail: "Operate AV equipment and room systems.", icon: SlidersHorizontal },
  { id: "not-sure", label: "I’m not sure yet", detail: "Start broad and review possible matches.", icon: CircleHelp },
];

const connectionOptions = Object.keys(finderConnectionLabels) as FinderConnection[];
const connectionIcons: Record<FinderConnection, typeof Cable> = {
  hdmi: Monitor,
  "usb-c": Cable,
  hdbaset: Cable,
  fibre: Cable,
  "usb-kvm": Usb,
  network: Network,
  dante: AudioLines,
  poe: Zap,
  control: SlidersHorizontal,
};

type FinderStage = "function" | "workflow" | "connections" | "results";

function workflowOptionIcon(optionId: string, fallback: typeof Cable): typeof Cable {
  if (/camera|ptz|track/i.test(optionId)) return Camera;
  if (/audio|dante|speaker|sound/i.test(optionId)) return AudioLines;
  if (/network|ip|gigabit|10-gig/i.test(optionId)) return Network;
  if (/usb|kvm/i.test(optionId)) return Usb;
  if (/wall|display|canvas|multiview|screen|led/i.test(optionId)) return LayoutGrid;
  if (/presentation|wireless|presenter|laptop/i.test(optionId)) return Presentation;
  if (/control|serial|ir-|relay/i.test(optionId)) return SlidersHorizontal;
  if (/matrix|route|capacity|output|input/i.test(optionId)) return Grid2X2;
  if (/duplicate|same|mirror|two|four|five/i.test(optionId)) return Copy;
  if (/extend|distance|fibre|fiber|long|short|medium/i.test(optionId)) return Cable;
  return fallback;
}

function WorkflowChoice({
  option,
  selected,
  fallbackIcon,
  onSelect,
}: {
  option: FinderWorkflowOption;
  selected: boolean;
  fallbackIcon: typeof Cable;
  onSelect: () => void;
}) {
  const Icon = workflowOptionIcon(option.id, fallbackIcon);
  return (
    <button type="button" aria-pressed={selected}
      className={`wm-product-finder-workflow-choice${selected ? " is-selected" : ""}`}
      onClick={onSelect}>
      <span className="wm-product-finder-workflow-graphic" aria-hidden="true">
        <svg viewBox="0 0 120 64" fill="none"><path d="M8 32h28M36 32 61 14M36 32l25 18M61 14h51M61 32h51M61 50h51" /><circle cx="8" cy="32" r="4" /><circle cx="61" cy="14" r="4" /><circle cx="61" cy="32" r="4" /><circle cx="61" cy="50" r="4" /></svg>
        <span><Icon size={28} strokeWidth={1.65} /></span>
      </span>
      <span className="wm-product-finder-workflow-copy"><strong>{option.label}</strong><small>{option.detail}</small></span>
      <span className="wm-product-finder-workflow-state" aria-hidden="true">{selected ? <Check size={16} /> : <ArrowRight size={15} />}</span>
    </button>
  );
}

function FunctionChoice({
  item,
  selected,
  onSelect,
}: {
  item: (typeof functions)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`wm-product-finder-function${selected ? " is-selected" : ""}`}
      onClick={onSelect}
    >
      <span className={`wm-product-finder-function-graphic is-${item.id}`} aria-hidden="true">
        <svg className="wm-product-finder-function-diagram" viewBox="0 0 120 64" fill="none">
          {item.id === "extend" ? <><path d="M10 32h100" /><circle cx="10" cy="32" r="5" /><circle cx="110" cy="32" r="5" /><path d="M25 22v20M95 22v20" /></> : null}
          {item.id === "duplicate" ? <><path d="M12 32h39M51 32 94 12M51 32h48M51 32 94 52" /><circle cx="12" cy="32" r="5" /><rect x="92" y="7" width="10" height="10" rx="2" /><rect x="94" y="27" width="10" height="10" rx="2" /><rect x="92" y="47" width="10" height="10" rx="2" /><circle cx="51" cy="32" r="4" /></> : null}
          {item.id === "matrix" ? <><path d="M13 12h94M13 32h94M13 52h94M13 12v40M44 12v40M76 12v40M107 12v40" /><circle cx="44" cy="32" r="4" /><circle cx="76" cy="32" r="4" /></> : null}
          {item.id === "network" ? <><path d="m18 44 24-25 34 6 27 22M42 19l13 28 21-22M18 44l58 3" /><circle cx="18" cy="44" r="5" /><circle cx="42" cy="19" r="5" /><circle cx="76" cy="25" r="5" /><circle cx="102" cy="47" r="5" /><circle cx="55" cy="47" r="5" /></> : null}
          {item.id === "camera" ? <><path d="M10 45h100M18 45V20h16M102 45V20H86M22 18c7-8 15-11 24-12M98 18C91 10 83 7 74 6" /><circle cx="18" cy="45" r="4" /><circle cx="102" cy="45" r="4" /></> : null}
          {item.id === "present" ? <><path d="M10 45h100M19 40V17h35v23M66 40V12h35v28M36 45v6M82 45v6M30 54h13M76 54h13" /><path d="m48 28 8 6 8-6" /></> : null}
          {item.id === "wall" ? <><rect x="12" y="12" width="30" height="18" rx="2" /><rect x="45" y="12" width="30" height="18" rx="2" /><rect x="78" y="12" width="30" height="18" rx="2" /><rect x="12" y="34" width="30" height="18" rx="2" /><rect x="45" y="34" width="30" height="18" rx="2" /><rect x="78" y="34" width="30" height="18" rx="2" /></> : null}
          {item.id === "sound" ? <><path d="M8 32h12l8-13v26l-8-13M40 24c6 4 6 12 0 16M50 17c12 8 12 22 0 30M63 11c17 11 17 31 0 42M78 17c12 8 12 22 0 30M91 24c6 4 6 12 0 16" /></> : null}
          {item.id === "usb" ? <><path d="M16 32h40M56 32V14M56 32v18M56 32h47" /><path d="m52 18 4-5 4 5M52 46l4 5 4-5" /><circle cx="16" cy="32" r="5" /><rect x="96" y="26" width="12" height="12" rx="3" /><circle cx="56" cy="32" r="4" /></> : null}
          {item.id === "control" ? <><path d="M14 16h92M14 32h92M14 48h92" /><circle cx="43" cy="16" r="5" /><circle cx="81" cy="32" r="5" /><circle cx="57" cy="48" r="5" /></> : null}
          {item.id === "not-sure" ? <><path d="M12 32h24M36 32 60 14M36 32l24 18M60 14h46M60 32h46M60 50h46" /><circle cx="12" cy="32" r="5" /><circle cx="60" cy="14" r="4" /><circle cx="60" cy="32" r="4" /><circle cx="60" cy="50" r="4" /></> : null}
        </svg>
        <span className="wm-product-finder-function-icon"><Icon size={30} strokeWidth={1.65} /></span>
      </span>
      <span className="wm-product-finder-function-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
      <span className="wm-product-finder-function-state" aria-hidden="true">{selected ? <Check size={16} /> : <ArrowRight size={15} />}</span>
    </button>
  );
}

function ConnectionGraphic({ connection }: { connection: FinderConnection }) {
  const Icon = connectionIcons[connection];
  return (
    <span className={`wm-product-finder-connection-graphic is-${connection}`} aria-hidden="true">
      <svg viewBox="0 0 48 40" fill="none">
        <path d="M4 20h40M12 10v20M36 10v20" />
        <circle cx="4" cy="20" r="2" />
        <circle cx="44" cy="20" r="2" />
      </svg>
      <Icon size={21} strokeWidth={1.7} />
    </span>
  );
}

export function ProductFinderPage() {
  const [need, setNeed] = useState<FinderNeed | null>(null);
  const [connections, setConnections] = useState<FinderConnection[]>([]);
  const [workflowAnswers, setWorkflowAnswers] = useState<Record<string, string>>({});
  const [workflowIndex, setWorkflowIndex] = useState(0);
  const [stage, setStage] = useState<FinderStage>("function");
  const [decisions, setDecisions] = useState<ProductSelectorDecision[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    loadWingmanProductSelectorDecisions({
      mode: "finder",
      includeAccessories: false,
      includeCables: false,
      includeDependencies: false,
      includeDiscontinued: false,
      includeBrowseOnly: false,
    }).then((results) => {
      if (!active) return;
      setDecisions(results);
      setLoadState("ready");
    }).catch(() => {
      if (active) setLoadState("error");
    });
    return () => { active = false; };
  }, []);

  const ranked = useMemo(() => need
    ? rankProductFinderCandidates(decisions, need, connections, workflowAnswers)
    : [], [connections, decisions, need, workflowAnswers]);
  const lead = ranked[0];
  const leadProduct = lead?.product as Record<string, unknown> | undefined;
  const LeadFunctionIcon = functions.find((item) => item.id === need)?.icon ?? CircleHelp;
  const needLabel = functions.find((item) => item.id === need)?.label ?? "Product function to confirm";
  const connectionLabels = connections.map((connection) => finderConnectionLabels[connection]);
  const workflowQuestions = need ? finderWorkflows[need] : [];
  const activeWorkflowQuestion = workflowQuestions[workflowIndex];
  const workflowSummary = workflowQuestions.flatMap((question) => {
    const answer = workflowAnswers[question.id];
    return question.options.filter((option) => option.id === answer).map((option) => option.label);
  });
  const strictWorkflowRequirements = workflowQuestions.flatMap((question) => {
    const answer = workflowAnswers[question.id];
    return question.options.filter((option) => option.id === answer && (option.requiredProductTerms?.length || option.capacity));
  }).map((option) => option.label);

  function startAgain() {
    setNeed(null);
    setConnections([]);
    setWorkflowAnswers({});
    setWorkflowIndex(0);
    setStage("function");
  }

  function chooseFunction(nextNeed: FinderNeed) {
    setNeed(nextNeed);
    setConnections([]);
    setWorkflowAnswers({});
    setWorkflowIndex(0);
  }

  function advanceWorkflow() {
    if (workflowIndex < workflowQuestions.length - 1) setWorkflowIndex((index) => index + 1);
    else setStage("connections");
  }

  return (
    <main className="wm-ui-page wingman-page-host wm-catalog-page" data-wingman-page="product-finder">
      <ProductWorkspaceHeader
        eyebrow="Products / Product Finder"
        title="Find one WyreStorm product"
        description="Start with the product function, answer a few tailored questions, then prioritize the connections the customer needs."
        actions={<Link className="wm-ui-button wm-ui-button-secondary" to={`${routeCatalogByKey.discovery.path}?expert=1`}>Open Expert view <ArrowRight size={16} /></Link>}
      />
      <ProductWorkspaceNav />

      <section className="wm-ui-card rounded-3xl border p-5 sm:p-7" aria-label="Product Finder wizard" data-testid="product-finder-wizard">
        {stage !== "results" ? <>
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] wm-ui-kicker">
            <span className={stage === "function" ? "text-cyan-300" : ""}>1 · Product function</span>
            <span aria-hidden="true">/</span>
            <span className={stage === "workflow" ? "text-cyan-300" : ""}>2 · Questions for this function</span>
            <span aria-hidden="true">/</span>
            <span className={stage === "connections" ? "text-cyan-300" : ""}>3 · Connection priorities</span>
          </div>
          {stage === "function" ? <>
            <h2 className="wm-ui-title text-2xl">What does the product need to do?</h2>
            <p className="wm-ui-copy mt-2">Choose the function the customer asked for. Wingman will ask a few questions specific to that product job.</p>
            <div className="wm-product-finder-function-grid mt-5">
              {functions.map((item) => <FunctionChoice key={item.id} item={item} selected={need === item.id} onSelect={() => chooseFunction(item.id)} />)}
            </div>
            <div className="mt-5 flex justify-end"><button className="wm-ui-button wm-ui-button-primary" type="button" disabled={!need} onClick={() => { setWorkflowIndex(0); setStage("workflow"); }}>Next: product questions <ArrowRight size={16} /></button></div>
          </> : stage === "workflow" && activeWorkflowQuestion ? <>
            <button type="button" className="wm-product-finder-change-function inline-flex items-center gap-2 text-sm wm-ui-copy hover:text-white" onClick={() => workflowIndex > 0 ? setWorkflowIndex((index) => index - 1) : setStage("function")}><ArrowLeft size={15} /> {workflowIndex > 0 ? "Previous question" : `Change function: ${needLabel}`}</button>
            <div className="wm-product-finder-workflow-progress">Question {workflowIndex + 1} of {workflowQuestions.length} · {needLabel}</div>
            <h2 className="wm-ui-title text-2xl wm-product-finder-connection-title">{activeWorkflowQuestion.prompt}</h2>
            <p className="wm-ui-copy wm-product-finder-connection-description">{activeWorkflowQuestion.help}</p>
            <div className="wm-product-finder-workflow-grid" aria-label={activeWorkflowQuestion.prompt}>
              {activeWorkflowQuestion.options.map((option) => <WorkflowChoice key={option.id} option={option} selected={workflowAnswers[activeWorkflowQuestion.id] === option.id} fallbackIcon={LeadFunctionIcon} onSelect={() => setWorkflowAnswers((current) => ({ ...current, [activeWorkflowQuestion.id]: option.id }))} />)}
            </div>
            <div className="mt-5 flex justify-end"><button className="wm-ui-button wm-ui-button-primary" type="button" onClick={advanceWorkflow}>{workflowIndex < workflowQuestions.length - 1 ? (workflowAnswers[activeWorkflowQuestion.id] ? "Next question" : "Skip for now") : (workflowAnswers[activeWorkflowQuestion.id] ? "Next: connections" : "Continue to connections")} <ArrowRight size={16} /></button></div>
          </> : <>
            <button type="button" className="wm-product-finder-change-function inline-flex items-center gap-2 text-sm wm-ui-copy hover:text-white" onClick={() => setStage("function")}><ArrowLeft size={15} /> Change function: {needLabel}</button>
            <h2 className="wm-ui-title text-2xl wm-product-finder-connection-title">Which connections or capabilities matter?</h2>
            <p className="wm-ui-copy wm-product-finder-connection-description">Choose any the customer specified. These prioritize the matches; leave them clear if they are still unknown.</p>
            <div className="wm-product-finder-connection-grid" aria-label="Prioritise product connections and capabilities">
              {connectionOptions.map((connection) => {
                const selected = connections.includes(connection);
                return <button key={connection} type="button" aria-pressed={selected}
                  className={`wm-product-finder-connection${selected ? " is-selected" : ""}`}
                  onClick={() => setConnections((current) => selected ? current.filter((item) => item !== connection) : [...current, connection])}>
                  <ConnectionGraphic connection={connection} />
                  <span className="wm-product-finder-connection-label">{finderConnectionLabels[connection]}</span>
                  <span className="wm-product-finder-connection-state" aria-hidden="true">{selected ? <Check size={16} /> : <ArrowRight size={14} />}</span>
                </button>;
              })}
            </div>
            <div className="mt-5 flex justify-between"><button className="wm-ui-button wm-ui-button-secondary" type="button" onClick={() => { setWorkflowIndex(Math.max(0, workflowQuestions.length - 1)); setStage("workflow"); }}><ArrowLeft size={16} /> Back to product questions</button><button className="wm-ui-button wm-ui-button-primary" type="button" onClick={() => setStage("results")}>Show product matches <Search size={16} /></button></div>
          </>}
        </> : <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="wm-ui-kicker">Product direction</p><h2 className="wm-ui-title mt-1 text-2xl">A place to start</h2><p className="wm-ui-copy mt-2">Function: {needLabel}{workflowSummary.length ? ` · ${workflowSummary.join(" · ")}` : " · Function details not specified"}{connectionLabels.length ? ` · Connections: ${connectionLabels.join(", ")}` : " · No connection priorities selected"}</p></div>
            <button type="button" className="wm-ui-button wm-ui-button-secondary" onClick={startAgain}>Start again</button>
          </div>
          {loadState === "loading" ? <p className="wm-ui-copy mt-6" role="status">Checking the WyreStorm range…</p> : loadState === "error" ? <div className="wm-ui-card mt-5 rounded-2xl border p-5" role="alert"><strong>Product information is unavailable.</strong><p className="wm-ui-copy mt-2">Try again in a moment or browse the catalogue.</p><Link className="wm-ui-button wm-ui-button-secondary mt-3" to={routeCatalogByKey.catalogBrowser.path}>Browse the catalogue</Link></div> : lead ? <>
            <article className="wm-ui-card mt-5 rounded-3xl border border-cyan-400/40 p-5 sm:p-7" data-testid="product-finder-lead">
              <div className="wm-product-finder-result-heading">
                <span className="wm-product-finder-result-art" aria-hidden="true"><span className={`wm-product-finder-result-icon is-${need}`}><LeadFunctionIcon size={30} strokeWidth={1.6} /></span><span className="wm-product-finder-result-path"><i /><i /><i /></span></span>
                <div><p className="wm-ui-kicker">Suggested WyreStorm product</p><h3 className="wm-ui-title mt-2 text-2xl">{String(leadProduct?.name || leadProduct?.title || lead.sku)}</h3><p className="mt-1 font-mono text-sm text-cyan-200">{lead.sku}</p></div>
              </div>
              <p className="wm-ui-copy mt-3">{String(leadProduct?.summary || leadProduct?.description || "Open the product card for more information.")}</p>
              <div className="mt-4"><strong className="text-sm">Why it came up</strong><ul className="mt-2 grid gap-1 text-sm wm-ui-copy">{(lead.finderReasons.length ? lead.finderReasons : ["This is an eligible product for the selected function. Confirm exact connections and fit before specifying it."]).map((reason) => <li key={reason}>{reason}</li>)}</ul></div>
              <div className="mt-4"><ProductAssuranceBadge sku={lead.sku} productAssurance={getProductAssurance(lead.sku)} compact /></div>
              <div className="wm-ui-card mt-4 rounded-2xl border p-4"><strong className="text-sm">Before you specify it</strong><p className="wm-ui-copy mt-1 text-sm">Confirm the connections, number of devices and cable distance with the customer or installer. This quick search is a product starting point, not a complete room design.</p></div>
              <div className="mt-5 flex flex-wrap gap-3"><Link className="wm-ui-button wm-ui-button-primary" to={`${routeCatalogByKey.productCallCards.path}/${encodeURIComponent(lead.sku)}`}>Open product details <ArrowRight size={16} /></Link><Link className="wm-ui-button wm-ui-button-secondary" to={`${routeCatalogByKey.discovery.path}?expert=1`}>Continue in Expert view</Link></div>
            </article>
            {ranked.length > 1 ? <details className="wm-ui-card mt-4 rounded-2xl border p-4"><summary className="cursor-pointer font-bold">See other possible matches</summary><ul className="mt-3 grid gap-2">{ranked.slice(1).map((candidate) => <li key={candidate.sku} className="wm-product-finder-alternative"><span className="wm-product-finder-alternative-art" aria-hidden="true"><LeadFunctionIcon size={18} /></span><span className="wm-product-finder-alternative-name"><strong>{String(candidate.product.name || candidate.product.title || candidate.sku)}</strong><small className="ml-2 font-mono wm-ui-copy">{candidate.sku}</small></span><Link to={`${routeCatalogByKey.productCallCards.path}/${encodeURIComponent(candidate.sku)}`} className="text-sm text-cyan-200">Product details <ArrowRight size={13} className="inline" /></Link></li>)}</ul></details> : null}
          </> : <div className="wm-ui-card mt-5 rounded-2xl border p-5"><strong>{strictWorkflowRequirements.length ? "No product record confirms the selected requirements." : "No eligible product surfaced for these answers."}</strong><p className="wm-ui-copy mt-2">{strictWorkflowRequirements.length ? `No eligible WyreStorm product record confirms: ${strictWorkflowRequirements.join("; ")}. A related feature or product name is not enough to call it a fit. Review the answers or browse the catalogue.` : "Try another function or clear some connection priorities to broaden the matches."}</p>{strictWorkflowRequirements.length ? <button type="button" className="wm-ui-button wm-ui-button-secondary mt-3 mr-2" onClick={() => { setWorkflowIndex(0); setStage("workflow"); }}>Review product questions</button> : null}<Link className="wm-ui-button wm-ui-button-secondary mt-3" to={routeCatalogByKey.catalogBrowser.path}>Browse the catalogue</Link></div>}
        </>}
      </section>
    </main>
  );
}
