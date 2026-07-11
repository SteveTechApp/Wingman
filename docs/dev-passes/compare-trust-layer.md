# Development pass â€” Compare Trust Layer and governed match decisions

## Goal

Prevent unreviewed or technically incompatible competitor products from being
presented as WyreStorm equivalents.

## Decision classes

Every comparison result must be one of:

1. Confirmed equivalent
2. Closest technical match
3. Architecture alternative
4. Review required
5. No suitable WyreStorm match

Only an approved, evidenced decision may be described as a confirmed
equivalent.

## Mandatory candidate gates

Evaluate these before scoring similarities:

- Product class
- Endpoint role: transmitter, receiver, transceiver, matrix, switcher,
  processor or controller
- Fixed matrix versus extender versus presentation switcher versus AV-over-IP
- Routed I/O, excluding mirrored and loop outputs
- 1G versus 10G transport
- Codec and bandwidth class
- Resolution, chroma and HDR
- USB host/device behaviour
- Audio and Dante behaviour
- Control and network requirements
- Distance
- Dependencies
- Lifecycle and regional availability

A candidate that fails a mandatory architecture or endpoint-role gate must be
rejected regardless of its keyword or similarity score.

## Governed decision ledger

The starter implementation creates:

- `data/governance/competitor-match-decisions.json`
- `data/schemas/competitor-match-decision.schema.json`
- `src/wingman2/lib/competitorMatchDecisionLedger.ts`
- `src/wingman2/lib/competitorMatchDecisionLedger.test.ts`
- `tools/check-compare-trust-layer.mjs`

The ledger stores reviewed match, alternative and no-match decisions. Runtime
storage begins with a versioned local-storage contract. A later server-backed
store can implement the same data contract.

## UI requirements

The Compare result should show:

- Competitor technical fingerprint
- Decision class and review status
- Selected WyreStorm SKU, where applicable
- Matched points
- Important differences
- Dependencies
- Quote blockers
- Evidence
- Confirm, change, reject and save controls

Do not display a generic confidence percentage unless the score is transparent
and repeatable.

## Missing competitor SKU workflow

1. Enter missing SKU.
2. Perform controlled live lookup.
3. Collect source evidence.
4. Create a quarantined competitor record.
5. Normalise the technical fingerprint.
6. Require manual review.
7. Approve a match, alternative or no-match decision.
8. Add it to the governed local database.

An unreviewed lookup result must not enter the trusted comparison pool.

## Behavioural tests required in the implementation pass

- Blustream IP250UHD-TX returns transmitter/encoder candidates only.
- Atlona AT-OME-EX-KIT is treated as an extender and any meeting-room
  switcher is labelled as an architecture alternative.
- Lightware LBN-4x3-HBT-PRO uses routed matrix outputs and excludes mirrored
  outputs.
- Unknown 1G AV-over-IP defaults towards NetworkHD 500 unless H.264/H.265 is
  confirmed.
- 10G SDVoE products return NetworkHD 600 candidates only.
- Decoder requests never return transmitter-only lead candidates.
- Unsupported products return an explicit no-match decision.
- Incomplete evidence returns review-required rather than an equivalence.

Tests must execute comparison functions. Source-marker checks are not adequate
as proof of behaviour.

## Integration sequence

1. Read approved ledger decisions before heuristic ranking.
2. Apply mandatory architecture and role gates.
3. Calculate candidate evidence and differences.
4. Return a governed decision class.
5. Add reviewer controls to Compare.
6. Persist decisions.
7. Write the selected decision and evidence to the active project.
8. Add executable end-to-end comparison scenarios.

## Acceptance criteria

- No unapproved result is labelled equivalent.
- Approved decisions are repeatable for the same manufacturer and SKU.
- A no-match decision is persisted and suppresses recurring bad suggestions.
- TX/RX and 1G/10G gates are absolute.
- Mirrored and loop outputs are not counted as routed outputs.
- Missing-SKU results stay quarantined until reviewed.
- Typecheck, Compare tests, full verification and production build pass.
## Runtime wiring completed

- The live Compare page reads approved decisions before heuristic ordering.
- Approved no-match decisions suppress recurring automatic suggestions.
- Reviewed WyreStorm SKUs are promoted ahead of heuristic candidates.
- Reviewer controls can save confirmed equivalents, closest technical matches,
  architecture alternatives, review-required records and no-match decisions.
- Confirmed equivalents require a blocker-free good match, reviewer and source
  URL.
- 1G and 10G AV-over-IP network classes are an absolute blocker.
- The temporary orphan allowlist was removed.
- Behavioural tests execute governance precedence, no-match suppression,
  transmitter/receiver gating and 1G/10G gating.