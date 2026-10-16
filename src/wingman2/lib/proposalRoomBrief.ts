import type { StoredProjectProposal } from "../data/projectStore";
import type { SalesBomRow } from "./salesReadiness";
import { safeProposalWebUrl } from "./proposalSalesContent";

/** Presentation only: never infer room dimensions, manufacturers or shared quantities. */
export function proposalRoomBrief(proposal: StoredProjectProposal, rows: SalesBomRow[]) {
  const application = proposal.applicationProposal;
  const groups = new Map<string, SalesBomRow[]>();
  for (const row of rows) {
    if (row.status === "excluded" || !(row.qty > 0)) continue;
    const role = row.role.trim() || "Equipment — role to be confirmed";
    groups.set(role, [...(groups.get(role) ?? []), row]);
  }
  return {
    application: application?.application || proposal.title,
    purpose: proposal.salesContent?.objectives || application?.customerNeed || proposal.summary,
    facts: application?.technicalFacts.filter((fact) => fact.trim()) ?? [],
    highlights: application?.benefits.filter((benefit) => benefit.detail.trim()) ?? [],
    groups: [...groups].map(([role, equipment]) => ({ role, equipment })),
  };
}

export function roomBriefHtml(proposal: StoredProjectProposal, rows: SalesBomRow[]) {
  const brief = proposalRoomBrief(proposal, rows);
  const rawImage = proposal.applicationProposal?.roomVisualUrl;
  const image = safeProposalWebUrl(rawImage) || (rawImage?.startsWith("/") && !rawImage.startsWith("//") && typeof window !== "undefined"
    ? safeProposalWebUrl(new URL(rawImage, window.location.origin).href) : undefined);
  const escape = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
  return `<section aria-label="Room design overview">
    <h2>Room at a glance</h2><p><strong>${escape(brief.application)}</strong></p><p>${escape(brief.purpose)}</p>
    ${image ? `<figure style="margin:16px 0"><img src="${escape(image)}" alt="${escape(brief.application)} room concept" style="display:block;width:100%;max-height:320px;object-fit:contain" /><figcaption>Illustrative room concept — final layout, equipment locations and finishes require approval.</figcaption></figure>` : ""}
    <h3>Recorded room and design details</h3>
    ${brief.facts.length ? `<ul>${brief.facts.map((fact) => `<li>${escape(fact)}</li>`).join("")}</ul>` : "<p>Room dimensions, capacity and site conditions require confirmation.</p>"}
    ${brief.highlights.length ? `<h3>What this space delivers</h3><ul>${brief.highlights.map((item) => `<li><strong>${escape(item.title)}:</strong> ${escape(item.detail)}</li>`).join("")}</ul>` : ""}
    <h3>In this room</h3><p>Grouped by the recorded equipment role. Item references match the equipment schedule; optional items remain subject to selection. Third-party equipment and services are detailed in Complete System Design and Responsibilities.</p>
    ${brief.groups.length ? brief.groups.map((group) => `<h4>${escape(group.role)}</h4><table><thead><tr><th>Item</th><th>Model</th><th>Description</th><th>Qty</th><th>Selection</th></tr></thead><tbody>${group.equipment.map((row) => `<tr><td>${escape(row.item)}</td><td>${escape(row.sku)}</td><td>${escape(row.description)}</td><td>${escape(row.qty)}</td><td>${escape(row.type)}</td></tr>`).join("")}</tbody></table>`).join("") : "<p>No active equipment has been selected.</p>"}
  </section>`;
}
