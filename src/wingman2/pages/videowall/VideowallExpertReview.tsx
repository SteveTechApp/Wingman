import {
  validateWallRequirements,
  wallApplications,
  wallAspectWarning,
  wallCanvasPlan,
  wallProjectorCount,
  wallResolutionBudget,
  type WallOption,
  type WallRequirements,
} from "../../lib/videowallOptions";
import {
  wallDecisionQuestions,
  wallLayoutChoices,
  type WallDecision,
  type WallLayoutChoice,
  type WallStartPreset,
} from "../../lib/videowallDecision";
import type { WallStartingPointOrigin } from "../../lib/wallStartingPointOrigin";
import { videowallLocationChoices, videowallLocationKeyFor } from "../../lib/videowallDraft";
import { formatMillimetres, wallPhysicalSize } from "../../lib/wallPhysicalSize";
import { wallSurveyDisplayCount, wallSurveyGapText, wallSurveyGaps } from "../../lib/wallSurvey";
import { wallTransportPlan } from "../../lib/videowallTransport";
import { wallReviewStageStatuses, type WallReviewStageKey } from "../../lib/videowallWizard";
import { wallSharePassName } from "../../lib/wallShareLink";
import { SaveWallStartingPoint } from "./WallStartingPointSave";
import { VideowallFeedFields } from "./VideowallFeedFields";
import { VideowallOptionsList } from "./VideowallOptionsList";
import { VideowallRefineFields } from "./VideowallRefineFields";
import { VideowallReviewNav, VideowallReviewStages } from "./VideowallReviewStages";
import { VideowallSizeFields } from "./VideowallSizeFields";
import { VideowallStartPresets } from "./VideowallStartPresets";
import { VideowallStep } from "./VideowallStep";
import { VideowallTransport } from "./VideowallTransport";
import { VideowallVerdict } from "./VideowallVerdict";
import { VideowallVisual } from "./VideowallVisual";
import { WallStartingPointOriginNote } from "./WallStartingPointOriginNote";

/**
 * The expert builder reads its wall the same way the guided result does: the
 * design, the drawing and the wiring are three passes, not one long page. Every
 * answer stays in the design pass, so nothing a rep changes is out of reach,
 * and the drawing and transport table each get a screen of their own.
 */
export function VideowallExpertReview({
  requirements,
  decision,
  selected,
  options,
  recommendedId,
  startingPoint,
  reviewStage,
  onReviewStage,
  /** Present when the page can copy an address carrying the wall and this pass. */
  onCopyLink,
  onPickPreset,
  onUpdate,
  onChoosePanels,
  onChooseLayout,
  onMeasure,
  onApplyMeasuredRuns,
  onSheetImported,
  onUse,
  onUnblock,
  onApply,
  onSelect,
}: {
  requirements: WallRequirements;
  decision: WallDecision;
  selected: WallOption | null;
  options: WallOption[];
  recommendedId: string | null;
  /** The card the answers were adjusted from, if the rep picked one. */
  startingPoint?: WallStartingPointOrigin | null;
  /** The pass on screen, owned by the builder so a save or reload keeps it. */
  reviewStage: WallReviewStageKey;
  onReviewStage: (stage: WallReviewStageKey) => void;
  /** Shares the wall and the pass being read, from the pass itself. */
  onCopyLink?: () => void;
  /** A card sets the whole brief, so the page records it as the origin too. */
  onPickPreset: (preset: WallStartPreset) => void;
  onUpdate: (patch: Partial<WallRequirements>) => void;
  onChoosePanels: (columns: number, rows: number) => void;
  onChooseLayout: (choice: WallLayoutChoice) => void;
  onMeasure: (ids: string[], metres: number | null) => void;
  onApplyMeasuredRuns: (measuredRuns: Record<string, number>) => void;
  /** A paper sheet landed: the page keeps its trail note until the design saves. */
  onSheetImported?: (note: string) => void;
  onUse: () => void;
  onUnblock: (next: WallRequirements) => void;
  onApply: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const lcd = requirements.application.startsWith("lcd");
  const panels = requirements.columns * requirements.rows;
  const errors = validateWallRequirements(requirements);
  const aspectWarning = wallAspectWarning(requirements);
  const resolutionBudget = wallResolutionBudget(requirements);
  const canvasPlan = wallCanvasPlan(requirements);
  const transport = wallTransportPlan(requirements);
  const surveyGaps = wallSurveyGaps(transport, requirements.linkDetails);
  // The same sentence the guided result and the handoff use for a short survey.
  const surveyWarning = surveyGaps.length ? wallSurveyGapText(surveyGaps, wallSurveyDisplayCount(transport)) : null;
  const layoutChoices = wallLayoutChoices.filter(
    (choice) => !choice.applications || choice.applications.includes(requirements.application),
  );
  const physical = wallPhysicalSize(requirements);
  const projectors = wallProjectorCount(requirements);
  const wallShape = requirements.application === "led"
    ? "LED canvas"
    : requirements.application === "projection"
      ? projectors > 1 ? `${projectors} projectors` : "Projector screen"
      : `${panels} panel${panels === 1 ? "" : "s"}`;
  // The share action is named for the pass it sends: three buttons reading
  // "Copy link" would be three interchangeable controls to a screen reader.
  const copyLabel = onCopyLink ? `Copy link to the ${wallSharePassName(reviewStage)} pass` : undefined;
  const statuses = wallReviewStageStatuses({
    selectedTitle: selected?.title ?? null,
    unblockers: decision.unblockers.length,
    wall: `${wallShape} · ${formatMillimetres(physical.wall.width)} × ${formatMillimetres(physical.wall.height)} mm`,
    links: transport.allLinks.length,
    gaps: surveyGaps.length,
  });

  return (
    <div className="vw-wizard-result" data-testid="videowall-expert-review">
      <VideowallReviewStages stage={reviewStage} statuses={statuses} onStage={onReviewStage} />

      {reviewStage === "decision" ? (
        <section className="vw-wizard-stage" data-testid="videowall-expert-panel-decision" aria-label="The design">
          <section className="vw-builder-decide" aria-labelledby="wall-requirements-title">
            <header className="vw-builder-decide-head">
              <h2 id="wall-requirements-title">Size the wall</h2>
              <p>Each answer removes designs from the field. You do not need to know the catalogue.</p>
            </header>
            <div className="vw-builder-starts" role="group" aria-label="Wall starting points">
              <p>Start from the wall</p>
              <VideowallStartPresets
                requirements={requirements}
                startedKey={startingPoint?.key ?? null}
                onPick={onPickPreset}
              />
              <p className="vw-builder-starts-hint">One tap sets every answer. Adjust anything the customer differs on.</p>
              <WallStartingPointOriginNote origin={startingPoint} requirements={requirements} />
              <SaveWallStartingPoint
                requirements={requirements}
                disabled={!selected || selected.blockers.length > 0}
                label="Save this wall as a starting point"
              />
            </div>

            <ol className="vw-builder-steps">
              <VideowallStep index={1} question={wallDecisionQuestions.application} hint="This decides whether the panels take separate feeds, groups of feeds, or one composed canvas.">
                <div className="vw-builder-applications" role="group" aria-label="Display application">
                  {wallApplications.map((application) => (
                    <button
                      key={application.value}
                      type="button"
                      aria-pressed={requirements.application === application.value}
                      onClick={() => {
                        // A per-panel feed only exists for individually fed LCDs, and
                        // custom placement only exists on one composed canvas. Keep the
                        // rest of the captured answer intact.
                        const dropIndependent = application.value !== "lcd-direct" && requirements.layout === "independent";
                        const dropCustom = application.value === "lcd-direct" && requirements.layout === "custom";
                        onUpdate({
                          application: application.value,
                          ...(dropIndependent || dropCustom ? { layout: "single" as const, windows: 1 } : {}),
                        });
                      }}
                    >
                      <strong>{application.title}</strong>
                      <span>{application.description}</span>
                    </button>
                  ))}
                </div>
                {requirements.application === "lcd-grouped" ? (
                  <VideowallFeedFields requirements={requirements} onChange={onUpdate} />
                ) : null}
              </VideowallStep>

              <VideowallStep
                index={2}
                question={wallDecisionQuestions.scale}
                hint={requirements.application === "projection"
                  ? "The projectors and the source count set the size of the box."
                  : "The array and the source count set the size of the box."}
              >
                <VideowallSizeFields requirements={requirements} panels={panels} lcd={lcd} aspectWarning={aspectWarning}
                  budget={resolutionBudget} plan={canvasPlan} onUpdate={onUpdate} onPanels={onChoosePanels} />
              </VideowallStep>

              <VideowallStep index={3} question={wallDecisionQuestions.layout} hint="Windows are composed in one design. A source per screen is a different design.">
                <div className="vw-builder-choices" role="group" aria-label="Content layout">
                  {layoutChoices.map((choice) => (
                    <button
                      key={choice.key}
                      type="button"
                      aria-pressed={
                        requirements.layout === choice.value
                        && (!choice.customMode || requirements.customMode === choice.customMode)
                      }
                      onClick={() => onChooseLayout(choice)}
                    >
                      <strong>{choice.label}</strong>
                      <span>{choice.detail}</span>
                    </button>
                  ))}
                </div>
              </VideowallStep>

              <VideowallStep index={4} question={wallDecisionQuestions.location} hint="Distance decides between local HDMI and network transport.">
                <div className="vw-builder-choices" role="group" aria-label="Source location">
                  {videowallLocationChoices.map((choice) => (
                    <button
                      key={choice.key}
                      type="button"
                      aria-pressed={videowallLocationKeyFor(requirements) === choice.key}
                      onClick={() => onUpdate(choice.patch)}
                    >
                      <strong>{choice.label}</strong>
                      <span>{choice.detail}</span>
                    </button>
                  ))}
                </div>
              </VideowallStep>
            </ol>

            <VideowallRefineFields requirements={requirements} lcd={lcd} errors={errors} onUpdate={onUpdate} />
          </section>

          <VideowallVerdict
            decision={decision}
            selected={selected}
            requirements={requirements}
            extraChecks={transport.flags}
            onUse={onUse}
            onUnblock={onUnblock}
            onApply={onApply}
          />

          <VideowallOptionsList
            decision={decision}
            options={options}
            selected={selected}
            recommendedId={recommendedId}
            onSelect={onSelect}
          />

          <VideowallReviewNav
            onNext={() => onReviewStage("wall")}
            nextLabel="Continue to the wall"
            onCopy={onCopyLink}
            copyLabel={copyLabel}
          />
        </section>
      ) : null}

      {reviewStage === "wall" ? (
        <section className="vw-wizard-stage" data-testid="videowall-expert-panel-wall" aria-label="The wall">
          <p className="vw-wizard-stage-intro">
            Drawn at the size and mounting height the answers set, with the source mapped onto it.
          </p>
          <VideowallVisual
            requirements={requirements}
            onMappingChange={(mapping) => onUpdate({ mapping })}
            onRequirementsChange={(next) => onUpdate(next)}
          />
          <VideowallReviewNav
            onBack={() => onReviewStage("decision")}
            backLabel="Back to the design"
            onNext={() => onReviewStage("transport")}
            nextLabel="Continue to transport"
            onCopy={onCopyLink}
            copyLabel={copyLabel}
          />
        </section>
      ) : null}

      {reviewStage === "transport" ? (
        <section className="vw-wizard-stage" data-testid="videowall-expert-panel-transport" aria-label="Transport and survey">
          <p className="vw-wizard-stage-intro">
            Every run the handoff needs, with the measured length and the install cells recorded per link.
          </p>
          {surveyWarning ? (
            <p className="vw-builder-warning" role="alert" data-testid="videowall-survey-gaps">
              {surveyWarning} Record the missing cells in the transport table before this design is handed off.
            </p>
          ) : null}
          <VideowallTransport
            plan={transport}
            requirements={requirements}
            measuredRuns={requirements.measuredRuns}
            linkDetails={requirements.linkDetails}
            displayMounts={requirements.displayMounts}
            onMeasure={onMeasure}
            onMeasuredRuns={onApplyMeasuredRuns}
            onLinkDetails={(linkDetails) => onUpdate({ linkDetails })}
            onDisplayMounts={(displayMounts) => onUpdate({ displayMounts })}
            onSheetImported={onSheetImported}
            surveyReview={requirements.surveyReview}
            onSurveyReview={(surveyReview) => onUpdate({ surveyReview })}
            onRequirementsChange={(next) => onUpdate(next)}
          />
          <VideowallReviewNav
            onBack={() => onReviewStage("wall")}
            backLabel="Back to the wall"
            onCopy={onCopyLink}
            copyLabel={copyLabel}
          />
        </section>
      ) : null}
    </div>
  );
}
