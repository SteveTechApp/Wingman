import { AlertTriangle } from "lucide-react";
import type { ExportValidationResult } from "../lib/proposalExportValidation";
import { DEPENDENCY_PROMPT_BLOCKER_ID } from "../lib/proposalExportValidation";
import type { DependencyPrompt } from "../lib/dependencyScope";
import type { WallSurveyGap } from "../lib/wallSurvey";
import type { WallLinkDetail } from "../lib/videowallTransport";
import { DependencyScopeFixes } from "./DependencyScopeFixes";
import { DisplayRunSpanFix } from "./DisplayRunSpanFix";
import { WallSurveyGapFixes } from "./WallSurveyGapFixes";

/**
 * What the export validator found for this template: the blockers that hold the
 * document, then the warnings that let it issue with a labelled assumption.
 *
 * An incomplete wall survey is a warning, not a blocker, so the short links are
 * answered here with the same cells the proposal offers — this page can record
 * them itself, which is why the warning does not send the rep to the builder.
 */
export function TemplateExportValidation({
  validation,
  surveyGaps,
  onRecordSurveyDetail,
  displayRun,
  dependencyPrompts,
  onRecordDependency,
  part = "all",
}: {
  validation: ExportValidationResult;
  surveyGaps: WallSurveyGap[];
  /**
   * Records the cells typed under a survey warning on the wall's own project.
   * Null when the saved wall could not be identified, so the warning keeps its
   * "record it in the video wall designer" line instead.
   */
  onRecordSurveyDetail: ((linkDetails: Record<string, WallLinkDetail>) => boolean) | null;
  /**
   * The surveyed display run and the one-tap fix for it, when this surface can
   * apply it. The prose fix still prints beside the action: the block names
   * shortening the run too, and the button only does the span change.
   */
  displayRun?: { runMetres: number; onSchedule: () => boolean } | null;
  /**
   * The dependency prompts this template's schedule still carries, and the write
   * that records one. A template built from a project inherits that project's
   * BOM, placeholders included, so this page can be the one holding the
   * document — and the one that answers it.
   */
  dependencyPrompts?: DependencyPrompt[];
  onRecordDependency?: ((sku: string) => boolean) | null;
  /** Which half this surface shows; the pre-issue walk reads them apart. */
  part?: "all" | "blockers" | "warnings";
}) {
  return (
    <>
      {part !== "warnings" && validation.blockers.length > 0 && (
        <section className="wm-template-validation-blockers">
          <h3><AlertTriangle /> Export blockers ({validation.blockers.length})</h3>
          <ul>
            {validation.blockers.map((blocker) => (
              <li key={blocker.id}>
                <strong>{blocker.domain}</strong>: {blocker.message}
                <span className="wm-validation-fix">{blocker.fix}</span>
                {blocker.domain === "display-run" && displayRun ? (
                  <DisplayRunSpanFix runMetres={displayRun.runMetres} onSchedule={displayRun.onSchedule} />
                ) : null}
                {blocker.id === DEPENDENCY_PROMPT_BLOCKER_ID && onRecordDependency && dependencyPrompts?.length ? (
                  // The question is answered here rather than by editing the row:
                  // this page owns the schedule the placeholder sits in.
                  <DependencyScopeFixes
                    dependencies={dependencyPrompts}
                    onRecord={onRecordDependency}
                    explanation="A dependency prompt has no catalogue part behind it, so it cannot be priced. Recording one takes the placeholder out of the schedule and keeps the dependency with the room's unresolved items, so the document still says what has to be confirmed."
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
      {part !== "blockers" && validation.warnings.length > 0 && (
        <section className="wm-template-validation-warnings">
          <h3>Warnings ({validation.warnings.length})</h3>
          <ul>
            {validation.warnings.map((warning) => (
              <li key={warning.id}>
                <strong>{warning.domain}</strong>: {warning.message}
                {warning.domain === "survey" && surveyGaps.length > 0 && onRecordSurveyDetail ? (
                  // The cells replace the "record it in the video wall
                  // designer" line: this page can take the cells itself, so
                  // pointing away from it would contradict the form right
                  // underneath.
                  <WallSurveyGapFixes
                    gaps={surveyGaps}
                    onRecordDetail={onRecordSurveyDetail}
                  />
                ) : (
                  <span className="wm-validation-fix col-span-full">{warning.fix}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
