import { rowAnchorId } from "./anchorIds";
import type { WallSurveyScan } from "./wallSurveyScan";

/**
 * The rep's decisions on one worksheet photo review, kept on the design itself.
 *
 * A photo reading is only a suggestion until a person looks at it, so the design
 * remembers the whole review rather than only its result: which rows the reader
 * offered, how legible each one was, and whether the rep took it or cleared it.
 * That is what lets a measured run be explained later — "the smudged 9 m row was
 * rejected" — instead of leaving a number on the wall with no story behind it.
 *
 * The rows are the reader's rows, not the links: a rejected row keeps the length
 * it was read at, because the decision to reject it is only meaningful next to
 * the value that was rejected.
 */
export type WallSurveyReviewDecision = "accepted" | "rejected";

export type WallSurveyReviewRow = {
  /** Transport link id printed beside the worksheet row. */
  id: string;
  /** Link label as the worksheet printed it, so the audit names the row. */
  label: string;
  /** Run the reader took from the row; null when only its install line was legible. */
  metres: number | null;
  /**
   * The run the photo reported, when the rep corrected it before applying.
   * Absent when the row landed as it was read.
   */
  readMetres?: number | null;
  /** 0-1 confidence the reader reported for this row. */
  confidence: number;
  /**
   * True when no photo read the row and the rep typed it in the review list.
   * The record then says the number came from a person, not the reader.
   */
  typed?: boolean;
  /** What the rep did with the row. */
  decision: WallSurveyReviewDecision;
};

/**
 * A hand-typed run the review flagged as far from its link's allowance.
 *
 * The numbers are kept, not the sentence: the apply bar, the status after it and
 * the audit trail all print the same run and allowance from this one record, so
 * the project can quote what the rep reviewed long after the panel is closed.
 */
export type WallSurveyReviewFlag = {
  /** Transport link id the run belongs to. */
  id: string;
  /** Link label as the review listed it. */
  label: string;
  /** The hand-typed run that landed. */
  metres: number;
  /** The allowance it was checked against. */
  allowanceMetres: number;
};

export type WallSurveyReview = {
  /** ISO time the rep applied the reviewed rows. */
  reviewedAt: string;
  /** How many worksheet photos this review came from. */
  photoCount: number;
  /** 0-1 confidence of the whole transcription, as the reader reported it. */
  confidence: number;
  /** Every row the reader offered, in the order the design lists its links. */
  rows: WallSurveyReviewRow[];
  /**
   * Hand-typed runs the apply bar named as outside the printed allowance. They
   * are runs that landed, so the trail can report the same numbers the rep saw
   * rather than only counting them.
   */
  flags?: WallSurveyReviewFlag[];
};

/** A worksheet is a bounded sheet, so a stored review is bounded too. */
const MAX_REVIEW_ROWS = 200;

function reviewConfidence(value: unknown) {
  const confidence = Number(value);
  return Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0;
}

/**
 * Turn a reviewed scan into the record the design keeps: one row per reading,
 * marked with the decision the rep left on it. Passing the accepted ids (the
 * ones the panel applied) is what makes the record say rejected, not just read.
 */
export function wallSurveyReviewFrom(
  scan: WallSurveyScan,
  acceptedIds: readonly string[],
  reviewedAt: string,
  /** The scan as the photo reported it, when the rep corrected a row first. */
  readScan: WallSurveyScan = scan,
  /** The runs the apply bar flagged as far from their allowance. */
  flags: readonly WallSurveyReviewFlag[] = [],
): WallSurveyReview {
  const accepted = new Set(acceptedIds);
  const readRuns = new Map(readScan.readings.map((reading) => [reading.id, reading.metres]));
  // A flag names a run that landed; one for a row the rep cleared describes a
  // number the design does not carry, so the record keeps only the applied ones.
  // The record keeps the numbers, not the warning sentence a surface built from
  // them: the trail words the same run itself.
  const keptFlags = flags
    .filter((flag) => accepted.has(flag.id))
    .map((flag) => ({ id: flag.id, label: flag.label, metres: flag.metres, allowanceMetres: flag.allowanceMetres }));
  return {
    reviewedAt,
    photoCount: Math.max(1, Math.round(scan.photoCount)),
    confidence: reviewConfidence(scan.confidence),
    rows: scan.readings.map((reading) => {
      const readMetres = readRuns.has(reading.id) ? (readRuns.get(reading.id) ?? null) : reading.metres;
      return {
        id: reading.id,
        label: reading.label || reading.id,
        metres: reading.metres == null ? null : reading.metres,
        // A corrected row keeps both numbers, so the audit explains the edit
        // instead of quietly disagreeing with the photograph.
        ...(readMetres === reading.metres ? {} : { readMetres }),
        confidence: reviewConfidence(reading.confidence),
        ...(reading.typed ? { typed: true } : {}),
        decision: accepted.has(reading.id) ? "accepted" : "rejected",
      };
    }),
    ...(keptFlags.length ? { flags: keptFlags } : {}),
  };
}

/**
 * Check a stored review before it goes back onto a design.
 *
 * A draft can rot, so a row without a link id or a decision is dropped rather
 * than guessed at, and a review that loses every row is no review at all.
 */
export function normalizeWallSurveyReview(value: unknown): WallSurveyReview | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const reviewedAt = typeof record.reviewedAt === "string" ? record.reviewedAt.trim() : "";
  if (!reviewedAt) return undefined;
  const rows: WallSurveyReviewRow[] = [];
  for (const item of Array.isArray(record.rows) ? record.rows.slice(0, MAX_REVIEW_ROWS) : []) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const decision = row.decision === "accepted" || row.decision === "rejected" ? row.decision : null;
    if (!id || !decision) continue;
    const metres = Number(row.metres);
    const applied = row.metres == null || !Number.isFinite(metres) || metres <= 0 ? null : metres;
    const readMetres = Number(row.readMetres);
    rows.push({
      id,
      label: typeof row.label === "string" && row.label.trim() ? row.label.trim() : id,
      metres: applied,
      // Only a read run that differs from the applied one says anything.
      ...(row.readMetres != null && Number.isFinite(readMetres) && readMetres > 0 && readMetres !== applied
        ? { readMetres }
        : {}),
      confidence: reviewConfidence(row.confidence),
      ...(row.typed === true ? { typed: true } : {}),
      decision,
    });
  }
  if (!rows.length) return undefined;
  // A flag explains a run the design kept, so it is dropped when its row is
  // missing or was cleared, and when the numbers cannot be printed as metres.
  const flags: WallSurveyReviewFlag[] = [];
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  for (const item of Array.isArray(record.flags) ? record.flags : []) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const flag = item as Record<string, unknown>;
    const id = typeof flag.id === "string" ? flag.id.trim() : "";
    const row = id ? rowsById.get(id) : undefined;
    if (!row || row.decision !== "accepted" || flags.some((kept) => kept.id === id)) continue;
    const metres = Number(flag.metres);
    const allowanceMetres = Number(flag.allowanceMetres);
    if (!Number.isFinite(metres) || metres <= 0) continue;
    if (!Number.isFinite(allowanceMetres) || allowanceMetres <= 0) continue;
    flags.push({
      id,
      label: typeof flag.label === "string" && flag.label.trim() ? flag.label.trim() : row.label,
      metres,
      allowanceMetres,
    });
  }
  return {
    reviewedAt,
    photoCount: Math.max(1, Math.round(Number(record.photoCount) || 1)),
    confidence: reviewConfidence(record.confidence),
    rows,
    ...(flags.length ? { flags } : {}),
  };
}

/**
 * The review a saved wall carries, for a surface that only reads the design.
 *
 * A saved summary stores the review inside its requirements, while a caller
 * holding the requirements already passes them directly; both shapes resolve
 * here so the project record and the builder read the same rows. A review that
 * no longer normalises is treated as no review, not as an empty one.
 */
export function wallSurveyReviewFromSummary(value: unknown): WallSurveyReview | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const summary = record.summary && typeof record.summary === "object"
    ? (record.summary as Record<string, unknown>)
    : record;
  const requirements = summary.requirements && typeof summary.requirements === "object"
    ? (summary.requirements as Record<string, unknown>)
    : summary;
  return normalizeWallSurveyReview(requirements.surveyReview);
}

/**
 * The rows the rep read and then left off the design.
 *
 * A cleared row is a measurement the photograph offered and a person chose not
 * to apply, so the design keeps its own run: the decision is worth a second look
 * even though nothing about the wall failed.
 */
export function wallSurveyClearedRows(review: WallSurveyReview) {
  return review.rows.filter((row) => row.decision === "rejected");
}

/**
 * How old a review has to be before its card says the survey may have moved on.
 *
 * A survey is a measurement of one room, and a room changes: three months is the
 * point where a reading stops being evidence of today's wall and becomes a
 * starting point to re-confirm. One threshold, read by every list that shows the
 * flag, so a project cannot look stale on one surface and current on another.
 */
export const SURVEY_REVIEW_STALE_DAYS = 90;

export type WallSurveyReviewAge = {
  /** Whole days between the review and now, never negative. */
  days: number;
  /** The age in the words a rep would use: "today", "3 weeks ago". */
  text: string;
  /** True once the review is old enough that the room may have changed since. */
  stale: boolean;
};

/**
 * How long ago the review was applied, in readable words.
 *
 * The exact stamp belongs in the title (it is the record); the chip needs the
 * distance, because "reviewed" alone reads the same this morning and last
 * winter. An unreadable timestamp has no age to show rather than a wrong one.
 */
export function wallSurveyReviewAge(
  reviewedAt: string,
  now: Date = new Date(),
): WallSurveyReviewAge | null {
  const at = new Date(reviewedAt);
  if (Number.isNaN(at.getTime())) return null;
  // A review written by a slightly fast clock is "today", never "in 2 days".
  const days = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 86_400_000));
  const ago = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
    new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" }).format(-value, unit);
  let text: string;
  if (days < 1) text = "today";
  else if (days < 7) text = ago(days, "day");
  else if (days < 30) text = ago(Math.round(days / 7), "week");
  else if (days < 365) text = ago(Math.min(11, Math.floor(days / 30)), "month");
  else text = ago(Math.floor(days / 365), "year");
  return { days, text, stale: days >= SURVEY_REVIEW_STALE_DAYS };
}

/**
 * The age sentence a flag's title carries: the chip's distance, plus what to do
 * about it once the survey is old enough to doubt.
 */
function reviewAgeSentence(age: WallSurveyReviewAge | null) {
  if (!age) return "";
  return age.stale
    ? ` Last reviewed ${age.text}, so the room may have changed since; reopen the review to re-confirm the rows.`
    : ` Last reviewed ${age.text}.`;
}

export type WallSurveyClearedFlag = {
  /** Rows the rep rejected in this review. */
  cleared: number;
  /** Every row the review offered, so the share is readable without the review. */
  total: number;
  reviewedAt: string;
  /** How long ago the review was applied; null when its stamp cannot be read. */
  age: WallSurveyReviewAge | null;
  /**
   * The link's row id, which is the first cleared row. The list can name the
   * panel on its own, but a rep who clicks "2 rows cleared" wants the rows, not
   * the table they sit somewhere inside. The bare id is what the anchor registry
   * appends to the panel, so the flag never builds an address by hand.
   */
  rowId: string;
  /** Chip-sized statement for a project list. */
  label: string;
  /** What the flag means and where its link takes the reader. */
  title: string;
};

/**
 * The flag a project list shows for a design whose last photo review cleared
 * rows. Read from the saved wall, so the list and the project's own review panel
 * cannot disagree about which rows were rejected; a review that kept every row,
 * or a wall with no review at all, has nothing to flag.
 */
export function projectSurveyClearedFlag(
  project: { videowall?: unknown } | null | undefined,
  now: Date = new Date(),
): WallSurveyClearedFlag | null {
  const review = wallSurveyReviewFromSummary(project?.videowall);
  if (!review) return null;
  const clearedRows = wallSurveyClearedRows(review);
  const cleared = clearedRows.length;
  if (!cleared) return null;
  const age = wallSurveyReviewAge(review.reviewedAt, now);
  return {
    cleared,
    total: review.rows.length,
    reviewedAt: review.reviewedAt,
    age,
    rowId: clearedRows[0].id,
    label: `${cleared} survey row${cleared === 1 ? "" : "s"} cleared`,
    title: `Opens the survey photo review in this project's Requirements section at the first cleared row: the last worksheet photo review cleared ${cleared} of ${review.rows.length} rows (${wallSurveyReviewStamp(review.reviewedAt)}).${reviewAgeSentence(age)}`,
  };
}

export type WallSurveyReviewedFlag = {
  /** Rows the review kept on the design. */
  total: number;
  reviewedAt: string;
  /** How long ago the review was applied; null when its stamp cannot be read. */
  age: WallSurveyReviewAge | null;
  /** Chip-sized statement for a project list. */
  label: string;
  /** What the flag means and where its link takes the reader. */
  title: string;
};

/**
 * The quiet counterpart of the cleared flag: a review that kept every row.
 *
 * A clean review is still a fact about the design — someone read the sheet and
 * agreed with it — so a list says so instead of leaving the project looking
 * like a room nobody has surveyed. Nothing was cleared, so there is no count to
 * warn about; the title carries what the review kept and its date.
 */
export function projectSurveyReviewedFlag(
  project: { videowall?: unknown } | null | undefined,
  now: Date = new Date(),
): WallSurveyReviewedFlag | null {
  const review = wallSurveyReviewFromSummary(project?.videowall);
  if (!review || wallSurveyClearedRows(review).length) return null;
  const total = review.rows.length;
  const age = wallSurveyReviewAge(review.reviewedAt, now);
  return {
    total,
    reviewedAt: review.reviewedAt,
    age,
    label: "Survey reviewed",
    title: `Opens the survey photo review in this project's Requirements section: the last worksheet photo review kept all ${total} row${total === 1 ? "" : "s"} (${wallSurveyReviewStamp(review.reviewedAt)}).${reviewAgeSentence(age)}`,
  };
}

/**
 * The clean reading a rep can re-confirm from the card, or null.
 *
 * Only a review that kept every row has a date to renew: a review that cleared
 * rows is work to do, and a wall nobody surveyed has nothing to re-confirm. This
 * is the stale half of `projectSurveyNeedsAttention`, so the action appears on
 * exactly the cards whose chip says the room may have moved on.
 */
export function projectSurveyReconfirmDue(
  project: { videowall?: unknown } | null | undefined,
  now: Date = new Date(),
): WallSurveyReviewedFlag | null {
  const reviewed = projectSurveyReviewedFlag(project, now);
  return reviewed?.age?.stale ? reviewed : null;
}

/**
 * Whether a project's saved survey still asks for something.
 *
 * Both states the chip can show are work: rows a review cleared, and a reading
 * old enough that the room may have moved on before it is quoted again. A
 * project nobody has surveyed is not in this count — there is no reading to
 * re-confirm — so the answer is "which surveys need me?", not "which projects
 * have no survey?". The list filter and the chip read this one rule, so the
 * cards it keeps are the cards whose chip says something.
 */
export function projectSurveyNeedsAttention(
  project: { videowall?: unknown } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (projectSurveyClearedFlag(project, now)) return true;
  return projectSurveyReviewedFlag(project, now)?.age?.stale === true;
}

/**
 * The projects whose saved survey still asks for a rep, in the order they were
 * read. The navigation counts these so the work is visible before the list is
 * open; the list's own filter keeps the same rule, so the count and the cards
 * it would show cannot disagree.
 */
export function projectsNeedingSurveyAttention<T extends { videowall?: unknown }>(
  projects: readonly T[],
  now: Date = new Date(),
): T[] {
  return projects.filter((project) => projectSurveyNeedsAttention(project, now));
}

/** When the review was applied, in the clock of the person who applied it. */
export function wallSurveyReviewStamp(reviewedAt: string) {
  const at = new Date(reviewedAt);
  if (Number.isNaN(at.getTime())) return reviewedAt;
  return at.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** How the rep split the rows: taken onto the design, or cleared. */
export function wallSurveyReviewCounts(review: WallSurveyReview) {
  const accepted = review.rows.filter((row) => row.decision === "accepted").length;
  return { accepted, rejected: review.rows.length - accepted };
}

/** One line for the audit trail and the panel: what the review decided. */
export function wallSurveyReviewSummary(review: WallSurveyReview) {
  const { accepted, rejected } = wallSurveyReviewCounts(review);
  const photos = review.photoCount === 1 ? "1 photo" : `${review.photoCount} photos`;
  // Typed rows are named separately: they were not in the photograph, so a
  // reader's confidence should never be read as covering them.
  const typed = review.rows.filter((row) => row.typed).length;
  const parts = [`${accepted} row${accepted === 1 ? "" : "s"} accepted${typed ? ` (${typed} typed)` : ""}`];
  parts.push(rejected ? `${rejected} rejected` : "none rejected");
  parts.push(photos);
  parts.push(`${Math.round(review.confidence * 100)}% confidence`);
  return parts.join(", ");
}

/**
 * Where the project page puts the review panel and its rows, so an audit entry
 * can name the row it jumps to instead of pointing at a section in words.
 */
export const WALL_SURVEY_REVIEW_ANCHOR = "wall-survey-review";

export function wallSurveyReviewRowAnchor(id: string) {
  return rowAnchorId(WALL_SURVEY_REVIEW_ANCHOR, id);
}

export type WallSurveyClearedLink = {
  /** Rows this review cleared, so the label and the table agree. */
  cleared: number;
  /** Panel to land the reader in once the Requirements section is on screen. */
  anchorId: string;
  /** The first cleared row, which is what the jump scrolls to. */
  rowId: string;
  label: string;
  title: string;
};

/**
 * The audit entry's way into the rows it cleared.
 *
 * The trail names a count ("2 rejected"), which is only useful if the rows
 * behind it are one action away: this resolves the stored review to the panel
 * and the first cleared row, or to nothing when the review kept every row — an
 * entry that cleared none has nowhere to send the reader.
 */
export function wallSurveyClearedLink(review: WallSurveyReview | undefined | null): WallSurveyClearedLink | null {
  const cleared = review ? wallSurveyClearedRows(review) : [];
  if (!cleared.length) return null;
  const count = cleared.length;
  return {
    cleared: count,
    anchorId: WALL_SURVEY_REVIEW_ANCHOR,
    rowId: wallSurveyReviewRowAnchor(cleared[0].id),
    label: `See the ${count} cleared row${count === 1 ? "" : "s"}`,
    title: `Opens the survey photo review in Requirements, where the ${count === 1 ? "row" : "rows"} this entry cleared ${count === 1 ? "is" : "are"} listed.`,
  };
}

/**
 * One flagged run's numbers without its link name, for a surface that already
 * names the row it marks. The project's review table prints this under the run
 * it belongs to, and `wallSurveyReviewFlagText` adds the name to it.
 */
export function wallSurveyReviewFlagMeasure(flag: WallSurveyReviewFlag) {
  return `${flag.metres} m against ≈${flag.allowanceMetres} m`;
}

/**
 * One flagged run as the review prints it: the run beside the allowance it was
 * checked against. The apply bar, the status after it and the audit entry all
 * read this, so the numbers the rep reviewed are the numbers the trail keeps.
 */
export function wallSurveyReviewFlagText(flag: WallSurveyReviewFlag) {
  return `${flag.label}: ${wallSurveyReviewFlagMeasure(flag)}`;
}

export type WallSurveyReviewRunLink = {
  /** The review row the jump lands on, as the row's own anchor id. */
  rowId: string;
  /** The run and allowance, worded exactly as the trail prints them. */
  label: string;
  /** What the link opens, so the numbers are not the only clue. */
  title: string;
};

/**
 * The flagged runs as ways into the rows that decided them.
 *
 * The trail keeps the numbers so a run can be explained later, but a number a
 * reader cannot check is only half a record: each of these lands on the row the
 * run belongs to, where the decision it was part of is listed. The labels are
 * the same clause the note prints, because the point is to check that clause,
 * not a second wording of it.
 */
export function wallSurveyReviewFlagLinks(review: WallSurveyReview): WallSurveyReviewRunLink[] {
  return (review.flags ?? []).map((flag) => ({
    rowId: wallSurveyReviewRowAnchor(flag.id),
    label: wallSurveyReviewFlagText(flag),
    title: `Opens the survey photo review in Requirements at ${flag.label}'s row, where the run of ${flag.metres} m sits against a ≈${flag.allowanceMetres} m allowance and the decision the rep recorded is listed.`,
  }));
}

/**
 * The line the project's audit trail keeps for this review. It names the time
 * the rep applied the rows, so two reviews that happen to decide the same count
 * of rows stay two events rather than one repeated entry, and it carries the
 * hand-typed runs the apply bar flagged, because a number nobody checked is
 * exactly what the trail has to be able to explain later.
 */
export function wallSurveyReviewAuditNote(review: WallSurveyReview) {
  const flags = review.flags ?? [];
  const names = flags.slice(0, 3).map(wallSurveyReviewFlagText).join("; ");
  const rest = flags.length > 3 ? ` and ${flags.length - 3} more` : "";
  const flagNote = flags.length
    ? `, ${flags.length} typed run${flags.length === 1 ? "" : "s"} outside the printed allowance (${names}${rest})`
    : "";
  return `Worksheet photo review — ${wallSurveyReviewSummary(review)}${flagNote}; recorded ${wallSurveyReviewStamp(review.reviewedAt)}`;
}
