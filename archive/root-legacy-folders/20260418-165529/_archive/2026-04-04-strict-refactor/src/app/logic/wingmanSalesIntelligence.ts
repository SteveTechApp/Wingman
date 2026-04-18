import type { WingmanActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";

export type WingmanSalesIntelligence = {
  whyWyreStorm: string;
  whyThisArchitecture: string;
  whyNow: string;
  upsellPrompts: string[];
  riskPrompts: string[];
  proposalNarrative: string;
};

export function buildWingmanSalesIntelligence(
  snapshot: WingmanActiveProjectSnapshot
): WingmanSalesIntelligence {
  const d = snapshot.project.discovery;
  const architecture = snapshot.decision.architecture;
  const products = snapshot.decision.primaryProducts.join(", ");

  const whyWyreStorm =
    "Position WyreStorm as a practical single-vendor solution path covering switching, transport, video wall processing, collaboration and control without forcing the customer into a fragmented design.";

  const whyThisArchitecture =
    d.videoWall
      ? `This opportunity is being driven by the display canvas, so ${architecture} is the right commercial conversation because it aligns processing choice, source behaviour and future flexibility.`
      : d.sources > 2 || d.displays > 2
        ? `This opportunity involves enough routing complexity that ${architecture} is the correct fit. It helps position the system around real workflow needs instead of a simple box sale.`
        : d.distanceM && d.distanceM > 10
          ? `Distance is materially affecting the system design, so ${architecture} is the right way to position reliability and transport quality.`
          : `${architecture} is the right fit for the current scope because it stays aligned to the application without overcomplicating the system.`;

  const whyNow =
    "Use the current recommendation to frame the sale around operational fit, reduced redesign risk and a cleaner migration path if the customer expands the space later.";

  const upsellPrompts: string[] = [];
  const riskPrompts: string[] = [];

  if (d.hybridMeeting || d.usbRequired) {
    upsellPrompts.push("Position conferencing peripherals, USB workflow and camera experience as value upgrades.");
  }

  if (d.videoWall) {
    upsellPrompts.push("Offer advanced processing or flexible multiview capability where the customer wants future layout freedom.");
    riskPrompts.push("Confirm whether the wall is fixed-layout or expected to support dynamic content behaviour.");
  }

  if (d.distanceM && d.distanceM > 30) {
    upsellPrompts.push("Use transport reliability and infrastructure quality as justification for a stronger architecture.");
    riskPrompts.push("Distance could materially change cost and transport strategy if the cable path is not yet confirmed.");
  }

  if (d.sources >= 4 || d.displays >= 4) {
    upsellPrompts.push("Position control and expansion headroom as part of the value story.");
    riskPrompts.push("The opportunity is no longer very simple, so validate workflow and switching expectations before final quote.");
  }

  if (riskPrompts.length === 0) {
    riskPrompts.push("Confirm final workflow, control expectations and any unrecorded room constraints before quote issue.");
  }

  const proposalNarrative =
    `WyreStorm recommends ${architecture} using ${products}. ` +
    `This approach is aligned to the current project inputs and is intended to provide a practical, scalable and proposal-ready solution with a clear path to expansion where needed.`;

  return {
    whyWyreStorm,
    whyThisArchitecture,
    whyNow,
    upsellPrompts,
    riskPrompts,
    proposalNarrative,
  };
}