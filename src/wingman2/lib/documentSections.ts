import type { SalesBomRow } from "./salesReadiness";
import type { DocumentDetail } from "./solutionTemplates";

/**
 * One part of the proposal document.
 *
 * A section is named for what it prints rather than for its heading: the Word
 * quote and the printed customer copy word the same section differently on
 * purpose (Word's `Equipment and Pricing` is the printed `Equipment Schedule`),
 * so the id is the handle both read while each builder writes its own heading.
 * The cover and the document control block are not sections — every document
 * has them, at every level.
 */
export type DocumentSectionId =
  | "executive-summary"
  | "room-at-a-glance"
  | "solution-overview"
  | "practical-operation"
  | "commercial-benefits"
  | "market-and-application-story"
  | "client-objectives"
  | "unresolved-discovery-items"
  | "options"
  | "proposed-solution-and-business-value"
  | "scope-of-work"
  | "display-schedule"
  | "equipment-and-pricing"
  | "services-and-commercial-allowances"
  | "complete-system-design"
  | "third-party-system-scope"
  | "timeline-and-phases"
  | "testing-and-acceptance"
  | "responsibilities-and-dependencies"
  | "assumptions-risks-and-exclusions"
  | "next-steps"
  | "best-efforts-disclaimer"
  | "discovery-conversation"
  | "design-trace"
  | "technical-architecture"
  | "cable-schedule"
  | "products-in-the-solution"
  | "product-specifications"
  | "power-strategy"
  | "technical-appendix";

/**
 * Every section the document can print, with the shallowest detail level that
 * includes it. Both builders read this list — the Word quote and the printed
 * copy — so the sections a level leaves out are the same in both outputs, and
 * moving a section between levels is a one-line change here rather than an edit
 * at two dozen call sites. The Word builder files every one of its sections
 * through the plan; the printed builder asks about the sections a level can
 * exclude, because a section filed at `Executive` prints whatever the level is.
 *
 * The levels are the document's own three layers (see the header of
 * `proposalExport.ts`), read as a ladder:
 *
 * - `Executive` prints the plain-language, commercial and governance layers and
 *   stops there. Everything it leaves out is substantiation: the captured
 *   discovery transcript, the design trace, the architecture drawing and cable
 *   schedule, the product photographs and specification pages, and the power
 *   budget. Nothing an executive document omits is a commitment or an open
 *   item — the unresolved discovery items, the risks and the acceptance
 *   criteria all print at this level, because a document that hides what is
 *   still open would present it as settled.
 * - `Standard` prints the whole document, which is what every proposal printed
 *   before the level existed — so a draft that never chose a level keeps the
 *   document it always produced.
 * - `Technical` prints the whole document plus the evidence appendix.
 */
export const DOCUMENT_SECTIONS: readonly { id: DocumentSectionId; detail: DocumentDetail }[] = [
  { id: "executive-summary", detail: "Executive" },
  { id: "room-at-a-glance", detail: "Executive" },
  { id: "solution-overview", detail: "Executive" },
  { id: "practical-operation", detail: "Executive" },
  { id: "commercial-benefits", detail: "Executive" },
  { id: "market-and-application-story", detail: "Executive" },
  { id: "client-objectives", detail: "Executive" },
  { id: "unresolved-discovery-items", detail: "Executive" },
  { id: "options", detail: "Executive" },
  { id: "proposed-solution-and-business-value", detail: "Executive" },
  { id: "scope-of-work", detail: "Executive" },
  { id: "display-schedule", detail: "Executive" },
  { id: "equipment-and-pricing", detail: "Executive" },
  { id: "services-and-commercial-allowances", detail: "Executive" },
  { id: "complete-system-design", detail: "Executive" },
  { id: "third-party-system-scope", detail: "Executive" },
  { id: "timeline-and-phases", detail: "Executive" },
  { id: "testing-and-acceptance", detail: "Executive" },
  { id: "responsibilities-and-dependencies", detail: "Executive" },
  { id: "assumptions-risks-and-exclusions", detail: "Executive" },
  { id: "next-steps", detail: "Executive" },
  { id: "best-efforts-disclaimer", detail: "Executive" },
  { id: "discovery-conversation", detail: "Standard" },
  { id: "design-trace", detail: "Standard" },
  { id: "technical-architecture", detail: "Standard" },
  { id: "cable-schedule", detail: "Standard" },
  { id: "products-in-the-solution", detail: "Standard" },
  { id: "product-specifications", detail: "Standard" },
  { id: "power-strategy", detail: "Standard" },
  { id: "technical-appendix", detail: "Technical" },
];

const DETAIL_DEPTH: Record<DocumentDetail, number> = { Executive: 0, Standard: 1, Technical: 2 };

/**
 * The sections a document at this detail level prints.
 *
 * A level the table does not know prints the whole document rather than
 * nothing: an unreadable level must not be able to empty a document that is
 * already being issued.
 */
export function documentSectionPlan(detail: DocumentDetail): ReadonlySet<DocumentSectionId> {
  const depth = DETAIL_DEPTH[detail] ?? DETAIL_DEPTH.Standard;
  return new Set(
    DOCUMENT_SECTIONS.filter((section) => DETAIL_DEPTH[section.detail] <= depth).map((section) => section.id),
  );
}

/** One reference line of the appendix: the line, why it is here, and what is open. */
export type DocumentAppendixRow = {
  item: number;
  /** The line as the schedule names it. */
  line: string;
  /** Why this line is in the design. */
  evidence: string;
  /** Where the product data behind it was read, or that nobody recorded one. */
  source: string;
  /** Whether the line is settled, optional or still to confirm. */
  verification: string;
};

export type DocumentAppendix = { headline: string; rows: DocumentAppendixRow[] };

/**
 * The evidence appendix a Technical document carries at the back.
 *
 * It is the reference behind the schedules rather than a second copy of them:
 * every line keeps the evidence it was selected on (`evidence`), the source the
 * rep read the product data from (`sourceUrl` / `sourceCheckedOn`) and what is
 * still open about it. Only the deepest detail level prints it — see
 * `DOCUMENT_SECTIONS` — because it is the material a technical reviewer asks
 * for, not what a customer decision-maker reads.
 */
export function buildDocumentAppendix(bomRows: SalesBomRow[]): DocumentAppendix {
  return {
    headline: bomRows.length
      ? "Reference detail behind the schedules above: why each line is in the design, where its product data was read from, and whether anything is still open before order."
      : "No equipment lines are recorded, so there is no selection evidence to list.",
    rows: bomRows.map((row) => ({
      item: row.item,
      line: [row.sku, row.description].filter(Boolean).join(" — "),
      evidence: row.evidence || "No evidence recorded — confirm this line is needed.",
      source: row.sourceUrl
        ? `${row.sourceUrl}${row.sourceCheckedOn ? ` (read ${row.sourceCheckedOn})` : ""}`
        : "Not recorded",
      verification: appendixVerification(row),
    })),
  };
}

/** What the appendix says is left to do on one line, from the line's own type
 * and status — the same two fields the schedule's status column is read from. */
function appendixVerification(row: SalesBomRow): string {
  if (row.type === "Validate" || row.status === "validate") {
    return "Open — confirm the specification and quantity before order.";
  }
  if (row.type === "Optional" || row.status === "optional") {
    return "Optional — include only if the customer takes it.";
  }
  return "Recorded in this design.";
}
