import { useState } from "react";
import { Link } from "react-router-dom";
import { routeCatalogByKey } from "../../app/routeCatalog";
import { VideowallVisual } from "./VideowallVisual";
import { VideowallTransport } from "./VideowallTransport";
import { wallTransportPlan, withMeasuredRuns } from "../../lib/videowallTransport";
import { wallSurveyDisplayCount, wallSurveyGapText, wallSurveyGaps } from "../../lib/wallSurvey";
import { wallDecisionSummary, type WallDecision, type WallLayoutChoice } from "../../lib/videowallDecision";
import { wallApplications, type WallOption, type WallRequirements } from "../../lib/videowallOptions";
import {
  videowallNetworkChoices,
  videowallNetworkKeyFor,
  videowallPanelPresets,
  videowallSourcePresets,
} from "../../lib/videowallDraft";
import {
  formatMillimetres,
  panelDiagonalPresets,
  pixelPitchPresets,
  wallPhysicalSize,
} from "../../lib/wallPhysicalSize";
import {
  wallWizardAnswers,
  wallWizardApplicationPatch,
  wallWizardConcernChecks,
  wallWizardConcerns,
  wallWizardLayoutChoices,
  wallWizardLayoutChoiceIsDisabled,
  wallWizardLayoutIsMultiview,
  wallWizardSteps,
} from "../../lib/videowallWizard";
import { VideowallVerdict } from "./VideowallVerdict";
import { wallVariantLabel } from "../../lib/wallVariants";
import { VideowallOptionsList } from "./VideowallOptionsList";
import { VideowallResultPages } from "./VideowallResultPages";
import { VideowallFeedStep } from "./VideowallFeedStep";

const RESULT = wallWizardSteps.length;
/** Steps are addressed by name so inserting a question renumbers nothing by hand. */
const STEP = Object.fromEntries(wallWizardSteps.map((item, index) => [item.key, index])) as Record<string, number>;

const STEP_HEADINGS: Record<string, { title: string; hint: string }> = {
  picture: { title: "What kind of wall?", hint: "The type decides the questions after it: a projection screen has projectors, an LED canvas has a pitch, and only an LCD wall can be fed a panel at a time." },
  size: { title: "How big is the wall?", hint: "The array, the panel pixels and the pitch set the size of the box." },
  sources: { title: "How many sources?", hint: "Choose how many sources the wall needs to show and the highest timing they use." },
  network: { title: "What network will carry the picture?", hint: "Choose the existing network to use, or include new switches in the design." },
  feeding: { title: "How is the wall fed?", hint: "One canvas the wall scales, or a feed per panel — then the box that produces that canvas." },
  layout: { title: "How should the sources appear?", hint: "Windows composed in one design — the multiview — or a source per screen, which is a different design." },
  visual: { title: "The wall you have described", hint: "Drawn at the size and mounting height the answers set, with the sources mapped onto it." },
  detail: { title: "What must the design handle?", hint: "These answers do not change the recommendation, but each one becomes a check in the saved design." },
};

export function VideowallWizard({
  requirements,
  decision,
  selected,
  options,
  variantId,
  message,
  handoffNote,
  startAtResult,
  concerns,
  onConcerns,
  onChange,
  onChooseLayout,
  onChoosePanels,
  onSave,
  onSaveProposal,
  onCopy,
  onCopyLink,
  onRestart,
  onUnblock,
  onUse,
  onApply,
  onSelect,
  onVariant,
  onOpenExpert,
}: {
  requirements: WallRequirements;
  decision: WallDecision;
  selected: WallOption | null;
  /** Every design tested, so the result can show the whole field. */
  options: WallOption[];
  /** The build of the selected design; `""` is the catalogue build. */
  variantId: string;
  message: string;
  handoffNote: string | null;
  startAtResult: boolean;
  concerns: string[];
  onConcerns: (keys: string[]) => void;
  onChange: (patch: Partial<WallRequirements>) => void;
  onChooseLayout: (choice: WallLayoutChoice) => void;
  onChoosePanels: (columns: number, rows: number) => void;
  onSave: (destination?: string) => void;
  onSaveProposal: () => void;
  onCopy: () => void;
  /** Copies the design and pass as an address; omitted where the page cannot wire it. */
  onCopyLink?: () => void;
  onRestart: () => void;
  onUnblock: (next: WallRequirements) => void;
  onUse: () => void;
  onApply: (id: string) => void;
  onSelect: (id: string) => void;
  onVariant: (variantId: string) => void;
  onOpenExpert: () => void;
}) {
  const [step, setStep] = useState(() => (startAtResult ? RESULT : 0));
  // Editing one answer from the result returns to the result, not the next question.
  const [editing, setEditing] = useState(false);
  const answers = wallWizardAnswers(requirements);
  const checks = wallWizardConcernChecks(concerns);
  const transport = wallTransportPlan(requirements);
  const surveyGaps = wallSurveyGaps(transport, requirements.linkDetails);
  const surveyWarning = surveyGaps.length ? wallSurveyGapText(surveyGaps, wallSurveyDisplayCount(transport)) : null;
  const lcd = requirements.application.startsWith("lcd");
  const layouts = wallWizardLayoutChoices(requirements.application);
  const atResult = step >= RESULT;
  /** The design the engine answers with — the one action a result with nothing picked can take. */
  const recommendedId = decision.recommended?.option.id ?? null;
  const stepKey = wallWizardSteps[step]?.key ?? "picture";

  function next() {
    if (editing) {
      setEditing(false);
      setStep(RESULT);
      return;
    }
    setStep((current) => Math.min(current + 1, RESULT));
  }

  function back(from: number) {
    setStep(editing ? RESULT : from);
    if (editing) setEditing(false);
  }

  function edit(index: number) {
    setEditing(true);
    setStep(index);
  }

  function measure(ids: string[], metres: number | null) {
    onChange({ measuredRuns: withMeasuredRuns(requirements.measuredRuns, ids, metres) });
  }

  function applyMeasuredRuns(measuredRuns: Record<string, number>) {
    onChange({ measuredRuns });
  }

  function toggleConcern(key: string) {
    const concern = wallWizardConcerns.find((item) => item.key === key);
    if (!concern) return;
    const active = concerns.includes(key);
    onConcerns(active ? concerns.filter((item) => item !== key) : [...concerns, key]);
    if (active && concern.clear) onChange(concern.clear);
    if (!active && concern.patch) onChange(concern.patch);
  }

  function restart() {
    onConcerns([]);
    onRestart();
    setEditing(false);
    setStep(0);
  }

  const heading = atResult
    ? { title: "Your video wall design", hint: wallDecisionSummary(decision) }
    : STEP_HEADINGS[stepKey];

  return (
    <main className="vw-builder vw-wizard" data-wingman-page="videowall" data-testid="videowall-wizard">
      <header className="vw-builder-header">
        <div>
          <p className="wm-ui-kicker">{atResult ? "Guided result" : "Guided video wall wizard"}</p>
          <h1>{heading.title}</h1>
          <p>{heading.hint}</p>
        </div>
        <div className="vw-builder-header-actions">
          <button type="button" data-testid="videowall-wizard-expert" onClick={onOpenExpert}>Expert view</button>
          <Link to={routeCatalogByKey.discovery.path}>Back to Opportunities</Link>
        </div>
      </header>

      {!atResult ? (
        <ol className="vw-wizard-progress" aria-label="Wizard progress">
          {wallWizardSteps.map((item, index) => (
            <li
              key={item.key}
              data-state={atResult || index < step ? "done" : index === step ? "current" : "todo"}
              aria-current={!atResult && index === step ? "step" : undefined}
            >
              <button
                type="button"
                aria-label={`Go back to ${item.label}`}
                data-testid={`videowall-wizard-progress-${item.key}`}
                disabled={index >= step}
                onClick={() => {
                  setEditing(false);
                  setStep(index);
                }}
              >
                <span>{index + 1}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      {step === STEP.picture ? (
        <section className="vw-wizard-card" data-testid="videowall-wizard-step-picture" aria-label="What is going on the wall?">
          <div className="vw-wizard-options vw-wizard-wall-types" role="group" aria-label="Display application">
            {wallApplications.map((application) => (
              <button
                key={application.value}
                type="button"
                aria-pressed={requirements.application === application.value}
                onClick={() => { onChange(wallWizardApplicationPatch(application.value, requirements)); next(); }}
              >
                <strong>{application.title}</strong>
                <span>{application.description}</span>
              </button>
            ))}
          </div>
          <WizardBack onBack={() => back(0)} />
        </section>
      ) : null}

      {step === STEP.size ? (
        <section className="vw-wizard-card" data-testid="videowall-wizard-step-size" aria-label="How big is the wall?">
          {requirements.application === "led" ? (
            <div className="vw-wizard-fieldset" role="group" aria-label="LED canvas pixels">
              <p className="vw-wizard-label">LED canvas</p>
              <div className="vw-builder-resolution-inputs">
                <label>Canvas width<input type="number" min={1} max={16384} value={requirements.ledCanvasWidth || ""} onChange={(event) => onChange({ ledCanvasWidth: Number(event.target.value) })} /></label>
                <label>Canvas height<input type="number" min={1} max={16384} value={requirements.ledCanvasHeight || ""} onChange={(event) => onChange({ ledCanvasHeight: Number(event.target.value) })} /></label>
              </div>
              <p className="vw-wizard-label">Pixel pitch</p>
              <div className="vw-wizard-chips">
                {pixelPitchPresets.map((pitch) => {
                  const physical = wallPhysicalSize({ ...requirements, pixelPitchMm: pitch });
                  return (
                    <button
                      key={pitch}
                      type="button"
                      aria-pressed={requirements.pixelPitchMm === pitch}
                      onClick={() => onChange({ pixelPitchMm: pitch })}
                    >
                      <strong>{pitch} mm</strong>
                      <span>{formatMillimetres(physical.wall.width)} mm wide</span>
                    </button>
                  );
                })}
              </div>
              <p className="vw-wizard-label">Cabinet array</p>
              <div className="vw-builder-resolution-inputs">
                <label>Columns<input type="number" min={1} max={100} value={requirements.columns} onChange={(event) => onChange({ columns: Number(event.target.value) })} /></label>
                <label>Rows<input type="number" min={1} max={100} value={requirements.rows} onChange={(event) => onChange({ rows: Number(event.target.value) })} /></label>
              </div>
            </div>
          ) : (
            <>
              {lcd ? (
                <>
                  <div className="vw-wizard-fieldset" role="group" aria-label="Panel array">
                    <p className="vw-wizard-label">Panel array</p>
                    <div className="vw-wizard-chips">
                      {videowallPanelPresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          aria-pressed={requirements.columns === preset.columns && requirements.rows === preset.rows}
                          onClick={() => onChoosePanels(preset.columns, preset.rows)}
                        >
                          <strong>{preset.label}</strong>
                          <span>{preset.columns * preset.rows} panels</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="vw-wizard-fieldset" role="group" aria-label="Panel orientation">
                    <p className="vw-wizard-label">Panel orientation</p>
                    <div className="vw-wizard-chips">
                      {(["landscape", "portrait"] as const).map((orientation) => (
                        <button
                          key={orientation}
                          type="button"
                          aria-pressed={requirements.orientation === orientation}
                          onClick={() => onChange({ orientation })}
                        >
                          <strong>{orientation === "portrait" ? "Portrait" : "Landscape"}</strong>
                          <span>panels</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="vw-wizard-hint">One projector fills the wall. Source count and timing are below.</p>
              )}
              <div className="vw-wizard-fieldset" role="group" aria-label="Panel size">
                <p className="vw-wizard-label">{requirements.application === "projection" ? "Screen size" : "Panel size"}</p>
                <div className="vw-wizard-chips">
                  {panelDiagonalPresets.map((inches) => {
                    const physical = wallPhysicalSize({ ...requirements, panelDiagonalInches: inches });
                    return (
                      <button
                        key={inches}
                        type="button"
                        aria-pressed={requirements.panelDiagonalInches === inches}
                        onClick={() => onChange({ panelDiagonalInches: inches })}
                      >
                        <strong>{inches} in</strong>
                        <span>{formatMillimetres(physical.wall.width)} mm wide</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="vw-wizard-fieldset" role="group" aria-label="Panel resolution">
                <p className="vw-wizard-label">{requirements.application === "projection" ? "Projector resolution" : "Panel resolution"}</p>
                <div className="vw-wizard-chips">
                  {(["1080p", "4k"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={!requirements.displayCustom && requirements.displayResolution === value}
                      onClick={() => onChange({ displayResolution: value, displayCustom: false })}
                    >
                      <strong>{value === "4k" ? "4K" : "1080p"}</strong>
                      <span>{requirements.application === "projection" ? "projector" : "panels"}</span>
                    </button>
                  ))}
                </div>
                <p className="vw-wizard-hint">Exact pixel sizes are in Expert view.</p>
              </div>
            </>
          )}
          {/* The drawing and the wiring are readings of the answers rather than
              questions, so the size screen stops at the box: each is drawn on a
              screen of its own instead of stacking under these controls. */}
          <div className="vw-wizard-nav">
            <button type="button" className="vw-wizard-secondary" onClick={() => back(STEP.picture)}>Back</button>
            <button type="button" className="vw-wizard-primary" data-testid="videowall-wizard-size-next" onClick={next} disabled={requirements.application === "led" && (!(requirements.ledCanvasWidth > 0) || !(requirements.ledCanvasHeight > 0) || !(Number(requirements.pixelPitchMm) > 0) || !(requirements.columns > 0) || !(requirements.rows > 0))}>
              Continue to the sources
            </button>
          </div>
        </section>
      ) : null}

      {step === STEP.sources ? (
        <section className="vw-wizard-card" data-testid="videowall-wizard-step-sources" aria-label="What is going on the wall?">
          <div className="vw-wizard-fieldset" role="group" aria-label="Source count">
            <p className="vw-wizard-label">Sources</p>
            <div className="vw-wizard-chips">
              {videowallSourcePresets.map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={requirements.sources === count}
                  onClick={() => onChange({ sources: count, windows: requirements.layout === "single" ? 1 : Math.min(requirements.windows, count) })}
                >
                  <strong>{count}</strong>
                  <span>source{count === 1 ? "" : "s"}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="vw-wizard-fieldset" role="group" aria-label="Source timing">
            <p className="vw-wizard-label">Source timing</p>
            <div className="vw-wizard-chips">
              {([["1080p", "1080p60"], ["4k30", "4K30"], ["4k60", "4K60"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={!requirements.sourceCustom && requirements.sourceResolution === value}
                  onClick={() => onChange({ sourceResolution: value, sourceCustom: false })}
                >
                  <strong>{label}</strong>
                  <span>source</span>
                </button>
              ))}
            </div>
          </div>
          <div className="vw-wizard-nav">
            <button type="button" className="vw-wizard-secondary" onClick={() => back(STEP.size)}>Back</button>
            <button type="button" className="vw-wizard-primary" data-testid="videowall-wizard-sources-next" onClick={next}>
              Continue to network choices
            </button>
          </div>
        </section>
      ) : null}

      {step === STEP.network ? (
        <section className="vw-wizard-card" data-testid="videowall-wizard-step-network" aria-label="What network will carry the picture?">
          <div className="vw-wizard-fieldset" role="group" aria-label="Network provision">
            <p className="vw-wizard-label">Network provision</p>
            <div className="vw-wizard-options">
              {videowallNetworkChoices.map((choice) => (
                <button
                  key={choice.key}
                  type="button"
                  aria-pressed={videowallNetworkKeyFor(requirements) === choice.key}
                  onClick={() => onChange(choice.patch)}
                >
                  <strong>{choice.label}</strong>
                  <span>{choice.detail}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="vw-wizard-nav">
            <button type="button" className="vw-wizard-secondary" onClick={() => back(STEP.sources)}>Back</button>
            <button type="button" className="vw-wizard-primary" data-testid="videowall-wizard-network-next" onClick={next} disabled={!videowallNetworkKeyFor(requirements)}>
              Continue to connection
            </button>
          </div>
        </section>
      ) : null}

      {step === STEP.feeding ? (
        <VideowallFeedStep
          requirements={requirements}
          onChange={onChange}
          onBack={() => back(STEP.network)}
          onNext={next}
        />
      ) : null}

      {step === STEP.layout ? (
        <section className="vw-wizard-card" data-testid="videowall-wizard-step-layout" aria-label="How should the sources appear?">
          <div className="vw-wizard-options">
            {layouts.map((choice) => (
              <button
                key={choice.key}
                type="button"
                disabled={wallWizardLayoutChoiceIsDisabled(choice, Boolean(requirements.multiviewSelected))}
                aria-pressed={requirements.layout === choice.value && (!choice.customMode || requirements.customMode === choice.customMode)}
                onClick={() => { onChooseLayout(choice); next(); }}
              >
                <strong>{choice.label}</strong>
                <span>{choice.detail}</span>
              </button>
            ))}
          </div>
          <div className="vw-wizard-nav">
            <button type="button" className="vw-wizard-secondary" onClick={() => back(STEP.feeding)}>Back</button>
            {/* Choosing a card advances, so a rep who is happy with the layout on
                screen had no action that kept it. This is that action. */}
            <button
              type="button"
              className="vw-wizard-primary"
              data-testid="videowall-wizard-layout-keep"
              onClick={next}
              disabled={Boolean(requirements.multiviewSelected) && !wallWizardLayoutIsMultiview(requirements.layout)}
            >
              Keep this layout and continue
            </button>
          </div>
        </section>
      ) : null}

      {step === STEP.visual ? (
        <section className="vw-wizard-card" data-testid="videowall-wizard-step-visual" aria-label="The wall you have described">
          <p className="vw-wizard-hint">
            The drawing reads the answers you have given: the array, the mounting height and the sources mapped onto it.
          </p>
          <VideowallVisual requirements={requirements} onRequirementsChange={onChange} onMappingChange={(mapping) => onChange({ mapping })} />
          <div className="vw-wizard-nav">
            <button type="button" className="vw-wizard-secondary" onClick={() => back(STEP.layout)}>Back</button>
            <button type="button" className="vw-wizard-primary" onClick={next}>Continue to must-haves</button>
          </div>
        </section>
      ) : null}

      {step === STEP.detail ? (
        <section className="vw-wizard-card" data-testid="videowall-wizard-step-detail" aria-label="What must the design handle?">
          <p className="vw-wizard-hint">Choose any that apply. Wingman adds each one to “Confirm before ordering” and to the saved design.</p>
          <div className="vw-wizard-options">
            {wallWizardConcerns.map((concern) => (
              <button
                key={concern.key}
                type="button"
                aria-pressed={concerns.includes(concern.key)}
                onClick={() => toggleConcern(concern.key)}
              >
                <strong>{concern.label}</strong>
                <span>{concern.detail}</span>
              </button>
            ))}
          </div>
          <div className="vw-wizard-nav">
            <button type="button" className="vw-wizard-secondary" onClick={() => back(STEP.visual)}>Back</button>
            <button type="button" className="vw-wizard-primary" onClick={() => { setEditing(false); setStep(RESULT); }}>
              See the design
            </button>
          </div>
        </section>
      ) : null}

      {atResult ? (
        <div className="vw-wizard-result" data-testid="videowall-wizard-result">
          <VideowallResultPages pages={{
            brief: <>
              {handoffNote ? (
                <p className="vw-builder-note" data-testid="videowall-handoff-origin">{handoffNote}</p>
              ) : null}
              <section className="vw-wizard-card" aria-labelledby="vw-wizard-answers-title">
                <header>
                  <h2 id="vw-wizard-answers-title">Your answers</h2>
                  <p>Change any answer and the recommendation updates.</p>
                </header>
                <div className="vw-wizard-answer-list">
                  {answers.map((answer) => (
                    <div key={answer.key}>
                      <div><strong>{answer.label}</strong><span>{answer.value}</span></div>
                      <button type="button" onClick={() => edit(answer.step)}>Change</button>
                    </div>
                  ))}
                  {concerns.length > 0 ? (
                    <div>
                      <div>
                        <strong>Must-haves</strong>
                        <span>{wallWizardConcerns.filter((concern) => concerns.includes(concern.key)).map((concern) => concern.label).join(" · ")}</span>
                      </div>
                      <button type="button" onClick={() => edit(wallWizardSteps.length - 1)}>Change</button>
                    </div>
                  ) : null}
                </div>
              </section>
            </>,
            layout: <VideowallVisual requirements={requirements} onRequirementsChange={onChange} onMappingChange={(mapping) => onChange({ mapping })} />,
            survey: <VideowallTransport
              plan={transport}
              requirements={requirements}
              measuredRuns={requirements.measuredRuns}
              linkDetails={requirements.linkDetails}
              displayMounts={requirements.displayMounts}
              onMeasure={measure}
              onMeasuredRuns={applyMeasuredRuns}
              onLinkDetails={(linkDetails) => onChange({ linkDetails })}
              onDisplayMounts={(displayMounts) => onChange({ displayMounts })}
              surveyReview={requirements.surveyReview}
              onSurveyReview={(surveyReview) => onChange({ surveyReview })}
              onRequirementsChange={(next) => onChange(next)}
            />,
            recommendation: <>
              <VideowallVerdict
                decision={decision}
                selected={selected}
                requirements={requirements}
                extraChecks={[...checks, ...transport.flags]}
                variantLabel={selected ? wallVariantLabel(selected.id, variantId) : null}
                onUse={onUse}
                onUnblock={onUnblock}
                onApply={onApply}
              />
              {/* The field sits under the answer rather than behind the expert
                  view: a rep comparing a matrix against the 500 series is doing
                  the same job in either reading. */}
              <VideowallOptionsList
                decision={decision}
                options={options}
                selected={selected}
                recommendedId={decision.recommended?.option.id ?? null}
                variantId={variantId}
                onSelect={onSelect}
                onVariant={onVariant}
              />
            </>,
            save: <>
              {surveyWarning ? <label><input type="checkbox" checked={Boolean(requirements.surveyDraftOverride)} onChange={(event) => onChange({ surveyDraftOverride: event.target.checked })} />Save as a pre-survey draft: installation details remain unconfirmed.</label> : null}
              {surveyWarning ? (
                <p className="vw-builder-warning" role="alert" data-testid="videowall-survey-gaps">
                  {surveyWarning} Record the missing cells in the transport table before this design is handed off.
                </p>
              ) : null}

              {/* A disabled save button is not an answer. The finish actions need a
                  selected design, so the screen names the thing that is missing and
                  carries the one action that supplies it — otherwise the result is a
                  dead end with three greyed buttons. */}
              {!selected ? (
                <p className="vw-builder-warning" role="status" data-testid="videowall-save-blocked">
                  No design is selected yet, so there is nothing to save.
                  {recommendedId
                    ? " Use WyreStorm’s recommendation, or pick another design below to see what it needs."
                    : " Pick a design from the list below."}
                </p>
              ) : selected.blockers.length > 0 ? (
                <p className="vw-builder-warning" role="status" data-testid="videowall-save-blocked">
                  The selected design needs {selected.blockers.length} change
                  {selected.blockers.length === 1 ? "" : "s"} before it can be saved. Apply them, then save.
                </p>
              ) : null}
              {!selected && recommendedId ? (
                <div className="vw-wizard-nav">
                  <button type="button" className="vw-wizard-primary" data-testid="videowall-use-recommendation" onClick={() => onSelect(recommendedId)}>
                    Use WyreStorm’s recommendation
                  </button>
                </div>
              ) : selected && selected.blockers.length > 0 ? (
                <div className="vw-wizard-nav">
                  <button type="button" className="vw-wizard-primary" data-testid="videowall-apply-design-changes" onClick={() => onApply(selected.id)}>
                    Apply the changes this design needs
                  </button>
                </div>
              ) : null}
              <footer className="vw-builder-actions">
                <button type="button" disabled={!selected || selected.blockers.length > 0 || Boolean(surveyWarning && !requirements.surveyDraftOverride)} onClick={() => onSave()}>Save to project</button>
                <button type="button" disabled={!selected || selected.blockers.length > 0 || Boolean(surveyWarning && !requirements.surveyDraftOverride)} onClick={onSaveProposal}>Save and open proposal</button>
                <button type="button" disabled={!selected} onClick={onCopy}>Copy summary</button>
                {onCopyLink ? <button type="button" onClick={onCopyLink}>Copy link</button> : null}
                <button type="button" onClick={restart}>Start again</button>
                <button type="button" onClick={onOpenExpert}>Open in Expert view</button>
              </footer>
            </>,
          }} />
          {message ? <p role="status">{message}</p> : null}
        </div>
      ) : null}
    </main>
  );
}

function WizardBack({ onBack }: { onBack: () => void }) {
  return (
    <div className="vw-wizard-nav">
      <button type="button" className="vw-wizard-secondary" onClick={onBack}>Back</button>
    </div>
  );
}
