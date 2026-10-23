import { AlertTriangle } from "lucide-react";
import type { ExportValidationResult } from "../lib/proposalExportValidation";
import type { WallSurveyGap } from "../lib/wallSurvey";
import type { WallLinkDetail } from "../lib/videowallTransport";
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
  part = "all",
}: {
  validation: ExportValidationResult;
  surveyGaps: WallSurveyGap[];
  /**
   * Records the cells typed under a survey warning on the wall's own project.
   * Null when the saved wall could not be identified, so the warning keeps its
   * "record it in the wall builder" line instead.
   */
  onRecordSurveyDetail: ((linkDetails: Record<string, WallLinkDetail>) => boolean) | null;
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
                  // The cells replace the "record it in the wall builder" line:
                  // this page can take the cells itself, so pointing away from
                  // it would contradict the form right underneath.
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
