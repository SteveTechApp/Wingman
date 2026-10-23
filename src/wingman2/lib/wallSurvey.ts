import { wallSurveyReviewStamp } from "./wallSurveyReview";
import {
  WALL_LINK_DETAIL_FIELDS,
  cleanDetailText,
  hasWallLinkDetail,
  normalizeWallLinkDetail,
  runAllowanceWarning,
  withMeasuredRun,
  withWallLinkDetail,
  type WallLinkDetail,
  type WallLinkDetailField,
  type WallTransportLink,
  type WallTransportPlan,
} from "./videowallTransport";

/**
 * Site survey for a wall design. The transport table is compact on screen — a
 * big array folds into grouped rows — but a surveyor walking the room needs one
 * row per physical link, on paper or in a spreadsheet, and every run they write
 * down has to come back onto the exact link it measured. So the sheet is keyed
 * by transport link id and covers every link, never a folded row. Each row also
 * carries display-end detail beside display links. Mount is keyed once per
 * display, so source links never ask for it and grouped display links can share it.
 */

export type WallSurveyRow = {
  /** Transport link id; the import lands on this link. */
  id: string;
  link: string;
  /** Which half of the wall the link belongs to, for grouping on paper. */
  group: "source" | "display";
  cable: string;
  /** Design allowance the link would use with no survey value. */
  allowanceMetres: number;
  /** Practical cable limit for this link's transport. */
  limitMetres: number;
  /** Run already recorded on site, or null. */
  measuredMetres: number | null;
  /** Housing, termination and run entry recorded for this display link. */
  detail: WallLinkDetail;
  /** Mount belongs to the display and is read from the one-per-display map. */
  mount: string;
};

export const WALL_SURVEY_HEADER = [
  "Link id",
  "Link",
  "Cable",
  "Allowance (m)",
  "Limit (m)",
  "Measured run (m)",
  "Display housing",
  "Mount at display",
  "Termination at display",
  "Run entry at display",
];

/**
 * What the three numbers beside a link mean, in the words every output uses.
 *
 * The printed sheet, the sheet's CSV and the proposal's cable column all quote
 * the design's allowance, the cable's limit and the run the design already
 * holds, so the same figure cannot read as an allowance on one page and a bare
 * estimate on another. `text` is the sentence every surface prints; `sheet` is
 * the hint the paper adds beside its capture boxes, where there is something to
 * write in and the CSV's run cell has an equivalent.
 */
export const WALL_SURVEY_COLUMN_KEY = [
  {
    key: "allowance",
    label: "Allowance",
    text: "The cable length the design assumes for this link.",
    sheet: "A blank box keeps it.",
  },
  {
    key: "limit",
    label: "Limit",
    text: "The longest run this cable and transport carry.",
    sheet: "A longer run needs a different cable before the proposal issues.",
  },
  {
    key: "in-design",
    label: "In design",
    text: "The run the saved design already holds for this link, for reference only.",
    sheet: "Write the figure you measure in the box beside it.",
  },
] as const;

/**
 * The import reads the run at this position and the install cells after it, so
 * a sheet exported before the install columns existed (six cells) still lands
 * its runs, and extra columns pasted on the end cannot shift a measurement. The
 * run-entry cell is appended for the same reason: a sheet exported before it
 * existed keeps its termination in the column it was written in.
 */
const MEASURED_COLUMN = 5;
const DETAIL_COLUMNS: { field: WallLinkDetailField; index: number }[] = [
  { field: "enclosure", index: 6 },
  { field: "termination", index: 8 },
  { field: "entry", index: 9 },
];

function surveyedLink(link: WallTransportLink, detail: WallLinkDetail | undefined, displayMounts?: Record<string, string>): WallSurveyRow {
  const panelNumbers = link.group === "source" ? [] : link.id.match(/^display-(\d+)$/)
    ? [Number(link.id.match(/^display-(\d+)$/)![1])]
    : link.label.match(/Panels?\s+(\d+)(?:[–-](\d+))?/i)
      ? (() => {
          const match = link.label.match(/Panels?\s+(\d+)(?:[–-](\d+))?/i)!;
          const start = Number(match[1]);
          const end = Number(match[2] ?? match[1]);
          return Array.from({ length: Math.max(1, end - start + 1) }, (_, index) => start + index);
        })()
      : link.label.match(/Projector\s+(\d+)/i) ? [Number(link.label.match(/Projector\s+(\d+)/i)![1])] : [];
  const mountValues = [...new Set(panelNumbers.map((number) => String(displayMounts?.[`display-${number}`] ?? "").trim()).filter(Boolean))];
  return {
    id: link.id,
    link: link.label,
    group: link.group,
    cable: link.cable,
    allowanceMetres: link.allowanceMetres,
    limitMetres: link.limitMetres,
    measuredMetres: link.basis === "measured" ? link.runMetres : null,
    detail: normalizeWallLinkDetail(detail),
    mount: mountValues.join(" / "),
  };
}

/** One row per physical link, in the order the transport table lists them. */
export function wallSurveyRows(
  plan: WallTransportPlan,
  linkDetails?: Record<string, WallLinkDetail>,
  displayMounts?: Record<string, string>,
): WallSurveyRow[] {
  return plan.allLinks.map((link) => surveyedLink(link, linkDetails?.[link.id], displayMounts));
}

function csvField(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The sheet's column key, carried into the CSV so a spreadsheet read alone says
 * the same three words the paper does.
 *
 * A CSV has nowhere to print a panel, so the key becomes `#` lines under the
 * header — skipped on import, and harmless as spreadsheet rows. Only the hint
 * changes: the paper says a blank box keeps the allowance, the file says a blank
 * run cell does, and the run column shows the design's own run until the link is
 * measured.
 */
function csvColumnKey() {
  return WALL_SURVEY_COLUMN_KEY.map((entry) => {
    const hint = entry.key === "allowance"
      ? " A blank run cell keeps it."
      : entry.key === "in-design"
        ? " The run column shows it until you measure the link."
        : ` ${entry.sheet}`;
    return `# ${entry.label} — ${entry.text}${hint}`;
  });
}

/** The sheet a surveyor carries: link, cable, allowance, limit, run, install. */
export function wallSurveyCsv(plan: WallTransportPlan, linkDetails?: Record<string, WallLinkDetail>, displayMounts?: Record<string, string>): string {
  const rows = wallSurveyRows(plan, linkDetails, displayMounts).map((row) =>
    [
      row.id,
      row.link,
      row.cable,
      row.allowanceMetres,
      row.limitMetres,
      row.measuredMetres ?? "",
      row.detail.enclosure ?? "",
      row.group === "display" ? row.mount : "",
      row.detail.termination ?? "",
      row.detail.entry ?? "",
    ]
      .map(csvField)
      .join(","),
  );
  return [WALL_SURVEY_HEADER.join(","), ...csvColumnKey(), ...rows].join("\r\n");
}

export type WallSurveyImport = {
  /** Measured runs to apply, in sheet order. */
  runs: { id: string; metres: number }[];
  /** Links whose row was left blank: the surveyor did not measure them. */
  cleared: string[];
  /** Install cells written beside a link, in sheet order. */
  details: { id: string; detail: WallLinkDetail }[];
  /** Mount cells, keyed once per display rather than once per cable. */
  displayMounts: Record<string, string>;
  /** Rows that could not be read, named by row number as the sheet shows them. */
  problems: string[];
};

/** Split one CSV line, honouring quoted fields and doubled quotes. */
function csvFields(line: string): string[] {
  const fields: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      fields.push(value);
      value = "";
    } else value += character;
  }
  fields.push(value);
  return fields;
}

/** Metres from a surveyed cell: "12.5", "12,5" and "12.5 m" all read as 12.5. */
function surveyedMetres(value: string) {
  const cleaned = value.trim().replace(/\s*m$/i, "").replace(",", ".");
  if (cleaned === "") return null;
  const metres = Number(cleaned);
  return Number.isFinite(metres) && metres > 0 ? metres : Number.NaN;
}

/**
 * Read a filled sheet. Unknown link ids and unreadable lengths are rejected by
 * row number so the surveyor sees which run did not land; a blank measurement
 * means "not surveyed" and clears what was recorded before. Install cells are
 * read independently of the run, so a link whose length is illegible still
 * brings back the install cells written beside it.
 */
export function parseWallSurveyCsv(text: string, plan: WallTransportPlan): WallSurveyImport {
  const known = new Set(plan.allLinks.map((link) => link.id));
  const runs: WallSurveyImport["runs"] = [];
  const cleared: string[] = [];
  const details: WallSurveyImport["details"] = [];
  const displayMounts: WallSurveyImport["displayMounts"] = {};
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    // The column key the export writes under the header explains the sheet
    // rather than naming a link, so it is read past like a blank line.
    if (!line || line.startsWith("#")) continue;
    const fields = csvFields(line);
    const id = fields[0]?.trim() ?? "";
    // The exported header is the only row without a link id; skip it, but still
    // report a body row whose id was edited away.
    if (index === 0 && /^link id$/i.test(id)) continue;
    if (!known.has(id)) {
      problems.push(`Row ${index + 1}: "${id || "no link id"}" is not a link in this design.`);
      continue;
    }
    if (seen.has(id)) {
      problems.push(`Row ${index + 1}: ${id} is listed twice; the later row wins.`);
      const first = runs.findIndex((run) => run.id === id);
      if (first >= 0) runs.splice(first, 1);
      const firstCleared = cleared.indexOf(id);
      if (firstCleared >= 0) cleared.splice(firstCleared, 1);
      const firstDetail = details.findIndex((entry) => entry.id === id);
      if (firstDetail >= 0) details.splice(firstDetail, 1);
      delete displayMounts[id];
    }
    seen.add(id);

    // Only cells the row actually has are applied: a six-cell sheet from before
    // the install columns keeps whatever detail the design already holds.
    const patch: WallLinkDetail = {};
    for (const { field, index: column } of DETAIL_COLUMNS) {
      if (fields.length > column) patch[field] = fields[column] ?? "";
    }
    const link = plan.allLinks.find((item) => item.id === id);
    if (link?.group === "display") {
      if (WALL_LINK_DETAIL_FIELDS.some((field) => field in patch)) details.push({ id, detail: patch });
      if (/^display-\d+$/.test(id)) {
        if (fields.length > 7) displayMounts[id] = cleanDetailText(fields[7]);
      }
    }

    const cell = fields[MEASURED_COLUMN] ?? "";
    const metres = surveyedMetres(cell);
    if (metres === null) {
      cleared.push(id);
      continue;
    }
    if (Number.isNaN(metres)) {
      problems.push(`Row ${index + 1}: "${cell.trim()}" is not a length in metres.`);
      continue;
    }
    runs.push({ id, metres });
  }

  return { runs, cleared, details, displayMounts, problems };
}

/** A sheet run that sits far from the allowance the sheet printed for its link. */
export type WallSurveyRunFlag = {
  id: string;
  /** Link label, so the row can be checked against the paper in hand. */
  label: string;
  metres: number;
  allowanceMetres: number;
  /** The same sentence a run typed into the photo review gets. */
  warning: string;
};

/**
 * The imported runs a rep should check before they replace a design run.
 *
 * A sheet is filled in the room, so a run two metres from a five-metre link is
 * ordinary and a run twenty metres off is a decimal point or a row written in
 * the wrong box. The import is gated on this list — nothing lands until the rep
 * has seen it — and the rule itself is `runAllowanceWarning`, the one the photo
 * review uses for typed rows, so the two entry points cannot disagree about
 * what counts as far.
 */
export function flaggedSurveyRuns(
  sheet: Pick<WallSurveyImport, "runs">,
  plan: WallTransportPlan,
): WallSurveyRunFlag[] {
  const byId = new Map(plan.allLinks.map((link) => [link.id, link]));
  return sheet.runs.flatMap((run) => {
    const link = byId.get(run.id);
    if (!link) return [];
    const warning = runAllowanceWarning(run.metres, link.allowanceMetres);
    return warning
      ? [{ id: run.id, label: link.label, metres: run.metres, allowanceMetres: link.allowanceMetres, warning }]
      : [];
  });
}

/** Apply a read sheet to the saved runs, clearing every link it left blank. */
export function mergeSurveyRuns(
  measuredRuns: Record<string, number> | undefined,
  sheet: Pick<WallSurveyImport, "runs" | "cleared">,
) {
  let next = measuredRuns;
  for (const run of sheet.runs) next = withMeasuredRun(next, run.id, run.metres);
  for (const id of sheet.cleared) next = withMeasuredRun(next, id, null);
  return next;
}

/**
 * The install cells a handoff cannot go without: how the display is housed,
 * where the run enters and what the cable terminates in. Mount is useful on the
 * sheet but a missing mount does not leave an installer guessing about the
 * connection — while a run whose entry point nobody wrote down cannot be
 * pulled.
 */
export const WALL_HANDOFF_DETAIL_FIELDS: WallLinkDetailField[] = ["enclosure", "entry", "termination"];

export function wallSurveyDisplayCount(plan: WallTransportPlan) {
  return plan.allLinks.filter((link) => link.group === "display").length;
}

export type WallSurveyGap = {
  /** Transport link id the survey is short on. */
  id: string;
  link: string;
  group: "source" | "display";
  /** Required cells the survey left blank on this link, in field order. */
  missing: WallLinkDetailField[];
};

/**
 * Links whose survey is not ready to hand over: the display housing, run entry
 * or termination is missing. Read from the same map the sheet and the photo
 * scan write, so a link can only be clear when the design actually holds every
 * required value.
 */
export function wallSurveyGaps(
  plan: WallTransportPlan,
  linkDetails?: Record<string, WallLinkDetail>,
): WallSurveyGap[] {
  return plan.allLinks.filter((link) => link.group === "display").flatMap((link) => {
    const detail = normalizeWallLinkDetail(linkDetails?.[link.id]);
    const missing = WALL_HANDOFF_DETAIL_FIELDS.filter((field) => !cleanDetailText(detail[field]));
    return missing.length === 0 ? [] : [{ id: link.id, link: link.label, group: link.group, missing }];
  });
}

const HANDOFF_FIELD_LABEL: Record<WallLinkDetailField, string> = {
  enclosure: "display housing",
  entry: "run entry",
  termination: "termination",
};

/** The count on its own, for a panel that lists the short links underneath it. */
export function wallSurveyGapHeadline(gaps: WallSurveyGap[], linkCount: number) {
  if (gaps.length === 0) {
    return `Display housing, run entry and termination are recorded on all ${linkCount} link${linkCount === 1 ? "" : "s"}.`;
  }
  return `${gaps.length} of ${linkCount} links ${gaps.length === 1 ? "is" : "are"} missing a display housing, a run entry or a termination.`;
}

/** "run entry", "run entry and termination", "display housing, run entry and termination". */
function fieldList(fields: WallLinkDetailField[]) {
  const labels = fields.map((field) => HANDOFF_FIELD_LABEL[field]);
  if (labels.length < 2) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/** The short links themselves, each named with the cells it is missing. */
export function wallSurveyGapLinkList(gaps: WallSurveyGap[]) {
  const names = gaps.map((gap) => `${gap.link} (${fieldList(gap.missing)})`);
  const shown = names.slice(0, 6).join("; ");
  const rest = names.length > 6 ? ` and ${names.length - 6} more` : "";
  return `${shown}${rest}`;
}

/** One sentence naming the short links, for the builder and the saved design. */
export function wallSurveyGapText(gaps: WallSurveyGap[], linkCount: number) {
  const headline = wallSurveyGapHeadline(gaps, linkCount);
  if (gaps.length === 0) return headline;
  return `Survey incomplete: ${headline.slice(0, -1)} — ${wallSurveyGapLinkList(gaps)}.`;
}

/** Apply the install cells a sheet carried, leaving every other link alone. */
export function mergeSurveyDetails(
  linkDetails: Record<string, WallLinkDetail> | undefined,
  sheet: Pick<WallSurveyImport, "details">,
) {
  let next = linkDetails;
  for (const entry of sheet.details) next = withWallLinkDetail(next, entry.id, entry.detail);
  return next;
}

/** Merge display-level mounts read once per screen from a paper worksheet. */
export function mergeDisplayMounts(
  current: Record<string, string> | undefined,
  imported: Record<string, string>,
) {
  const next = { ...(current ?? {}) };
  for (const [id, value] of Object.entries(imported)) {
    const mount = cleanDetailText(value);
    if (mount) next[id] = mount;
    else delete next[id];
  }
  return Object.keys(next).length ? next : undefined;
}

/**
 * One applied run as the record reads it: the link, and the run that landed.
 *
 * A list of runs is the thing a rep checks against the paper, so it is printed
 * with its numbers rather than as a count — "2 scanned runs applied" cannot
 * answer which two. A row applied for its install line alone has no run to
 * quote, so it is named on its own. The photo review's status and the sheet
 * import's audit note both read this, so one surface cannot name what another
 * only counts.
 */
export function appliedRunText(row: { label: string; metres?: number | null }) {
  return row.metres == null ? row.label : `${row.label}: ${row.metres} m`;
}

/** The applied runs as the one list the panel and the record print. */
export function appliedRunsText(rows: ReadonlyArray<{ label: string; metres?: number | null }>) {
  return rows.map(appliedRunText).join("; ");
}

/**
 * The trail entry a paper sheet leaves on the project.
 *
 * A sheet is a second way runs reach a design — the surveyor measured in the
 * room, then the rep typed the numbers in — so the project has to say which runs
 * came from paper rather than leaving them looking hand-typed link by link. The
 * note names the links and the runs they carried for the same reason the apply
 * bar does, and it carries the import time so a re-import of the same sheet is
 * a second event rather than a repeat the command silently swallows.
 */
export function wallSurveySheetAuditNote(
  sheet: Pick<WallSurveyImport, "runs" | "cleared" | "details">,
  plan: WallTransportPlan,
  importedAt: string = new Date().toISOString(),
) {
  const byId = new Map(plan.allLinks.map((link) => [link.id, link]));
  const runs = sheet.runs.map((run) => ({ label: byId.get(run.id)?.label ?? run.id, metres: run.metres }));
  const parts = [
    runs.length ? `${runs.length} run${runs.length === 1 ? "" : "s"} (${appliedRunsText(runs)})` : "no measured runs",
  ];
  if (sheet.cleared.length) parts.push(`${sheet.cleared.length} link${sheet.cleared.length === 1 ? "" : "s"} cleared`);
  const installs = sheet.details.filter((entry) => hasWallLinkDetail(entry.detail)).length;
  if (installs) parts.push(`${installs} install line${installs === 1 ? "" : "s"}`);
  return `Survey sheet imported — ${parts.join("; ")}; recorded ${wallSurveyReviewStamp(importedAt)}`;
}

export type WallSurveySheetImport = {
  /** The trail entry's id, so one import can be addressed on its own. */
  id: string;
  /** When the sheet was imported, as the entry stamped it. */
  importedAt: string;
  /** The runs the sheet carried, in the order the note names them. */
  runs: { label: string; metres: number }[];
};

/**
 * The runs part of the note, in the sheet's own `label: N m` wording. A sheet
 * that carried only install detail says `no measured runs`, which is still an
 * import: the panel says what came from paper, including nothing.
 */
const SHEET_RUNS = /(?:\d+\s+runs?\s*\(([^)]*)\)|no measured runs)/;

/**
 * The sheets a project imported, read back off its trail.
 *
 * The trail entry is the only record a paper sheet leaves, and its wording is
 * written by `wallSurveySheetAuditNote` above, so the reading lives beside the
 * writing: one format, one owner. The project's wall panel shows these runs
 * beside the photo review, because a rep checking a length should not have to
 * open Activity to find out which numbers came from paper.
 *
 * Only a sheet entry this parser can read becomes an import; a hand-written or
 * older entry that names no runs draws nothing rather than a guessed list.
 */
export function wallSurveySheetImports(
  entries:
    | readonly { id: string; action: string; detail: string; createdAt: string }[]
    | undefined,
): WallSurveySheetImport[] {
  return (entries ?? []).flatMap((entry) => {
    if (entry.action !== "wall-survey-sheet") return [];
    const noted = SHEET_RUNS.exec(String(entry.detail ?? ""));
    if (!noted) return [];
    const runs = (noted[1] ?? "").split("; ").flatMap((clause) => {
      if (!clause) return [];
      const colon = clause.lastIndexOf(":");
      if (colon < 0) return [];
      const metres = Number.parseFloat(clause.slice(colon + 1));
      if (!Number.isFinite(metres)) return [];
      return [{ label: clause.slice(0, colon).trim(), metres }];
    });
    return [{ id: entry.id, importedAt: entry.createdAt, runs }];
  });
}

/** What the panel says after an import: what landed, and what did not. */
export function surveySummary(sheet: WallSurveyImport, linkCount: number) {
  const parts: string[] = [];
  if (sheet.runs.length) parts.push(`${sheet.runs.length} of ${linkCount} links measured`);
  if (sheet.cleared.length) parts.push(`${sheet.cleared.length} cleared`);
  if (!parts.length) parts.push("No measured runs in this sheet");
  const installs = sheet.details.filter((entry) => hasWallLinkDetail(entry.detail)).length;
  const installNote = installs
    ? ` ${installs} display link${installs === 1 ? "" : "s"} recorded housing, termination or run entry.`
    : "";
  return [parts.join(", ") + "." + installNote, ...sheet.problems].join(" ");
}
