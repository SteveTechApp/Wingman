import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { routeCatalogByKey } from "../app/routeCatalog";
import { getCurrentWorkflowProject, saveVideowallToProject } from "../features/projects";
import { VideowallExpertReview } from "./videowall/VideowallExpertReview";
import { wallTransportPlan, withMeasuredRuns } from "../lib/videowallTransport";
import { wallDesignEvidence } from "../lib/videowallEvidence";
import { wallSurveyDisplayCount, wallSurveyGapText, wallSurveyGaps } from "../lib/wallSurvey";
import {
  assessVideowallOptions,
  defaultWallRequirements,
  FLOATING_WINDOW_LIMIT,
  wallApplications,
  wallCanvasPlan,
  wallResolutionBudget,
  type WallOption,
  type WallRequirements,
} from "../lib/videowallOptions";
import {
  decideVideowall,
  wallFitReasons,
  type WallLayoutChoice,
  type WallStartPreset,
} from "../lib/videowallDecision";
import { wallStartingPointOrigin, type WallStartingPointOrigin } from "../lib/wallStartingPointOrigin";
import { clearVideoWallHandoff, readVideoWallHandoff } from "../lib/videowallHandoff";
import { wallWizardConcernChecks, type WallReviewStageKey } from "../lib/videowallWizard";
import { useUiMode } from "../data/uiMode";
import { restoreVideowallDraft, VIDEO_WALL_DRAFT_KEY } from "../lib/videowallDraft";
import { useVideowallDraftAutosave } from "./videowall/useVideowallDraftAutosave";
import { WallDraftStatusNote } from "./videowall/WallDraftStatusNote";
import { VideowallWizard } from "./videowall/VideowallWizard";
import { wallSurveyReviewAuditNote } from "../lib/wallSurveyReview";
import { wallPickFromSearch, wallPickedOption } from "../lib/wallPick";
import { readWallReviewPass, rememberWallReviewPass, wallReviewPassFromSearch } from "../lib/wallReviewPass";
import { WALL_SHARE_COPY_FAILED, wallShareClipboard, wallShareNote, wallShareSearch, wallSharedLinkNote } from "../lib/wallShareLink";
import { wallLinkFromSearch } from "../lib/wallLink";
import "../styles/wingman-videowall.css";

export function VideoWallPage() {
  const [searchParams] = useSearchParams();
  const [handoff] = useState(() => readVideoWallHandoff());
  // A wall in the address is the sender's design, so it is restored instead of
  // this browser's draft; a handoff still outranks it. The address this builder
  // writes on every edit names the rep's own wall, and the restore keeps the
  // saved design in that case, survey cells included.
  const [sharedWall] = useState(() => wallLinkFromSearch(searchParams));
  const [draft] = useState(() => restoreVideowallDraft(handoff, sharedWall));
  const [requirements, setRequirements] = useState(draft.requirements);
  // A link's design outranks the draft's selection: the sender chose this
  // architecture, so the recipient reads the design they were sent.
  const [overrideId, setOverrideId] = useState(
    () => wallPickedOption(assessVideowallOptions(draft.requirements), wallPickFromSearch(searchParams))?.id
      ?? draft.selectedId,
  );
  const [message, setMessage] = useState("");
  // The card the answers started on, so the picker can mark it and the design
  // panel can measure how far this room has moved from it. A card pick writes
  // it, and the saved wall hands it back on a reopen; a handoff, a shared link
  // and Start again leave the design with none.
  const [startingPoint, setStartingPoint] = useState<WallStartingPointOrigin | null>(draft.startingPoint ?? null);
  const [concerns, setConcerns] = useState<string[]>([]);
  // A paper sheet's trail note waits here until the design saves: the project
  // records runs it now holds, so a sheet imported into a wall nobody saved
  // leaves nothing claiming them.
  const [sheetNotes, setSheetNotes] = useState<string[]>([]);
  // The wall arrived in the address rather than from this browser's draft — a
  // link that names a wall this browser has not stored.
  const [shared, setShared] = useState(() => draft.fromLink === true);
  const { isGuided, setMode } = useUiMode();
  const navigate = useNavigate();
  const location = useLocation();
  // The pass the rep is reading is view state: a link's own pass outranks the
  // one this browser last remembered, so forwarding the page forwards the pass.
  const [pass, setPass] = useState<WallReviewStageKey>(
    () => wallReviewPassFromSearch(searchParams) ?? readWallReviewPass(),
  );
  const concernChecks = wallWizardConcernChecks(concerns);
  const linkedPass = wallReviewPassFromSearch(searchParams);
  const openedLinkedPass = useRef(false);

  useEffect(() => {
    if (handoff) clearVideoWallHandoff();
  }, [handoff]);

  // A link naming a pass opens the rail once, even where this device last chose
  // the focused view; the switch is one-shot, so the rep can go back to it.
  useEffect(() => {
    if (openedLinkedPass.current || !linkedPass) return;
    openedLinkedPass.current = true;
    if (isGuided) setMode("unguided");
  }, [linkedPass, isGuided, setMode]);

  const options = assessVideowallOptions(requirements);
  const decision = decideVideowall(requirements);
  const recommended = decision.recommended?.option ?? null;
  const override = wallPickedOption(options, overrideId);
  const selected = override ?? recommended;
  const lcd = requirements.application.startsWith("lcd");
  const panels = requirements.columns * requirements.rows;
  const resolutionBudget = wallResolutionBudget(requirements);
  const canvasPlan = wallCanvasPlan(requirements);
  const transport = wallTransportPlan(requirements);
  // A survey that leaves the display housing, run entry or termination blank is
  // flagged at the point of handoff rather than discovered by the installer.
  const surveyGaps = wallSurveyGaps(transport, requirements.linkDetails);
  const surveyWarning = surveyGaps.length ? wallSurveyGapText(surveyGaps, wallSurveyDisplayCount(transport)) : null;
  // The address names the wall, the pass and the chosen design as the rep works,
  // so Copy link, a reload and a pasted address all open this reading.
  const pickedId = override?.id ?? null;
  useEffect(() => {
    const next = wallShareSearch(location.search, requirements, pass, pickedId).toString();
    if (next === location.search.replace(/^\?/, "")) return;
    navigate({ search: `?${next}` }, { replace: true });
  }, [location.search, requirements, pass, pickedId, navigate]);

  // The design is kept on every edit rather than only on Save, so a reload
  // reopens the wall nobody saved yet; the hook skips the restored first pass.
  const draftSavedAt = useVideowallDraftAutosave(requirements, selected?.id ?? "", startingPoint);

  function update(patch: Partial<WallRequirements>) {
    setRequirements((current) => ({ ...current, ...patch }));
    setOverrideId("");
    setMessage("");
  }

  function measure(ids: string[], metres: number | null) {
    update({ measuredRuns: withMeasuredRuns(requirements.measuredRuns, ids, metres) });
  }

  function applyMeasuredRuns(measuredRuns: Record<string, number>) {
    update({ measuredRuns });
  }

  function chooseLayout(choice: WallLayoutChoice) {
    const windows = choice.value === "custom" && choice.customMode === "floating"
      ? Math.min(choice.windows, FLOATING_WINDOW_LIMIT)
      : choice.windows;
    const next: Partial<WallRequirements> = {
      layout: choice.value,
      windows,
      ...(choice.customMode ? { customMode: choice.customMode } : {}),
    };
    if (choice.value === "independent") next.sources = Math.max(requirements.sources, panels);
    else next.sources = Math.max(requirements.sources, windows);
    update(next);
  }

  function choosePanels(columns: number, rows: number) {
    const count = columns * rows;
    update({
      columns,
      rows,
      sources: requirements.layout === "independent" ? Math.max(requirements.sources, count) : requirements.sources,
    });
  }

  function payload(option: WallOption) {
    return wallDesignEvidence({
      requirements,
      option,
      decision,
      transport,
      checks: concernChecks,
      origin: handoff?.label ?? null,
      // The saved wall records the card it came from, so the project and the
      // proposal can say where the design started after this page is gone.
      startingPoint,
    });
  }

  function save(destination?: string) {
    if (!selected || selected.blockers.length || (surveyWarning && !requirements.surveyDraftOverride)) return;
    try {
      const summary = payload(selected);
      // A design that arrived from a room template records that template on the
      // saved wall, so the template's export quotes this wall as a fact.
      const saved = saveVideowallToProject({
        wallType: lcd ? "lcd" : requirements.application,
        summary,
        ...(handoff?.templateId ? { templateId: handoff.templateId } : {}),
        // The design carries the review itself; the project's trail names it too,
        // so the decision is visible where every other save is recorded.
        ...(requirements.surveyReview ? { reviewNote: wallSurveyReviewAuditNote(requirements.surveyReview) } : {}),
        // Paper sheets that landed since the last save become events on the wall.
        ...(sheetNotes.length ? { sheetNotes } : {}),
      });
      setSheetNotes([]);
      window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify(summary));
      window.localStorage.setItem("wingman:video-wall-last-summary", JSON.stringify(summary));
      setMessage(`Design direction saved to ${saved.name}. Equipment quantities and checks are included.`);
      if (destination) navigate(destination);
    } catch {
      setMessage("The design could not be saved. Try again or copy the summary to keep your work.");
    }
  }

  async function copy() {
    if (!selected) return;
    const reasons = decision.recommended?.option.id === selected.id
      ? decision.recommended.reasons
      : wallFitReasons(selected, requirements);
    const text = [
      "Wingman video wall design",
      wallApplications.find((application) => application.value === requirements.application)?.title,
      `${requirements.columns} × ${requirements.rows} array; ${requirements.sources} sources; ${requirements.windows} window${requirements.windows === 1 ? "" : "s"}`,
      selected.title,
      selected.summary,
      `Resolution budget: ${resolutionBudget.text}`,
      `Recommended canvas fit: ${canvasPlan.rationale}`,
      `Transport estimate: ${transport.headline}`,
      ...transport.flags.map((flag) => `Transport: ${flag}`),
      ...(surveyWarning ? [surveyWarning] : []),
      "Why this meets the need:",
      ...reasons,
      ...selected.equipment.map((item) => `${item.quantity} × ${item.sku} — ${item.role}`),
      `Signal path: ${selected.path.join(" → ")}`,
      ...selected.blockers.map((blocker) => `Not suitable: ${blocker}`),
      "Confirm before ordering:",
      ...selected.checks,
      ...concernChecks,
      ...selected.sources.map((item) => `${item.label}: ${item.url}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Design summary copied.");
    } catch {
      setMessage("Clipboard access is unavailable. Select the design text and copy it manually.");
    }
  }

  /** Copy the wall, the pass and the chosen design as an address, and say what travelled. */
  async function copyLink() {
    try {
      const search = wallShareSearch(location.search, requirements, pass, override?.id ?? null);
      // An absolute address: the paste target is usually chat or email.
      const address = new URL(`${location.pathname}?${search.toString()}`, window.location.origin).href;
      // The clipboard gets the sentence as well as the address, so a paste into
      // chat names whose wall it is and which panel it opens.
      await navigator.clipboard.writeText(wallShareClipboard({
        project: getCurrentWorkflowProject()?.name ?? null,
        requirements,
        pass,
        address,
      }));
      setMessage(wallShareNote(requirements, pass, override?.title ?? null));
    } catch {
      setMessage(WALL_SHARE_COPY_FAILED);
    }
  }

  /** Moving between review passes remembers the reading and names it in the address. */
  function choosePass(stage: WallReviewStageKey) {
    setPass(stage);
    rememberWallReviewPass(stage);
    setMessage("");
  }

  function pickPreset(preset: WallStartPreset) {
    setRequirements(preset.requirements);
    setStartingPoint(wallStartingPointOrigin(preset));
    setOverrideId("");
    setMessage("");
    // A card is a fresh wall: the previous room's notes and the link it arrived
    // on describe a design that is no longer on screen.
    setSheetNotes([]);
    setShared(false);
  }

  function restart() {
    setRequirements({ ...defaultWallRequirements });
    // No card: a wall answered from scratch is its own starting point.
    setStartingPoint(null);
    setOverrideId("");
    setMessage("");
    setSheetNotes([]);
    setShared(false);
  }

  // The wall arrived in the address rather than from this browser's draft, so
  // the rep reading it knows whose answers these are. It is a note, not a live
  // region: the copy confirmation owns the status role. The draft line sits with
  // it because both answer "which copy of this wall am I looking at?".
  const sharedWallNote = shared && !handoff ? (
    <p className="vw-builder-note" data-testid="videowall-shared-wall">
      {wallSharedLinkNote(requirements)}
    </p>
  ) : null;

  if (isGuided) {
    return (
      <>
        {sharedWallNote}
        <WallDraftStatusNote draftSavedAt={draftSavedAt} />
        <VideowallWizard
          requirements={requirements}
          decision={decision}
          selected={selected}
          message={message}
          handoffLabel={handoff?.label ?? null}
          startAtResult={Boolean(handoff) || Boolean(sharedWall)}
          concerns={concerns}
          onConcerns={setConcerns}
          onChange={update}
          onReplace={(next) => { setRequirements(next); setOverrideId(""); setMessage(""); }}
          onChooseLayout={chooseLayout}
          onChoosePanels={choosePanels}
          onSave={() => save()}
          onSaveProposal={() => save(routeCatalogByKey.proposal.path)}
          onCopy={copy}
          onCopyLink={copyLink}
          onRestart={restart}
          onUnblock={(next) => { setRequirements(next); setOverrideId(""); setMessage("Requirement changed to open the catalogue."); }}
          onUse={() => { setOverrideId(""); setMessage("Showing Wingman's recommendation."); }}
          onApply={(id) => { setOverrideId(id); setMessage(""); }}
          onOpenExpert={() => setMode("unguided")}
        />
      </>
    );
  }

  return (
    <main className="vw-builder" data-wingman-page="videowall">
      <header className="vw-builder-header">
        <div>
          <p className="wm-ui-kicker">Video wall builder</p>
          <h1>One wall. The right signal path.</h1>
          <p>Answer four questions. Wingman narrows every WyreStorm wall design to one recommendation and says why the rest do not fit.</p>
        </div>
        <div className="vw-builder-header-actions">
          <button type="button" data-testid="videowall-open-wizard" onClick={() => setMode("guided")}>Guided wizard</button>
          <Link to={routeCatalogByKey.discovery.path}>Back to Opportunities</Link>
        </div>
      </header>

      {handoff ? (
        <p className="vw-builder-note" role="status">
          Started from {handoff.label}. The answers below are taken from that work — adjust anything that differs.
        </p>
      ) : null}
      {sharedWallNote}
      <WallDraftStatusNote draftSavedAt={draftSavedAt} />

      <VideowallExpertReview
        requirements={requirements}
        decision={decision}
        selected={selected}
        options={options}
        recommendedId={recommended?.id ?? null}
        startingPoint={startingPoint}
        reviewStage={pass}
        onReviewStage={choosePass}
        onCopyLink={copyLink}
        onPickPreset={pickPreset}
        onUpdate={update}
        onChoosePanels={choosePanels}
        onChooseLayout={chooseLayout}
        onMeasure={measure}
        onApplyMeasuredRuns={applyMeasuredRuns}
        onSheetImported={(note) => setSheetNotes((notes) => [...notes, note])}
        onUse={() => { setOverrideId(""); setMessage("Showing Wingman's recommendation."); }}
        onUnblock={(next) => { setRequirements(next); setOverrideId(""); setMessage("Requirement changed to open the catalogue."); }}
        onApply={(id) => { setOverrideId(id); setMessage(""); }}
        onSelect={(id) => { setOverrideId(id === recommended?.id ? "" : id); setMessage(""); }}
      />

      {surveyWarning ? <label><input type="checkbox" checked={Boolean(requirements.surveyDraftOverride)} onChange={(event) => update({ surveyDraftOverride: event.target.checked })} />Save as a pre-survey draft: installation details remain unconfirmed.</label> : null}
      {surveyWarning ? (
        <p className="vw-builder-warning" role="alert" data-testid="videowall-survey-gaps">
          {surveyWarning} Record the missing cells in the transport table before this design is handed off.
        </p>
      ) : null}

      <footer className="vw-builder-actions">
        <button type="button" disabled={!selected || selected.blockers.length > 0 || Boolean(surveyWarning && !requirements.surveyDraftOverride)} onClick={() => save()}>Save to project</button>
        <button type="button" disabled={!selected || selected.blockers.length > 0 || Boolean(surveyWarning && !requirements.surveyDraftOverride)} onClick={() => save(routeCatalogByKey.proposal.path)}>Save and open proposal</button>
        <button type="button" disabled={!selected} onClick={copy}>Copy summary</button>
        <button type="button" onClick={copyLink}>Copy link</button>
        <button type="button" onClick={restart}>Start again</button>
      </footer>
      {message ? <p role="status">{message}</p> : null}

      <p className="vw-builder-note">
        For existing installations: MX-0808-SCL and NHD-250-RX are listed as discontinued. MX-1616-SCL is a larger
        switching/scaling option, but wall processing and multiview must be verified for the exact card configuration;
        they are not assumed here.
      </p>
    </main>
  );
}

export const VideoWallBuilderPage = VideoWallPage;
export const VideowallBuilderPage = VideoWallPage;
export const VideowallPage = VideoWallPage;
export const VideoWallWizardPage = VideoWallPage;
export const VideoWallBuilder = VideoWallPage;
export const VideoWall = VideoWallPage;
export default VideoWallPage;
