import { wallElevationCaption, wallElevationGeometry, wallElevationKey, wallElevationSvg } from "./wallElevation";
import { WALL_SURVEY_COLUMN_KEY, wallSurveyRows, type WallSurveyRow } from "./wallSurvey";
import type { WallRequirements } from "./videowallOptions";
import type { WallVisualLayout } from "./videowallVisual";
import {
  cleanDetailText,
  hasWallLinkDetail,
  type WallTransportPlan,
} from "./videowallTransport";

/**
 * The sheet a surveyor takes into the room: the agreed wall drawn to its
 * millimetre dimensions, then one printed row per physical link with its design
 * allowance, its cable limit and a blank box for the run measured on site.
 *
 * It prints before the design is final — the values written on it are what gets
 * entered afterwards, through the survey sheet import, a photo of the filled
 * sheet (`wallSurveyScan.ts`), or by hand — so every row stays blank for writing
 * even when the design already holds a recorded run.
 *
 * A display link carries the display housing, display mount, termination and
 * run entry. Source links carry run measurements only. Mount is recorded once
 * per display and shown on the display row, so several links never multiply it.
 */

export type WallSurveyWorksheetOptions = {
  /** Shown in the header; omit to leave the project line for writing. */
  projectName?: string;
  /** ISO timestamp stamped in the footer. */
  generatedAt?: string;
};

const GROUP_TITLE: Record<WallSurveyRow["group"], string> = {
  source: "Sources → head end",
  display: "Head end → displays",
};

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function detailBox(label: string, field: string, value: string | undefined) {
  return `<span class="detail-field"><span class="detail-label">${label}</span><span class="detail-box" data-detail="${field}">${escapeHtml(cleanDetailText(value))}</span></span>`;
}

function worksheetRow(row: WallSurveyRow) {
  return `<tr>
            <th scope="row"><span class="link">${escapeHtml(row.link)}</span><span class="id">${escapeHtml(row.id)}</span></th>
            <td>${escapeHtml(row.cable)}</td>
            <td class="num">${row.allowanceMetres} m</td>
            <td class="num">${row.limitMetres} m</td>
            <td class="num recorded">${row.measuredMetres == null ? "—" : `${row.measuredMetres} m`}</td>
            <td class="capture"><span class="box"></span></td>
            <td class="capture"><span class="rule"></span></td>
          </tr>
          ${row.group === "display" ? `<tr class="detail">
            <th scope="row"><span class="detail-kicker">Install</span></th>
            <td colspan="6">
              ${detailBox("Display housing", "enclosure", row.detail.enclosure)}
              ${detailBox("Mount at display", "display-mount", row.mount)}
              ${detailBox("Termination at display", "termination", row.detail.termination)}
              ${detailBox("Run entry at display", "entry", row.detail.entry)}
            </td>
          </tr>` : ""}`;
}

/**
 * The table's own vocabulary, explained once on the sheet.
 *
 * A surveyor reads this page in the room with no builder open, so the numbers
 * beside each link have to say what they are: the allowance a blank box falls
 * back to, the limit the cable cannot pass, and the run the design already
 * holds. It prints above the rows rather than as a fourth column, because every
 * row reads the same three words.
 */
function columnKeyMarkup() {
  const entries = WALL_SURVEY_COLUMN_KEY
    .map((entry) => `<div data-column-key="${entry.key}"><dt>${entry.label}</dt><dd>${entry.text} ${entry.sheet}</dd></div>`)
    .join("\n        ");
  return `<dl class="column-key" data-wall-column-key aria-label="What the columns mean">
        ${entries}
      </dl>`;
}

/**
 * The drawing's two type sizes, in the sheet's own words.
 *
 * The surveyor is the first person to read this drawing away from the screen,
 * so the sheet carries the same key the builder and the proposal print: small
 * numbers are panels, large numbers the source each window carries. It reads
 * `wallElevationKey`, so a canvas or a dense array leaves out the panel entry it
 * draws no numbers for.
 */
function drawingKeyMarkup(layout: WallVisualLayout) {
  const items = wallElevationKey(layout)
    .map((item) => `<li data-wall-key="${item.kind}"><span class="wall-key-mark wall-key-mark--${item.kind}" aria-hidden="true">${item.mark}</span>${escapeHtml(item.text)}</li>`)
    .join("");
  return `<ul class="wall-key" data-wall-key-list aria-label="Drawing key">${items}</ul>`;
}

function worksheetGroup(group: WallSurveyRow["group"], rows: WallSurveyRow[], columns: number) {
  const members = rows.filter((row) => row.group === group);
  if (!members.length) return "";
  return `<tbody>
          <tr class="group"><th scope="colgroup" colspan="${columns}">${GROUP_TITLE[group]}</th></tr>
          ${members.map(worksheetRow).join("\n          ")}
        </tbody>`;
}

/** The full printable document, self-contained so it prints outside the app. */
export function buildWallSurveyWorksheet(
  requirements: WallRequirements,
  plan: WallTransportPlan,
  options: WallSurveyWorksheetOptions = {},
) {
  const rows = wallSurveyRows(plan, requirements.linkDetails, requirements.displayMounts);
  const geometry = wallElevationGeometry(requirements);
  const columns = 7;
  const generated = formatDate(options.generatedAt ?? new Date().toISOString());
  const summary = `${geometry.layout.arrayLabel} · ${geometry.layout.pixelsLabel} · ${geometry.layout.windowLabel}`;
  const project = options.projectName?.trim() ? escapeHtml(options.projectName.trim()) : "";
  const measured = rows.filter((row) => row.measuredMetres != null).length;
  // The drawing is sized from the wall it shows, so a wide wall stays wide and a
  // tall wall stays tall instead of being letterboxed inside a fixed box. Its
  // millimetre dimensions sit in the caption at reading size rather than in
  // 1.5 mm type beside the panels.
  const drawingHeightMm = 58;
  const drawingWidthMm = Math.min(150, Math.round((geometry.frame.width / geometry.frame.height) * drawingHeightMm));
  const recordedNote = measured
    ? ` ${measured} of ${rows.length} links already hold a recorded run, printed for reference only.`
    : "";
  const detailed = rows.filter((row) => row.group === "display" && (hasWallLinkDetail(row.detail) || row.mount)).length;
  const detailNote = detailed
    ? ` ${detailed} of ${rows.length} display links already carry display-end detail, printed faintly inside its box.`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Wall measurement worksheet${project ? ` — ${project}` : ""}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef1f3; color: #14181c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10pt; line-height: 1.45; }
    .sheet { width: 210mm; min-height: 297mm; margin: 10mm auto; padding: 16mm 14mm; background: #fff; box-shadow: 0 6px 24px #0b1a2450; }
    .kicker { margin: 0; color: #5b7686; font-size: 8pt; letter-spacing: .16em; text-transform: uppercase; }
    h1 { margin: 2pt 0 3pt; font-size: 19pt; letter-spacing: -.01em; }
    .lede { margin: 0; color: #3f5563; font-size: 9pt; }
    .lede + .lede { margin-top: 2pt; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4pt 16pt; margin: 9pt 0 2pt; padding: 6pt 9pt; border: 1px solid #d5dee3; border-radius: 4pt; }
    .meta div { display: grid; gap: 0; }
    .meta dt { color: #5b7686; font-size: 7pt; letter-spacing: .08em; text-transform: uppercase; }
    .meta dd { margin: 0; min-height: 11pt; border-bottom: 1px dotted #b6c3cb; }
    h2 { margin: 10pt 0 4pt; font-size: 11pt; }
    figure { margin: 0; padding: 6pt; border: 1px solid #d5dee3; border-radius: 4pt; }
    .drawing { margin: 0 auto; }
    .drawing svg { display: block; width: 100%; height: auto; }
    .wall-key { display: flex; flex-wrap: wrap; gap: 2pt 10pt; margin: 4pt 0 0; padding: 0; list-style: none; color: #3f5563; font-size: 7.5pt; }
    .wall-key li { display: inline-flex; align-items: center; gap: 3pt; }
    .wall-key-mark { display: inline-flex; align-items: center; justify-content: center; min-width: 11pt; height: 11pt; padding: 0 2pt; border: 1px solid #aebbc4; border-radius: 2pt; color: #14181c; font-weight: 700; }
    .wall-key-mark--panel { font-size: 6.5pt; }
    .wall-key-mark--window { font-size: 8pt; }
    figcaption { margin-top: 4pt; color: #5b7686; font-size: 7.5pt; }
    .note { margin: 0 0 6pt; color: #3f5563; font-size: 8pt; }
    .column-key { display: grid; gap: 2pt; margin: 0 0 6pt; padding: 5pt 7pt; border: 1px solid #d5dee3; border-radius: 4pt; break-inside: avoid; }
    .column-key div { display: grid; grid-template-columns: 19mm 1fr; gap: 6pt; align-items: baseline; }
    .column-key dt { color: #2a6b74; font-size: 7pt; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
    .column-key dd { margin: 0; color: #3f5563; font-size: 7.5pt; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    th, td { padding: 2.5pt 6pt; border-bottom: 1px solid #e3e9ec; text-align: left; vertical-align: middle; }
    thead th { border-bottom: 1px solid #aebbc4; color: #3f5563; font-size: 7.5pt; letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
    tbody th { font-weight: 600; }
    .link { display: block; }
    .id { display: block; color: #7c919d; font-size: 7pt; font-weight: 400; letter-spacing: .04em; }
    .group th { padding-top: 7pt; border-bottom: 1px solid #aebbc4; color: #2a6b74; font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; }
    .num { white-space: nowrap; }
    .recorded { color: #7c919d; }
    .capture { padding-right: 0; }
    .box { display: block; width: 22mm; height: 14pt; border: 1px solid #aebbc4; border-radius: 2pt; }
    .rule { display: block; width: 100%; min-width: 28mm; height: 14pt; border-bottom: 1px solid #c9d4da; }
    tr.detail { break-before: avoid; }
    tr.detail th, tr.detail td { padding-top: 0; padding-bottom: 4pt; }
    .detail-kicker { color: #5b7686; font-size: 6.5pt; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; }
    .detail-field { display: inline-flex; align-items: center; gap: 3pt; margin-right: 9pt; }
    .detail-label { color: #5b7686; font-size: 6.5pt; letter-spacing: .06em; text-transform: uppercase; }
    .detail-box { display: inline-block; min-width: 24mm; height: 13pt; padding: 0 3pt; border: 1px solid #aebbc4; border-radius: 2pt; color: #7c919d; font-size: 7.5pt; }
    .notes { break-inside: avoid; }
    .lines { display: grid; gap: 12pt; margin-top: 2pt; }
    .lines span { display: block; height: 1pt; border-bottom: 1px solid #c9d4da; }
    .signoff { display: grid; grid-template-columns: 1.2fr 1.2fr .8fr; gap: 16pt; margin-top: 12pt; break-inside: avoid; }
    .signoff span { display: block; color: #5b7686; font-size: 7pt; letter-spacing: .08em; text-transform: uppercase; }
    .signoff i { display: block; height: 18pt; border-bottom: 1px solid #8c9ba5; }
    .foot { margin-top: 8pt; padding-top: 5pt; border-top: 1px solid #e3e9ec; color: #7c919d; font-size: 7pt; }
    .print { position: fixed; right: 18pt; bottom: 18pt; padding: 9pt 16pt; border: 1px solid #2a6b74; border-radius: 6pt; background: #123945; color: #eaf6f8; font: inherit; font-size: 9pt; cursor: pointer; }
    @media print {
      body { background: #fff; }
      .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header>
      <p class="kicker">Site measurement</p>
      <h1>Wall measurement worksheet</h1>
      <p class="lede">${escapeHtml(summary)}</p>
      <p class="lede">${escapeHtml(plan.headline)}</p>
    </header>

    <dl class="meta">
      <div><dt>Project</dt><dd>${project}</dd></div>
      <div><dt>Site / room</dt><dd></dd></div>
      <div><dt>Surveyor</dt><dd></dd></div>
      <div><dt>Date</dt><dd></dd></div>
    </dl>

    <h2>Agreed wall</h2>
    <figure>
      <div class="drawing" style="width:${drawingWidthMm}mm">${wallElevationSvg(requirements, { dimensions: false })}</div>
      ${drawingKeyMarkup(geometry.layout)}
      <figcaption>${escapeHtml(wallElevationCaption(geometry.layout, geometry.overlay))}</figcaption>
    </figure>

    <h2>Capture every run</h2>
    <p class="note">Write each measured run in metres in its box and leave the box blank when a run cannot be measured on site; a blank keeps the design allowance. Under each display link, record the display housing, termination at the display and run entry. Record the mount once on the display row.${recordedNote}${detailNote}</p>
    ${columnKeyMarkup()}
    <table>
      <thead>
        <tr>
          <th scope="col">Link</th>
          <th scope="col">Cable</th>
          <th scope="col">Allowance</th>
          <th scope="col">Limit</th>
          <th scope="col">In design</th>
          <th scope="col">Measured run (m)</th>
          <th scope="col">Note</th>
        </tr>
      </thead>
      ${worksheetGroup("source", rows, columns)}
      ${worksheetGroup("display", rows, columns)}
    </table>

    <section class="notes">
      <h2>Site notes</h2>
      <div class="lines" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
    </section>

    <div class="signoff">
      <div><span>Surveyor</span><i></i></div>
      <div><span>Signature</span><i></i></div>
      <div><span>Date</span><i></i></div>
    </div>

    <p class="foot">${rows.length} links · allowances and limits from the saved wall design · generated ${escapeHtml(generated)}</p>
  </main>
  <button class="print no-print" type="button" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;
}

/**
 * Open the worksheet in a tab and hand it to the browser's print dialog, so it
 * can be printed or saved as a PDF before the design is finalised.
 */
export function printWallSurveyWorksheet(
  requirements: WallRequirements,
  plan: WallTransportPlan,
  options: WallSurveyWorksheetOptions = {},
) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) {
    throw new Error("Allow pop-ups for this site to print the measurement worksheet.");
  }
  printWindow.document.write(buildWallSurveyWorksheet(requirements, plan, options));
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}
