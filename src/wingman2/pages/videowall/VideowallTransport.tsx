import { useState } from "react";
import {
  appliedRunText,
  mergeDisplayMounts,
  mergeSurveyDetails,
  mergeSurveyRuns,
  parseWallSurveyCsv,
  surveySummary,
  wallSurveyCsv,
  wallSurveySheetAuditNote,
} from "../../lib/wallSurvey";
import {
  applyWallSurveyDetails,
  applyWallSurveyDisplayMounts,
  applyWallSurveyScan,
  editWallSurveyScan,
  readWallSurveyPhotos,
  scanConfidenceTone,
  surveyMetres,
  surveyScanSummary,
  type WallPhotoProgress,
  type WallSurveyScan,
  type WallSurveyScanEdit,
  type WallSurveyScanReading,
} from "../../lib/wallSurveyScan";
import {
  wallSurveyReviewFlagText,
  wallSurveyReviewFrom,
  wallSurveyReviewStamp,
  wallSurveyReviewSummary,
  type WallSurveyReview,
  type WallSurveyReviewFlag,
} from "../../lib/wallSurveyReview";
import { printWallSurveyWorksheet } from "../../lib/wallSurveyWorksheet";
import type { WallRequirements } from "../../lib/videowallOptions";
import { wallPanelCount, wallProjectorCount } from "../../lib/videowallOptions";
import {
  WALL_LINK_DETAIL_FIELDS,
  applyWallTransportFix,
  cleanDetailText,
  hasWallLinkDetail,
  runAllowanceWarning,
  wallLinkDetailText,
  wallTransportFixLabel,
  withWallLinkDetails,
  type WallLinkDetail,
  type WallLinkDetailField,
  type WallTransportLink,
  type WallTransportPlan,
  type WallTransportStatus,
} from "../../lib/videowallTransport";

const STATUS_LABEL: Record<WallTransportStatus, string> = {
  ok: "Within limit",
  watch: "Watch",
  limit: "Over limit",
};

const DETAIL_LABEL: Record<WallLinkDetailField, string> = {
  enclosure: "Display housing",
  termination: "Termination",
  entry: "Run entry",
};

/**
 * What every cable in the design has to carry: payload bandwidth per link, the
 * run allowance for its transport and where that link exceeds a practical
 * limit. Each row accepts the run measured on site; a measured value replaces
 * the design allowance for that link, and the flag names the exact link.
 *
 * A surveyor can also take the whole sheet away: the download holds one row per
 * physical link (never a folded group), with the measured run and the install
 * display-end detail — housing, termination and run entry — plus one mount per
 * display the surveyor writes
 * beside it, and
 * importing it applies all of it in one step, so a room can be walked and
 * measured before anyone types a number. A filled worksheet can come back as a
 * photo instead of a file: the runs and install detail read from it come back as
 * rows for review, each with the confidence the reader gave it, and only the
 * rows a rep accepts are applied. Every link the photo did not give up is named
 * so it can be typed rather than cleared.
 *
 * Applying the reviewed rows also records the review on the design: each row the
 * reader offered, the run it read and whether the rep took it or cleared it, so
 * the saved wall can account for the runs it carries long after the sheet is
 * filed away. A run the rep typed is checked against the allowance printed for
 * its link before it lands, and one far from it is marked where it was typed and
 * kept on the review as the doubt it was, so the project's record marks the same
 * row afterwards.
 */
export function VideowallTransport({
  plan,
  requirements,
  measuredRuns,
  linkDetails,
  displayMounts,
  onMeasure,
  onMeasuredRuns,
  onLinkDetails,
  onDisplayMounts,
  surveyReview,
  onSurveyReview,
  onSheetImported,
  onRequirementsChange,
}: {
  plan: WallTransportPlan;
  /** The saved design, needed to draw the printable worksheet. */
  requirements?: WallRequirements;
  measuredRuns?: Record<string, number>;
  /** Display housing, termination and run entry recorded per display link. */
  linkDetails?: Record<string, WallLinkDetail>;
  /** Mount recorded once per display. */
  displayMounts?: Record<string, string>;
  onMeasure?: (ids: string[], metres: number | null) => void;
  onMeasuredRuns?: (measuredRuns: Record<string, number>) => void;
  /** Receives the whole map, like `onMeasuredRuns`, for typing and both imports. */
  onLinkDetails?: (linkDetails: Record<string, WallLinkDetail>) => void;
  onDisplayMounts?: (displayMounts: Record<string, string>) => void;
  /** The review already stored on the design, shown back as its audit trail. */
  surveyReview?: WallSurveyReview;
  /** Present when the design can keep the review the rep just acted on. */
  onSurveyReview?: (surveyReview: WallSurveyReview) => void;
  /** A paper sheet landed; the builder keeps its note until the design saves. */
  onSheetImported?: (note: string) => void;
  /**
   * Whole requirements back after a cable change, when the design can keep it.
   * Present only where the caller owns the answers; the proposal's gate takes
   * the same shape.
   */
  onRequirementsChange?: (next: WallRequirements) => void;
}) {
  const [photoProgress, setPhotoProgress] = useState<WallPhotoProgress[]>([]);
  const [surveyNote, setSurveyNote] = useState("");
  // What the last apply wrote, one entry per link. Held apart from the note so a
  // wall with a dozen links reads back as a list rather than one sentence of
  // counts, and so any other status message replaces it.
  const [surveyLanded, setSurveyLanded] = useState<{ id: string; text: string }[]>([]);
  const [readingPhoto, setReadingPhoto] = useState(false);
  // Development only: asks a development server for its sample transcription,
  // so the review, apply and reopen steps can be walked without a model key.
  const [samplePhotoRead, setSamplePhotoRead] = useState(false);
  // A photo read is held here until a rep has checked its rows: the design is
  // never changed by the reader itself, and a row the rep corrects is applied
  // corrected rather than landed first and repaired afterwards. A corrected run
  // is kept as the text typed, so a half-typed "7." does not snap back.
  const [review, setReview] = useState<{
    scan: WallSurveyScan;
    rejected: string[];
    edits: Record<string, { metresText?: string; detail?: WallLinkDetail; displayMountText?: string }>;
  } | null>(null);

  const groups = [
    { key: "source", title: "Sources → head end", links: plan.links.filter((link) => link.group === "source") },
    { key: "display", title: "Head end → displays", links: plan.links.filter((link) => link.group === "display") },
  ];
  const displayCount = requirements?.application === "projection"
    ? wallProjectorCount(requirements)
    : requirements ? wallPanelCount(requirements) : 0;

  // A folded row stands for several links, so it shows a measured run only when
  // every member shares the same value.
  function measuredValue(link: WallTransportLink) {
    const values = link.memberIds
      .map((id) => measuredRuns?.[id])
      .filter((value): value is number => typeof value === "number" && value > 0);
    if (values.length === 0) return "";
    return values.length === link.memberIds.length && values.every((value) => value === values[0]) ? values[0] : "";
  }

  // The same rule for install detail: one shared value reads back, members that
  // disagree read as mixed instead of naming one member's text as the row's.
  function detailValue(link: WallTransportLink, field: WallLinkDetailField) {
    const values = link.memberIds.map((id) => cleanDetailText(linkDetails?.[id]?.[field]));
    return values.every((value) => value === values[0]) ? values[0] : "";
  }

  function detailMixed(link: WallTransportLink, field: WallLinkDetailField) {
    return new Set(link.memberIds.map((id) => cleanDetailText(linkDetails?.[id]?.[field]))).size > 1;
  }

  /** Distinct install lines a folded row covers, for the read-only table. */
  function foldedDetail(link: WallTransportLink) {
    const texts = [...new Set(link.memberIds.map((id) => wallLinkDetailText(linkDetails?.[id], displayMounts?.[id])).filter(Boolean))];
    return texts.join(" / ");
  }

  /** A status message replaces the landed list: one reading at a time. */
  function note(text: string) {
    setSurveyNote(text);
    setSurveyLanded([]);
  }

  function downloadSurvey() {
    if (typeof URL.createObjectURL !== "function") {
      note("This browser cannot save the sheet; measure each link in the table instead.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([wallSurveyCsv(plan, linkDetails, displayMounts)], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wall-survey.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    note(`Survey sheet saved with ${plan.allLinks.length} links.`);
  }

  function printWorksheet() {
    if (!requirements) return;
    try {
      printWallSurveyWorksheet(requirements, plan);
      note("");
    } catch (error) {
      note(error instanceof Error ? error.message : "The worksheet could not be opened.");
    }
  }

  async function importSurvey(file: File | undefined) {
    if (!file) return;
    const sheet = parseWallSurveyCsv(await file.text(), plan);
    if (onMeasuredRuns && (sheet.runs.length || sheet.cleared.length)) {
      onMeasuredRuns(mergeSurveyRuns(measuredRuns, sheet) ?? {});
    }
    if (onLinkDetails && sheet.details.length) {
      onLinkDetails(mergeSurveyDetails(linkDetails, sheet) ?? {});
    }
    if (onDisplayMounts && Object.keys(sheet.displayMounts).length) {
      onDisplayMounts(mergeDisplayMounts(displayMounts, sheet.displayMounts) ?? {});
    }
    note(surveySummary(sheet, plan.allLinks.length));
    // The builder keeps the note until the design saves: the trail describes
    // runs the project holds, so a sheet imported into a wall nobody saved
    // must not leave an entry claiming them.
    onSheetImported?.(wallSurveySheetAuditNote(sheet, plan));
  }

  async function importWorksheetPhotos(files: File[]) {
    if (!files.length || readingPhoto) return;
    setPhotoProgress(files.map((file, index) => ({ index, fileName: file.name, state: "queued" })));
    setReadingPhoto(true);
    note(files.length === 1 ? "Reading the worksheet photo..." : `Reading ${files.length} worksheet photos...`);
    try {
      // Several photos are one review: the reader's rows are merged before any
      // rep sees them, and only the rows a rep accepts reach the design.
      const { scan, failures } = await readWallSurveyPhotos(files, plan, (progress) => setPhotoProgress((current) => current.map((item) => item.index === progress.index ? progress : item)), { mock: samplePhotoRead });
      setReview(scan.readings.length ? { scan, rejected: [], edits: {} } : null);
      const count = scan.readings.length;
      const source = scan.photoCount > 1 ? `${scan.photoCount} photos` : "the photo";
      const prompt = count
        ? `Read ${count} row${count === 1 ? "" : "s"} from ${source}. Check each row's confidence, clear any that look wrong, then apply.`
        : surveyScanSummary(scan, plan.allLinks.length);
      const failureNote = failures.length
        ? ` Could not read ${failures.map((failure) => `${failure.fileName} (${failure.message})`).join(", ")}.`
        : "";
      note(`${scan.problems.length ? `${prompt} ${scan.problems.join(" ")}` : prompt}${failureNote}`);
    } catch (error) {
      setReview(null);
      note(error instanceof Error ? error.message : "The worksheet photos could not be read.");
    } finally {
      setReadingPhoto(false);
    }
  }

  function toggleReading(id: string, accepted: boolean) {
    setReview((current) =>
      current
        ? {
            ...current,
            rejected: accepted ? current.rejected.filter((value) => value !== id) : [...current.rejected, id],
          }
        : current,
    );
  }

  function updateEdit(id: string, patch: { metresText?: string; detail?: WallLinkDetail; displayMountText?: string }) {
    setReview((current) => {
      if (!current) return current;
      const previous = current.edits[id] ?? {};
      return {
        ...current,
        edits: {
          ...current.edits,
          [id]: {
            ...previous,
            ...patch,
            // Install cells patch one field at a time, so a correction to the
            // display housing does not drop the mount the reader also saw.
            detail: patch.detail ? { ...previous.detail, ...patch.detail } : previous.detail,
          },
        },
      };
    });
  }

  // What the rep typed, read by the same rules as a cell on the photo: "7,5"
  // and "7.5 m" are the same run, and an emptied box drops the row's value.
  function scanEdits(edits: Record<string, { metresText?: string; detail?: WallLinkDetail; displayMountText?: string }>) {
    return Object.fromEntries(
      Object.entries(edits).map(([id, edit]) => [
        id,
        {
          ...(edit.metresText === undefined ? {} : { metres: surveyMetres(edit.metresText) }),
          ...(edit.detail ? { detail: edit.detail } : {}),
          ...(edit.displayMountText === undefined ? {} : { displayMount: edit.displayMountText }),
        } satisfies WallSurveyScanEdit,
      ]),
    );
  }

  // The rows as they will be applied once the rep applies them: the read value
  // for every row left alone, the corrected one for every row they touched.
  const reviewedScan = review ? editWallSurveyScan(review.scan, scanEdits(review.edits)) : null;

  // The rows a rep has left accepted; the rest keep whatever the design holds.
  const accepted = reviewedScan
    ? reviewedScan.readings.filter((reading) => !review?.rejected.includes(reading.id))
    : [];
  // A row that will write something; an accepted row the photo left blank has
  // nothing to land, and leaves its link to type instead.
  const acceptedRuns = accepted.filter((reading) => reading.metres != null).length;
  const acceptedDetails = accepted.filter((reading) =>
    plan.allLinks.some((link) => link.id === reading.id && link.group === "display") && hasWallLinkDetail(reading.detail),
  ).length;
  const acceptedMounts = accepted.filter((reading) => Boolean(reading.displayMount)
    || review?.edits[reading.id]?.displayMountText !== undefined).length;

  const allowanceById = new Map(plan.allLinks.map((link) => [link.id, link.allowanceMetres]));

  /**
   * The doubt a hand-typed run earns: the warning the cell shows, and the
   * numbers the review keeps.
   *
   * Only a run a person supplied is checked here. A run the photo read was
   * checked when it was read, and one a rep typed over it is exactly the case
   * the rule names: a number twice the printed allowance is a decimal point or
   * a row typed into the wrong box, so it is flagged before it lands rather
   * than explained after it has.
   */
  function typedRunDoubt(reading: WallSurveyScanReading) {
    if (reading.metres == null) return null;
    const allowanceMetres = allowanceById.get(reading.id);
    if (allowanceMetres == null) return null;
    const typed = reading.typed === true || review?.edits[reading.id]?.metresText !== undefined;
    if (!typed) return null;
    const text = runAllowanceWarning(reading.metres, allowanceMetres);
    return text
      ? { text, flag: { id: reading.id, label: reading.label, metres: reading.metres, allowanceMetres } }
      : null;
  }

  // Only accepted rows are flagged: a cleared row's number does not land, so
  // it is not a run the record has to explain later.
  const flaggedRuns = accepted
    .map((reading) => typedRunDoubt(reading)?.flag)
    .filter((flag): flag is WallSurveyReviewFlag => Boolean(flag));
  const flaggedRunText = flaggedRuns.slice(0, 3).map(wallSurveyReviewFlagText).join("; ");
  const flaggedRunSummary = `${flaggedRuns.length} typed run${flaggedRuns.length === 1 ? "" : "s"} outside the printed allowance${flaggedRuns.length ? ` (${flaggedRunText}${flaggedRuns.length > 3 ? ` and ${flaggedRuns.length - 3} more` : ""})` : ""}`;

  function applyReviewedScan() {
    if (!review || !reviewedScan || !accepted.length) return;
    const ids = accepted.map((reading) => reading.id);
    if (onMeasuredRuns && acceptedRuns) {
      onMeasuredRuns(applyWallSurveyScan(measuredRuns, reviewedScan, ids) ?? {});
    }
    if (onLinkDetails && acceptedDetails) {
      const displayReview = {
        ...reviewedScan,
        readings: reviewedScan.readings.filter((reading) =>
          plan.allLinks.some((link) => link.id === reading.id && link.group === "display"),
        ),
      };
      onLinkDetails(applyWallSurveyDetails(linkDetails, displayReview, ids) ?? {});
    }
    if (onDisplayMounts && acceptedMounts) {
      const clearedMounts = ids.filter((id) => review.edits[id]?.displayMountText !== undefined && !reviewedScan.displayMounts[id]);
      onDisplayMounts(applyWallSurveyDisplayMounts(displayMounts, reviewedScan, ids, clearedMounts) ?? {});
    }
    // The decision itself is the record: a rejected row keeps the run it was
    // read at, and a corrected row keeps both runs, so the design can show what
    // was cleared or typed over, not only what landed.
    if (onSurveyReview) {
      // The numbers, not the warning sentence: the trail words the run itself,
      // so the note it prints and the cell a rep saw say the same thing.
      onSurveyReview(wallSurveyReviewFrom(reviewedScan, ids, new Date().toISOString(), review.scan, flaggedRuns));
    }
    // What landed, named link by link: a wall with a dozen links reads back as a
    // list the rep can scan, where one sentence could only report counts. Each
    // line is the shared `appliedRunText`, the same words the sheet's trail uses.
    const landed = accepted
      .filter((reading) => reading.metres != null || hasWallLinkDetail(reading.detail) || reading.displayMount)
      .map((reading) => {
        const read = review.scan.readings.find((candidate) => candidate.id === reading.id);
        // A row the rep typed over says so, because the line records what was
        // checked, not only what the photo offered.
        const corrected = !read
          || read.metres !== reading.metres
          || wallLinkDetailText(read.detail) !== wallLinkDetailText(reading.detail);
        const mountCorrected = read?.displayMount !== reading.displayMount;
        return {
          id: reading.id,
          text: `${[appliedRunText(reading), reading.displayMount ? `Mount: ${reading.displayMount}` : ""].filter(Boolean).join(" · ")}${corrected || mountCorrected ? " (corrected)" : ""}`,
        };
      });
    // What did not land keeps its own short line: a rejected row was a decision,
    // and a link no photo made out is still work on site.
    const notes = [
      ...(review.rejected.length ? [`${review.rejected.length} rejected`] : []),
      ...(onSurveyReview ? ["review recorded on the design"] : []),
      // The same numbers the trail keeps, in the words it prints them: a run
      // nobody checked is what the record has to be able to explain.
      ...(flaggedRuns.length ? [flaggedRunSummary] : []),
      ...(review.scan.unread.length ? [`still to type: ${review.scan.unread.join(", ")}`] : []),
    ];
    setSurveyNote(notes.join(" · "));
    setSurveyLanded(landed);
    setReview(null);
  }

  function discardScan() {
    setReview(null);
    note("Photo reading discarded. The design was not changed.");
  }

  return (
    <section onDragOver={(event) => { if (onMeasuredRuns) event.preventDefault(); }} onDrop={(event) => { if (!onMeasuredRuns) return; event.preventDefault(); void importWorksheetPhotos(Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"))); }} className="vw-transport" data-testid="videowall-transport" aria-labelledby="vw-transport-title">
      <header className="vw-transport-head">
        <div>
          <p className="vw-transport-kicker">Transport estimate</p>
          <h2 id="vw-transport-title">Bandwidth and cable length</h2>
        </div>
        <p className="vw-transport-headline">{plan.headline}</p>
      </header>

      <ul className="vw-transport-counts" aria-label="Link status">
        <li data-status="ok">{plan.counts.ok} within limit</li>
        <li data-status="watch">{plan.counts.watch} watch</li>
        <li data-status="limit">{plan.counts.limit} over limit</li>
      </ul>

      {onMeasuredRuns ? (
        <div className="vw-transport-survey">
          <div className="vw-transport-survey-actions">
            <button type="button" data-testid="videowall-survey-download" onClick={downloadSurvey}>
              Download survey sheet
            </button>
            {requirements ? (
              <button type="button" data-testid="videowall-survey-print" onClick={printWorksheet}>
                Print worksheet
              </button>
            ) : null}
            <label className="vw-transport-survey-file">
              <span>Import measurements</span>
              <input
                type="file"
                accept=".csv,text/csv"
                data-testid="videowall-survey-import"
                onChange={(event) => {
                  void importSurvey(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <label className="vw-transport-survey-file">
              <span>{readingPhoto ? "Reading photos..." : "Read worksheet photos"}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={readingPhoto}
                data-testid="videowall-survey-photo"
                onChange={(event) => {
                  // Copy the selection before clearing the input, so every photo
                  // in the batch is still readable when the first one finishes.
                  void importWorksheetPhotos(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {import.meta.env.DEV ? (
            <label className="vw-transport-basis" title="Development only: answers with sample rows instead of reading the photo, so the review and apply steps can be walked without a model key.">
              <input
                type="checkbox"
                checked={samplePhotoRead}
                data-testid="videowall-survey-photo-mock"
                onChange={(event) => setSamplePhotoRead(event.target.checked)}
              />{" "}
              Use a sample reading (development only — no model call)
            </label>
          ) : null}
          <p className="vw-transport-basis">
            Print the worksheet to capture runs on paper, or fill the sheet's measured run in metres and import it to
            apply every run at once; the sheet lists every link once with its allowance and cable limit, and a blank
            run clears that link. Display rows record housing, termination and run entry. A mount cell appears once per
            display, and importing the sheet brings each answer back to its display. One or more photographs of the filled sheets read the written runs and install detail back onto
            their link ids as a single review: each row shows the confidence the reader gave it, only the rows you
            accept are applied, and every link no photo could make out becomes one short list to type. A blank row
            keeps the design allowance, and a run or install cell can be corrected in the list before you apply it so
            the design only ever sees the value you checked.
          </p>
          {surveyNote || surveyLanded.length ? (
            <div className="vw-transport-basis" role="status" data-testid="videowall-survey-status">
              {surveyNote ? <p>{surveyNote}</p> : null}
              {surveyLanded.length ? (
                <ul className="vw-transport-landed" data-testid="videowall-survey-landed" aria-label="What landed on the design">
                  {surveyLanded.map((line) => (
                    <li key={line.id} data-landed-link={line.id}>{line.text}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {review ? (
            <div className="vw-transport-review" data-testid="videowall-scan-review">
              <h3>{review.scan.photoCount > 1 ? "Review the photo readings" : "Review the photo reading"}</h3>
              {review.scan.summary ? <p className="vw-transport-basis">{review.scan.summary}</p> : null}
              <div className="vw-transport-table-wrap">
                <table>
                  <caption>
                    Rows read from {review.scan.photoCount > 1 ? "the photos" : "the photo"}. Correct a run or an install
                    cell here to apply the value you type, or clear the row to keep the design value for that link.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Accept</th>
                      <th scope="col">Link</th>
                      <th scope="col">Run</th>
                      <th scope="col">Confidence</th>
                      <th scope="col">Install detail</th>
                      <th scope="col">Reader note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reviewedScan?.readings ?? []).map((reading) => {
                      const kept = !review.rejected.includes(reading.id);
                      const read = review.scan.readings.find((candidate) => candidate.id === reading.id);
                      const metresText = review.edits[reading.id]?.metresText
                        ?? (read?.metres == null ? "" : String(read.metres));
                      const mountText = review.edits[reading.id]?.displayMountText ?? read?.displayMount ?? "";
                      const edited = review.edits[reading.id] !== undefined;
                      // The doubt is read here, once: the cell and its warning
                      // come from the same number the apply will carry.
                      const doubt = kept ? typedRunDoubt(reading) : null;
                      return (
                        <tr
                          key={reading.id}
                          data-accepted={kept ? "yes" : "no"}
                          data-edited={edited ? "yes" : "no"}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={kept}
                              aria-label={`Accept scan for ${reading.label}`}
                              onChange={(event) => toggleReading(reading.id, event.target.checked)}
                            />
                          </td>
                          <th scope="row">
                            {reading.label}
                            <span className="vw-transport-basis">{reading.id}</span>
                          </th>
                          <td>
                            <input
                              type="number"
                              min={1}
                              step={0.5}
                              inputMode="decimal"
                              className="vw-transport-measure"
                              aria-label={`Scanned run for ${reading.label} (metres)`}
                              placeholder={read?.metres == null ? "No run" : undefined}
                              value={metresText}
                              onChange={(event) => updateEdit(reading.id, { metresText: event.target.value })}
                            />
                            {read?.metres != null && metresText !== String(read.metres) ? (
                              <span className="vw-transport-basis"> read {read.metres} m</span>
                            ) : null}
                            {doubt ? (
                              <span className="vw-transport-run-warning" data-typed-run-warning>
                                {doubt.text}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <span
                              className={`vw-transport-confidence vw-transport-confidence--${scanConfidenceTone(reading.confidence)}`}
                            >
                              {Math.round(reading.confidence * 100)}%
                            </span>
                          </td>
                          <td>
                            {plan.allLinks.some((link) => link.id === reading.id && link.group === "display") ? <span className="vw-transport-detail">
                              {WALL_LINK_DETAIL_FIELDS.map((field) => (
                                <input
                                  key={field}
                                  type="text"
                                  maxLength={60}
                                  aria-label={`Scanned ${DETAIL_LABEL[field].toLowerCase()} for ${reading.label}`}
                                  placeholder={DETAIL_LABEL[field]}
                                  value={cleanDetailText(reading.detail[field])}
                                  onChange={(event) =>
                                    updateEdit(reading.id, { detail: { [field]: event.target.value } })
                                  }
                                />
                              ))}
                              <input
                                type="text"
                                maxLength={60}
                                aria-label={`Scanned mount for ${reading.label}`}
                                placeholder="Mount at display"
                                value={mountText}
                                onChange={(event) => updateEdit(reading.id, { displayMountText: event.target.value })}
                              />
                            </span> : <span className="vw-transport-basis">Run only · source end</span>}
                          </td>
                          <td>{reading.note || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {review.scan.unread.length ? (
                <p className="vw-transport-basis" data-testid="videowall-scan-unread">
                  Could not be read{review.scan.photoCount > 1 ? " from any photo" : ""}: {review.scan.unread.join(", ")}.
                  Type those runs into the table below.
                </p>
              ) : null}
              {flaggedRuns.length ? (
                <p className="vw-transport-apply-flags" data-testid="videowall-scan-typed-runs">
                  <strong>{flaggedRuns.length} typed run{flaggedRuns.length === 1 ? "" : "s"} outside the printed allowance</strong>
                  {" "}
                  {flaggedRuns.map(wallSurveyReviewFlagText).join("; ")}
                </p>
              ) : null}
              <div className="vw-transport-review-actions">
                <button
                  type="button"
                  data-testid="videowall-scan-apply"
                  disabled={!accepted.length}
                  onClick={applyReviewedScan}
                >
                  Apply {accepted.length} accepted row{accepted.length === 1 ? "" : "s"}
                </button>
                <button type="button" data-testid="videowall-scan-discard" onClick={discardScan}>
                  Discard photo reading
                </button>
              </div>
            </div>
          ) : null}

          {surveyReview ? (
            <div className="vw-transport-review" data-testid="videowall-survey-review">
              <h3>Photo review on this design</h3>
              <p className="vw-transport-basis">
                Recorded{" "}
                <time dateTime={surveyReview.reviewedAt}>{wallSurveyReviewStamp(surveyReview.reviewedAt)}</time>
                {" — "}
                {wallSurveyReviewSummary(surveyReview)}.
              </p>
              <details data-testid="videowall-survey-review-rows">
                <summary>Which rows were taken and which were cleared</summary>
                <div className="vw-transport-table-wrap">
                  <table>
                    <caption>
                      Rows the worksheet photo offered, with the run read and the decision kept on this design.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Link</th>
                        <th scope="col">Run read</th>
                        <th scope="col">Confidence</th>
                        <th scope="col">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveyReview.rows.map((row) => (
                        <tr key={row.id} data-survey-review-row={row.id} data-decision={row.decision}>
                          <th scope="row">
                            {row.label}
                            <span className="vw-transport-basis">{row.id}</span>
                          </th>
                          <td>
                            {row.metres == null ? "No run" : `${row.metres} m`}
                            {row.readMetres != null ? (
                              <span className="vw-transport-basis"> read {row.readMetres} m</span>
                            ) : null}
                          </td>
                          <td>
                            <span
                              className={`vw-transport-confidence vw-transport-confidence--${scanConfidenceTone(row.confidence)}`}
                            >
                              {Math.round(row.confidence * 100)}%
                            </span>
                          </td>
                          <td>{row.decision === "accepted" ? "Accepted" : "Rejected"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          ) : null}
        </div>
      ) : null}

      {onDisplayMounts && displayCount > 0 ? (
        <fieldset className="vw-transport-display-mounts" data-testid="videowall-display-mounts">
          <legend>Display mounts</legend>
          <p className="vw-transport-basis">Record each display’s mount once. Its transport links inherit this value.</p>
          <div className="vw-transport-display-mounts__grid">
            {Array.from({ length: displayCount }, (_, index) => {
              const id = `display-${index + 1}`;
              const label = requirements?.application === "projection" ? `Projector ${index + 1}` : `Panel ${index + 1}`;
              return (
                <label key={id}>
                  <span>{label}</span>
                  <input
                    type="text"
                    maxLength={60}
                    aria-label={`Mount for ${label}`}
                    value={cleanDetailText(displayMounts?.[id])}
                    onChange={(event) => onDisplayMounts({ ...displayMounts, [id]: event.target.value })}
                  />
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="vw-transport-table-wrap">
        <table>
          <caption>Cable, payload, run estimate and display-end detail for every source and display link.</caption>
          <thead>
            <tr>
              <th scope="col">Link</th>
              <th scope="col">Pixels @ rate</th>
              <th scope="col">Bandwidth</th>
              <th scope="col">Cable</th>
              <th scope="col">Length estimate</th>
              <th scope="col">Measured run (m)</th>
              <th scope="col">Display-end survey cells</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key}>
              <tr className="vw-transport-group">
                <th scope="rowgroup" colSpan={8}>{group.title}</th>
              </tr>
              {group.links.map((link) => {
                const measured = measuredValue(link);
                const partial = measured === "" && link.memberIds.some((id) => measuredRuns?.[id] != null);
                const install = foldedDetail(link);
                return (
                <tr key={link.id}>
                  <th scope="row">{link.label}</th>
                  <td>{link.resolution}</td>
                  <td>{link.bandwidth}</td>
                  <td>{link.cable}</td>
                  <td>{link.length}</td>
                  <td>
                    {onMeasure ? (
                      <input
                        type="number"
                        min={1}
                        step={0.5}
                        inputMode="decimal"
                        className="vw-transport-measure"
                        aria-label={`Measured run for ${link.label} (metres)`}
                        placeholder={partial ? "Mixed" : "Allowance"}
                        value={measured}
                        onChange={(event) => onMeasure(link.memberIds, event.target.value === "" ? null : Number(event.target.value))}
                      />
                    ) : (
                      <span className="vw-transport-basis">{link.basis === "measured" ? `${link.runMetres} m` : "Allowance"}</span>
                    )}
                  </td>
                  <td>
                    {link.group === "source" ? <span className="vw-transport-basis">Run only · source end</span> : onLinkDetails ? (
                      <span className="vw-transport-detail">
                        {WALL_LINK_DETAIL_FIELDS.map((field) => (
                          <input
                            key={field}
                            type="text"
                            maxLength={60}
                            aria-label={`${DETAIL_LABEL[field]} for ${link.label}`}
                            placeholder={detailMixed(link, field) ? "Mixed" : DETAIL_LABEL[field]}
                            value={detailValue(link, field)}
                            onChange={(event) =>
                              onLinkDetails(
                                withWallLinkDetails(linkDetails, link.memberIds, { [field]: event.target.value }) ?? {},
                              )
                            }
                          />
                        ))}
                      </span>
                    ) : (
                      <span className="vw-transport-basis">{install || "Not recorded"}</span>
                    )}
                  </td>
                  <td>
                    <span className={`vw-transport-status vw-transport-status--${link.status}`}>
                      {STATUS_LABEL[link.status]}
                    </span>
                    {link.basis === "measured" ? <span className="vw-transport-basis"> measured</span> : null}
                    {/* The fix sits where the overrun is read: one tap swaps the
                        cable to the fibre route that clears it, so the rep does
                        not have to leave the table to make the design fit. */}
                    {link.status === "limit" && requirements && onRequirementsChange ? (
                      <button
                        type="button"
                        className="vw-transport-fix"
                        data-transport-fix={link.id}
                        onClick={() => onRequirementsChange(applyWallTransportFix(requirements, link.id))}
                      >
                        {wallTransportFixLabel(link)}
                      </button>
                    ) : null}
                  </td>
                </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {onMeasure ? (
        <p className="vw-transport-basis">
          Enter the run measured on site for any link; leave it blank to keep the design allowance. Display links record
          the housing, termination and run entry at the screen; each display mount is recorded once above and inherited
          by its links. A folded row writes one value to every link it covers.
        </p>
      ) : null}

      {plan.flags.length > 0 ? (
        <ul className="vw-transport-flags" aria-label="Transport limits">
          {plan.flags.map((flag) => <li key={flag}>{flag}</li>)}
        </ul>
      ) : null}

      <p className="vw-transport-basis">{plan.assumptions.join(" ")}</p>
      {onMeasuredRuns ? <p>Drop worksheet photos here to read them.</p> : null}
      {photoProgress.length ? <ul aria-live="polite">{photoProgress.map((photo) => <li key={photo.index}>{photo.fileName}: {photo.state}{photo.state === "reading" ? <progress aria-label={`Reading ${photo.fileName}`} /> : null}{photo.result ? ` — ${photo.result}` : ""}</li>)}</ul> : null}
    </section>
  );
}
