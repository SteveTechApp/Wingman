/**
 * Proposal copy has two layers and only one of them may be printed.
 *
 * `REP_COPY` is authoring guidance: the prompts a salesperson works through in
 * the proposal wizard. `CUSTOMER_COPY` is what the customer-facing HTML, PDF
 * and Word exports may say.
 *
 * Export builders read `CUSTOMER_COPY` only. A stored draft can still hold
 * guidance left in a free-text field (the wizard seeds the scope field with
 * the prompts below), so `customerCopyText` strips any rep-only line before it
 * is printed and substitutes the customer wording for that field.
 */

export const CUSTOMER_COPY = {
  scopeIntro:
    "The items below complete the wider solution. Each one is still open: none of it is equipment or work included in this proposal, and we will agree the owner, detail and commercial treatment with you before it is issued.",
  scopePending: [
    "Displays / projection — model, size, mounting location and supplier to be agreed.",
    "Sources and conferencing — source devices, meeting platform and USB host to be agreed.",
    "Audio — microphones, loudspeakers, DSP and acoustic requirements to be agreed.",
    "Network — switches, port capacity, PoE budget, VLANs and IT approval to be agreed.",
    "Control — user interface, named room modes and programming to be agreed.",
    "Site infrastructure — cable routes and distances, rack, ventilation, power and containment to be agreed.",
    "Delivery and acceptance — installation, training, support, acceptance tests and dates to be agreed.",
  ].join("\n"),
  noEquipment: "No equipment is recorded for this room in this draft.",
  noSchematic:
    "The signal path and cable schedule for this system are not yet confirmed and will be issued with the final design.",
  noOperation:
    "The day-to-day operating sequence for this system is not yet confirmed and will be agreed before this proposal is issued.",
  noBenefits:
    "The benefits for this system will be agreed against your own business measures before this proposal is issued.",
  /**
   * The standing comparison notice beside the readiness line. It belongs to the
   * copy layer rather than to the export builder so the one sentence the gate
   * holds is the one that prints — a checker cannot drift from wording the
   * document owns.
   */
  competitorExclusion:
    "Competitor products are not included in this proposal or its equipment schedule.",
} as const;

export const REP_COPY = {
  scopePrompts: [
    "Displays / projection | Model, size, location and mounting: [complete] | Supplier / owner: [complete]",
    "Sources and conferencing | Source devices, meeting platform and USB host: [complete] | Supplier / owner: [complete]",
    "Audio | Microphones, loudspeakers, DSP and acoustic requirements: [complete] | Supplier / owner: [complete]",
    "Network | Switches, port capacity, PoE budget, VLANs and IT approval: [complete] | Supplier / owner: [complete]",
    "Control | User interface, named room modes and programming: [complete] | Supplier / owner: [complete]",
    "Site infrastructure | Cable routes / distances, rack, ventilation, power and containment: [complete] | Supplier / owner: [complete]",
    "Delivery and acceptance | Installation, training, support, acceptance tests and dates: [complete] | Supplier / owner: [complete]",
  ].join("\n"),
  scopeGuidance:
    "Replace each [complete] with the agreed detail, or state not applicable / excluded. Record the supplier, responsibility and commercial allowance. Only the agreed detail is printed in the customer document.",
} as const;

/**
 * Markers that only ever belong to authoring guidance. A line carrying one is
 * never printable, whatever field it arrived in.
 */
const REP_ONLY_MARKERS: RegExp[] = [
  /\[complete\]/i,
  /\[todo\]/i,
  /\[internal[^\]]*\]/i,
  /\[rep[^\]]*\]/i,
  /\brep only\b/i,
  /\binternal note\b/i,
  /^\s*add (?:bom|equipment)\b/i,
  /^\s*replace each\b/i,
];

export function isRepOnlyCopy(line: string): boolean {
  return REP_ONLY_MARKERS.some((marker) => marker.test(line));
}

/**
 * Lines that may be printed. Rep-only lines are dropped; if the field held
 * nothing else, the customer wording for that field is returned instead of an
 * empty section.
 */
export function customerCopyLines(value: string | undefined | null, fallback: string): string[] {
  const kept = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isRepOnlyCopy(line));
  if (kept.length) return kept;
  return String(fallback)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function customerCopyText(value: string | undefined | null, fallback: string): string {
  return customerCopyLines(value, fallback).join("\n");
}
