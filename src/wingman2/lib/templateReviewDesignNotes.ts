import type { RoomTemplate, TemplateBomRow } from "./roomTemplates";
import { projectScopeSection } from "./projectScope";

/** Output schedules describe the current included rows, including edited quantities. */
export function templateReviewDesignNotes(template: RoomTemplate, rows: TemplateBomRow[]) {
  const active = rows.filter(row => row.status !== "excluded" && row.qty > 0);
  const schedule = (section: "inputs" | "displays") => active.filter(row => projectScopeSection(row) === section).map(row => `${row.qty} × ${row.description}`).join("; ") || "No included items; confirm whether this is intentional.";
  return template.designNotes.map(note => note.label === "Source schedule" ? { ...note, description: schedule("inputs") } : note.label === "Output schedule" ? { ...note, description: schedule("displays") } : note);
}
