/**
 * Grouping views over the governed confirmation backlog.
 *
 * The confirmation triage (docs/governed-profile-confirmation-triage-2026-09-30.md)
 * assigns every overdue machine-transcribed profile to reviewer batches
 * (R1–R5: reviewer sittings) and product families (T1–T10: commodity cables,
 * power/converters, Apollo/Halo/UC, displays, cameras, control...). This
 * module joins those groupings with the backlog's awaiting/verified profiles
 * so a reviewer working the backlog sees one group at a time instead of a
 * flat 90-row list - by sitting or by family, whichever fits the task.
 *
 * Groupings are data (governedConfirmationBatches.json), generated from the
 * triage document, so the doc remains the source of truth. SKUs listed in the
 * triage but absent from the governed set, and awaiting profiles outside
 * every group, both surface explicitly rather than being dropped.
 */

import groupingsData from "./governedConfirmationBatches.json";
import governedTechnicalProfilesRaw from "../../../data/governance/wyrestorm-technical-profiles.json";
import { governedConfirmationBacklog, type AwaitingProfile } from "./governedConfirmationBacklog";

export type GroupingKind = "batches" | "families";

export type ConfirmationGroupId = string;

export type ConfirmationGroup = {
  /** Stable group id from the triage document ("R1".."R5", "T1".."T10"). */
  id: ConfirmationGroupId;
  /** Scope line from the triage document. */
  scope: string;
  /** Group SKUs that exist in the governed profile set. */
  skus: string[];
  /** Triage SKUs with no governed profile - listed so the mismatch is visible. */
  unknownSkus: string[];
};

export type ConfirmationGroupProgress = ConfirmationGroup & {
  /** Backlog members of this group still awaiting confirmation, sorted like the backlog. */
  awaiting: AwaitingProfile[];
  /** Group members already human-verified. */
  verifiedCount: number;
  /** Members awaiting confirmation with no missing data. */
  readyToConfirm: number;
  /** Members awaiting confirmation that need data work first. */
  needDataWork: number;
  /** Awaiting members past the warn threshold (the aging clock that A1 tracked). */
  agingOrOverdue: number;
};

export type ConfirmationGroupView = {
  kind: GroupingKind;
  groups: ConfirmationGroupProgress[];
  /** Awaiting profiles not assigned to any group (never dropped silently). */
  ungrouped: AwaitingProfile[];
  totalAwaiting: number;
};

type RawGroup = { id?: string; scope?: string; skus?: string[] };
type RawGroupings = { groupings?: { batches?: RawGroup[]; families?: RawGroup[] } };

function governedSkuSet(): Set<string> {
  const payload = governedTechnicalProfilesRaw as { profiles?: Array<{ sku?: string }> };
  const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  return new Set(profiles.map((profile) => String(profile.sku ?? "")).filter(Boolean));
}

/**
 * The triage groups of one kind, with unknown SKUs split out of the live list.
 */
export function confirmationGroups(kind: GroupingKind): ConfirmationGroup[] {
  return groupsOfKind(kind);
}

function groupsOfKind(kind: GroupingKind): ConfirmationGroup[] {
  const raw = (groupingsData as RawGroupings).groupings?.[kind] ?? [];
  const governedSkus = governedSkuSet();
  return raw
    .filter((group): group is { id: string; scope: string; skus: string[] } => Boolean(group.id && group.scope && Array.isArray(group.skus)))
    .map((group) => {
      const skus: string[] = [];
      const unknownSkus: string[] = [];
      for (const sku of group.skus) {
        (governedSkus.has(sku) ? skus : unknownSkus).push(sku);
      }
      return { id: group.id, scope: group.scope, skus, unknownSkus };
    });
}

/**
 * The group view for the current governed data: per-group awaiting/verified
 * splits plus the ungrouped catch-all. Awaiting profiles keep the backlog's
 * actionability sort, so the first rows of every group are the ones a reviewer
 * should confirm first.
 */
export function confirmationGroupView(kind: GroupingKind = "batches"): ConfirmationGroupView {
  const backlog = governedConfirmationBacklog();
  const groups = groupsOfKind(kind);
  const bySku = new Map(backlog.awaiting.map((profile) => [profile.sku, profile]));
  const verifiedSkus = new Set(backlog.verified.map((profile) => profile.sku));

  const assigned = new Set<string>();
  const progress: ConfirmationGroupProgress[] = groups.map((group) => {
    const awaiting: AwaitingProfile[] = [];
    let verifiedCount = 0;
    for (const sku of group.skus) {
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
    return { ...group, awaiting, verifiedCount, readyToConfirm, needDataWork, agingOrOverdue };
  });

  const ungrouped = backlog.awaiting.filter((profile) => !assigned.has(profile.sku));
  return { kind, groups: progress, ungrouped, totalAwaiting: backlog.awaiting.length };
}

/**
 * Group membership lookup for UI surfaces that need to tag rows: the group id
 * for a SKU within a grouping, or null when the SKU is not in any group.
 */
export function confirmationGroupForSku(sku: string, kind: GroupingKind = "batches"): string | null {
  for (const group of groupsOfKind(kind)) {
    if (group.skus.includes(sku)) return group.id;
  }
  return null;
}

/**
 * Family id ("T1".."T10") for a SKU - the product-family grouping the
 * triage tables used, offered alongside the reviewer batches.
 */
export function confirmationFamilyForSku(sku: string): string | null {
  return confirmationGroupForSku(sku, "families");
}
