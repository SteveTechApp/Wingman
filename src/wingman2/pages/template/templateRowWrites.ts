import { displayRunSpanFix } from "../../lib/displayRunFix";
import { templateDependencyRecord } from "../../lib/dependencyScope";
import type { RoomTemplate, TemplateBomRow } from "../../lib/roomTemplates";

type TemplateRowWrites = {
  rows: TemplateBomRow[];
  template: RoomTemplate;
  mutateRows(updater: (rows: TemplateBomRow[]) => TemplateBomRow[]): void;
  updateBrief(patch: Partial<RoomTemplate>): void;
};

/**
 * The two writes that change a template's schedule and the brief beside it.
 *
 * Each returns whether it wrote, so a control that offers the fix can refuse
 * quietly instead of clearing a block that had nothing to clear. Both facts
 * travel on: the rows reach the proposal and a saved project, the span reaches
 * the page's own gate — so a display-run block cannot clear on screen while the
 * document still quotes a receiver that never reaches the display.
 *
 * They live here rather than in the page because `TemplateReviewPage` sits at
 * its page-entry line ceiling, and a page that grows a new pair of writes is a
 * page that has to give something back.
 */
export function templateRowWrites({ rows, template, mutateRows, updateBrief }: TemplateRowWrites) {
  return {
    /** Clears a display run past the range's rating with the mid-span extender set. */
    scheduleDisplayRunSpans(): boolean {
      const fix = displayRunSpanFix({ rows, runMetres: template.surveyedRunMetres });
      if (!fix) return false;
      mutateRows(() => fix.rows);
      updateBrief({ servedRunMetres: fix.servedRunMetres });
      return true;
    },

    /** Records one dependency prompt where this document prints it (see `templateDependencyRecord`). */
    recordDependency(sku: string): boolean {
      const recorded = templateDependencyRecord(rows, template.validationItems, sku);
      if (!recorded) return false;
      mutateRows(() => recorded.rows);
      updateBrief({ validationItems: recorded.validationItems });
      return true;
    },
  };
}
