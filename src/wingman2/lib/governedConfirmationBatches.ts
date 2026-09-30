/**
 * Reviewer-batch grouping over the governed confirmation backlog.
 *
 * The confirmation triage (docs/governed-profile-confirmation-triage-2026-09-30.md)
 * assigns every overdue machine-transcribed profile to one of five reviewer
 * batches (R1–R5: commodity cables, power/converters, Apollo/Halo/UC,
 * displays/racks, cameras/control). This module joins those batch definitions
 * with the backlog's awaiting/verified profiles so a reviewer working the
 * backlog sees one batch at a time instead of a flat 90-row list.
 *
 * Batches are data (governedConfirmationBatches.json), generated from the
 * triage document, so the doc remains the source of truth. SKUs listed in the
 * triage but absent from the governed set, and awaiting profiles outside
 * every batch, both surface explicitly rather than being dropped.
 */

import batchData from "./governedConfirmationBatches.json";
import governedTechnicalProfilesRaw from "../../../data/governance/wyrestorm-technical-profiles.json";
import { governedConfirmationBacklog, type AwaitingProfile } from "./governedConfirmationBacklog";

export type ConfirmationBatchId = string;

export type ConfirmationBatch = {
  /** Stable batch id from the triage document ("R1".."R5"). */
  id: ConfirmationBatchId;
  /** Scope line from the triage document. */
  scope: string;
  /** Reviewer-batch SKUs that exist in the governed profile set. */
  skus: string[];
  /** Triage SKUs with no governed profile - listed so the mismatch is visible. */
  unknownSkus: string[];
};

export type ConfirmationBatchProgress = ConfirmationBatch & {
  /** Backlog members of this batch still awaiting confirmation, sorted like the backlog. */
  awaiting: AwaitingProfile[];
  /** Batch members already human-verified. */
  verifiedCount: number;
  /** Members awaiting confirmation with no missing data. */
  readyToConfirm: number;
  /** Members awaiting confirmation that need data work first. */
  needDataWork: number;
  /** Awaiting members past the warn threshold (the aging clock that A1 tracked). */
  agingOrOverdue: number;
};

export type ConfirmationBatchView = {
  batches: ConfirmationBatchProgress[];
  /** Awaiting profiles not assigned to any batch (never dropped silently). */
  unbatched: AwaitingProfile[];
  totalAwaiting: number;
};

const rawBatches = (batchData as { batches?: Array<{ id?: string; scope?: string; skus?: string[] }> }).batches ?? [];

function governedSkuSet(): Set<string> {
  const payload = governedTechnicalProfilesRaw as { profiles?: Array<{ sku?: string }> };
  const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  return new Set(profiles.map((profile) => String(profile.sku ?? "")).filter(Boolean));
}

export function confirmationBatches(): ConfirmationBatch[] {
  const governedSkus = governedSkuSet();
  return rawBatches
    .filter((batch): batch is { id: string; scope: string; skus: string[] } => Boolean(batch.id && batch.scope && Array.isArray(batch.skus)))
    .map((batch) => {
      const skus: string[] = [];
      const unknownSkus: string[] = [];
      for (const sku of batch.skus) {
        (governedSkus.has(sku) ? skus : unknownSkus).push(sku);
      }
      return { id: batch.id, scope: batch.scope, skus, unknownSkus };
    });
}

/**
 * The batch view for the current governed data: per-batch awaiting/verified
 * splits plus the unbatched catch-all. Awaiting profiles keep the backlog's
 * actionability sort, so the first rows of every batch are the ones a reviewer
 * should confirm first.
 */
export function governedConfirmationBatchView(): ConfirmationBatchView {
  const backlog = governedConfirmationBacklog();
  const batches = confirmationBatches();
  const bySku = new Map(backlog.awaiting.map((profile) => [profile.sku, profile]));
  const verifiedSkus = new Set(backlog.verified.map((profile) => profile.sku));

  const assigned = new Set<string>();
  const progress: ConfirmationBatchProgress[] = batches.map((batch) => {
    const awaiting: AwaitingProfile[] = [];
    let verifiedCount = 0;
    for (const sku of batch.skus) {
      const awaitingProfile = bySku.get(sku);
      if (awaitingProfile) {
        awaiting.push(awaitingProfile);
        assigned.add(sku);
      } else if (verifiedSkus.has(sku)) {
        verifiedCount += 1;
      }
      // A SKU neither awaiting nor verified does not exist in the governed
      // set; surfaced via unknownSkus below rather than silently dropped.
    }
    const readyToConfirm = awaiting.filter((profile) => profile.missingData.length === 0).length;
    const needDataWork = awaiting.length - readyToConfirm;
    const agingOrOverdue = awaiting.filter((profile) => profile.aging === "aging" || profile.aging === "overdue").length;
    return { ...batch, awaiting, verifiedCount, readyToConfirm, needDataWork, agingOrOverdue };
  });

  const unbatched = backlog.awaiting.filter((profile) => !assigned.has(profile.sku));
  return { batches: progress, unbatched, totalAwaiting: backlog.awaiting.length };
}

/**
 * Batch membership lookup for UI surfaces that need to tag rows: the triage
 * batch id for a SKU, or null when the SKU is not in any batch.
 */
export function confirmationBatchForSku(sku: string): string | null {
  for (const batch of batches) {
    if (batch.skus.includes(sku)) return batch.id;
  }
  return null;
}

const batches = confirmationBatches();
