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
 *
 * The third kind, "staging", is the pass-4 staging of the 129 store SKUs that
 * have NO governed profile at all (see the triage document's "Pass 4 staging"
 * section, staged 2026-09-30 under `stagingGroupings`). The confirmation-aging
 * gate cannot see those SKUs - there is no profile to age - so the staging
 * batches exist to drive explicit decisions (profile creation, exclusion
 * record, or successor annotation) rather than confirmations. Their groups
 * join against the live backlog like every other kind: until an S-batch SKU
 * gets a profile it simply contributes no awaiting rows, so a staging view is
 * honest about the zero-progress state instead of pretending the SKUs are
 * trackable members of the confirmation backlog.
 */

import groupingsData from "./governedConfirmationBatches.json";
import governedTechnicalProfilesRaw from "../../../data/governance/wyrestorm-technical-profiles.json";
import { governedConfirmationBacklog, type AwaitingProfile } from "./governedConfirmationBacklog";

export type GroupingKind = "batches" | "families" | "staging";

/** A triage-group provenance tag for a governed-profile row ("R3", "T5"). */
export type ConfirmationRowTag = { id: ConfirmationGroupId; kind: "batches" | "families" };

export type ConfirmationGroupId = string;

export type ConfirmationGroup = {
  /** Stable group id from the triage document ("R1".."R5", "T1".."T10", "S1".."S7"). */
  id: ConfirmationGroupId;
  /** Scope line from the triage document. */
  scope: string;
  /**
   * Group SKUs that exist in the governed profile set - except for the
   * "staging" kind, where the listed SKUs are exactly the store SKUs with no
   * governed profile (the staging payload itself, pinned against the tracked
   * catalogue by the parity test).
   */
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
type RawGroupings = {
  groupings?: { batches?: RawGroup[]; families?: RawGroup[] };
  /** Pass-4 staging of store SKUs with no governed profile (S1–S7). */
  stagingGroupings?: { batches?: RawGroup[] };
};

function governedSkuSet(): Set<string> {
  const payload = governedTechnicalProfilesRaw as { profiles?: Array<{ sku?: string }> };
  const profiles = Array.isArray(payload.profiles) ? payload.profiles : [];
  return new Set(profiles.map((profile) => String(profile.sku ?? "")).filter(Boolean));
}

/**
 * The triage groups of one kind, with unknown SKUs split out of the live list.
 * "batches" and "families" are the confirmed-backlog groupings (R1–R5,
 * T1–T10); "staging" is the pass-4 S1–S7 staging of store SKUs without a
 * governed profile.
 */
export function confirmationGroups(kind: GroupingKind): ConfirmationGroup[] {
  return groupsOfKind(kind);
}

function groupsOfKind(kind: GroupingKind): ConfirmationGroup[] {
  const raw =
    kind === "staging"
      ? (groupingsData as RawGroupings).stagingGroupings?.batches ?? []
      : (groupingsData as RawGroupings).groupings?.[kind] ?? [];
  const governedSkus = governedSkuSet();
  return raw
    .filter((group): group is { id: string; scope: string; skus: string[] } => Boolean(group.id && group.scope && Array.isArray(group.skus)))
    .map((group) => {
      const skus: string[] = [];
      const unknownSkus: string[] = [];
      if (kind === "staging") {
        // Staged SKUs are store SKUs without a governed profile by
        // definition, so the governed-set split would move every one of them
        // into unknownSkus and empty the batch. The parity test pins the list
        // against the tracked catalogue instead.
        skus.push(...group.skus);
      } else {
        for (const sku of group.skus) {
          (governedSkus.has(sku) ? skus : unknownSkus).push(sku);
        }
      }
      return { id: group.id, scope: group.scope, skus, unknownSkus };
    });
}

/**
 * The group view for the current governed data: per-group awaiting/verified
 * splits plus the ungrouped catch-all. Awaiting profiles keep the backlog's
 * actionability sort, so the first rows of every group are the ones a reviewer
 * should confirm first. For the "staging" kind every group starts with zero
 * awaiting rows by definition (staged SKUs have no governed profile yet), so
 * the view is only meaningful once created profiles begin landing in S1.
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
 * Membership is a property of the triage list, not of the governed set: a
 * listed SKU maps to its group even while its profile is missing (unknownSkus)
 * - which is exactly how a pass-4 surface tags a staged store SKU with its
 * S-batch before any governed profile exists.
 */
export function confirmationGroupForSku(sku: string, kind: GroupingKind = "batches"): string | null {
  for (const group of groupsOfKind(kind)) {
    if (group.skus.includes(sku) || group.unknownSkus.includes(sku)) return group.id;
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

let rowTagMap: Map<string, ConfirmationRowTag[]> | null = null;

function buildRowTagMap(): Map<string, ConfirmationRowTag[]> {
  const map = new Map<string, ConfirmationRowTag[]>();
  const add = (sku: string, tag: ConfirmationRowTag) => {
    const existing = map.get(sku);
    if (existing) {
      if (!existing.some((candidate) => candidate.id === tag.id)) existing.push(tag);
    } else {
      map.set(sku, [tag]);
    }
  };
  for (const group of groupsOfKind("batches")) {
    for (const sku of [...group.skus, ...group.unknownSkus]) add(sku, { id: group.id, kind: "batches" });
  }
  for (const group of groupsOfKind("families")) {
    for (const sku of [...group.skus, ...group.unknownSkus]) add(sku, { id: group.id, kind: "families" });
  }
  return map;
}

/**
 * Row-level provenance tags for a governed SKU: every triage group id it
 * belongs to (its R-batch, its T-family, or both - the two groupings are
 * independent partitions of the triage list, so most members carry two).
 * Built once from the groupings data, including unknownSkus membership, so a
 * row keeps its provenance even while its profile is missing from the
 * governed set. SKUs confirmed outside any triage grouping (the pass-1/2
 * confirmations) map to no tag - the honest state is no chip, not an
 * invented group. Staging groups are excluded: their SKUs have no governed
 * profile and therefore never render as rows.
 */
export function confirmationRowTagsForSku(sku: string): ConfirmationRowTag[] {
  rowTagMap ??= buildRowTagMap();
  return rowTagMap.get(sku) ?? [];
}
