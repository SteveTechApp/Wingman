/**
 * The proposal wizard's document outputs and the guard in front of them.
 *
 * Five outputs share one rule: the design must be ready before a document may
 * leave, and the rep is told what happened in the wizard's own words. Keeping
 * that in one place means a new output cannot forget the check, and the
 * exporters themselves stay ignorant of wizard copy.
 */
import type {
  StoredProductSelection,
  StoredProjectProposal,
  StoredVideowallSummary,
} from "../data/projectStore";
import { exportProposalDiscoveryBriefDocx } from "./discoveryBriefDocxExport";
import { exportProposalDocx } from "./proposalDocxExport";
import { exportBomCsv, exportProposalHtml, exportProposalPdf } from "./proposalExport";
import type { ExportValidationResult } from "./proposalExportValidation";
import type { DesignAssuranceItem } from "./productAssurance";
import type { ProposalWizardDraft } from "./proposalWizard";
import type { SalesBomRow } from "./salesReadiness";

/** The documents a rep can issue from the review step. */
export type ProposalExportKind = "docx" | "html" | "pdf" | "csv" | "discovery-brief";

type ExportMessageSet = {
  /** Shown while a document is still being built. */
  pending?: string;
  /** The wizard-completion fallback when the design itself has no reason to give. */
  blocked: string;
  done: string;
  failed: string;
};

const EXPORT_MESSAGES: Record<ProposalExportKind, ExportMessageSet> = {
  docx: {
    pending: "Generating formatted DOCX...",
    blocked: "Complete the remaining wizard items before exporting the final DOCX.",
    done: "Formatted DOCX generated.",
    failed: "DOCX export failed",
  },
  html: {
    blocked: "Complete the remaining wizard items before exporting HTML.",
    done: "HTML export generated.",
    failed: "HTML export failed",
  },
  pdf: {
    blocked: "Complete the remaining wizard items before exporting a PDF.",
    done: 'Opened the print dialog - choose "Save as PDF" as the destination.',
    failed: "PDF export failed",
  },
  csv: {
    blocked: "Complete the remaining wizard items before exporting the BOM CSV.",
    done: "BOM CSV generated.",
    failed: "BOM CSV export failed",
  },
  "discovery-brief": {
    // The brief is a pre-design hand-off record, not a quotation, so it is the
    // one output with no guard — the fallback is never read.
    blocked: "Resolve validation issues before exporting.",
    done: "Discovery brief DOCX generated — share it before design sign-off.",
    failed: "Discovery brief export failed",
  },
};

/** Everything the export actions read off the wizard. */
export type ProposalExportContext = {
  proposal: StoredProjectProposal;
  bomRows: SalesBomRow[];
  selectedProducts: StoredProductSelection[];
  videowall: StoredVideowallSummary | null;
  draft: ProposalWizardDraft;
  /** The wizard's own readiness verdict, including the design's blockers. */
  customerOutputBlocked: boolean;
  exportValidation: ExportValidationResult;
  /** Chain blockers, which name the SKU that has to be resolved first. */
  chainBlockers: readonly DesignAssuranceItem[];
};

/**
 * Why the design cannot be issued yet, in the order a rep should work through
 * it: an unresolved product chain first, then the export validation blockers,
 * then whatever gaps the complete design still has.
 */
export function proposalExportBlockReason(
  context: Pick<ProposalExportContext, "chainBlockers" | "exportValidation" | "proposal">,
): string | null {
  if (context.chainBlockers.length > 0) {
    const names = context.chainBlockers.map((blocker) =>
      blocker.sku ? `${blocker.sku} — ${blocker.message}` : blocker.message,
    );
    return `Export blocked — resolve these chain issues first:\n${names.join("; ")}`;
  }

  if (context.exportValidation.blockers.length > 0) {
    const names = context.exportValidation.blockers.map((blocker) =>
      `${blocker.sku ? `${blocker.sku}: ` : ""}${blocker.message} — fix: ${blocker.fix}`,
    );
    return `Export blocked — resolve these issues first:\n${names.join("; ")}`;
  }

  const designBlockers = context.proposal.designRevision?.blockers ?? [];
  if (designBlockers.length) {
    return `Export blocked — the complete design still has gaps:\n${designBlockers.join("; ")}`;
  }

  return null;
}

/**
 * Issue one document, reporting the same way the wizard always has: a blocked
 * design says why, a document in build says so, and the result says what
 * arrived. The report callback is the wizard's message state, so a surface that
 * reuses this keeps its own wording.
 */
export async function runProposalExport(
  kind: ProposalExportKind,
  context: ProposalExportContext,
  report: (message: string) => void,
) {
  const messages = EXPORT_MESSAGES[kind];

  if (kind !== "discovery-brief") {
    if (context.customerOutputBlocked) {
      report(proposalExportBlockReason(context) ?? messages.blocked);
      return;
    }

    if (!context.exportValidation.allowed) {
      report(proposalExportBlockReason(context) ?? "Resolve validation issues before exporting.");
      return;
    }

    if (messages.pending) report(messages.pending);
  }

  try {
    if (kind === "docx") {
      await exportProposalDocx(context.proposal, context.bomRows, context.draft, context.videowall);
    } else if (kind === "html") {
      await exportProposalHtml(context.proposal, context.bomRows, context.selectedProducts, context.videowall);
    } else if (kind === "pdf") {
      await exportProposalPdf(context.proposal, context.bomRows, context.selectedProducts, context.videowall);
    } else if (kind === "csv") {
      exportBomCsv(context.proposal, context.bomRows);
    } else {
      // The brief hands off before design sign-off, so it is not awaited: the
      // wizard reports it the moment the hand-off is started.
      void exportProposalDiscoveryBriefDocx(context.proposal);
    }
    report(messages.done);
  } catch (error) {
    report(
      error instanceof Error
        ? `${messages.failed}: ${error.message}`
        : `${messages.failed}.`,
    );
  }
}
