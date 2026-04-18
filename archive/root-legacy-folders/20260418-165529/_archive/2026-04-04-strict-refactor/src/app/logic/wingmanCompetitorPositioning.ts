import type { WingmanActiveProjectSnapshot } from "@/app/logic/wingmanProjectState";

export type WingmanCompetitorPositioning = {
  summary: string;
  differentiators: string[];
  objectionHandling: string[];
  whenWyreStormWins: string[];
};

export function buildWingmanCompetitorPositioning(
  snapshot: WingmanActiveProjectSnapshot
): WingmanCompetitorPositioning {
  const d = snapshot.project.discovery;
  const architecture = snapshot.decision.architecture;

  const summary =
    d.videoWall
      ? "Position WyreStorm as the practical route between oversimplified fixed-wall approaches and over-engineered enterprise-style wall systems."
      : d.sources > 2 || d.displays > 2
        ? "Position WyreStorm as the cleaner, application-led path instead of forcing the customer into unnecessary complexity."
        : "Position WyreStorm as the fit-for-purpose route that avoids both under-specifying and over-designing the room.";

  const differentiators: string[] = [
    "Single-vendor coherence across switching, transport, video wall, collaboration and control.",
    "Application-led design path rather than forcing product-first architecture.",
    "Clear upgrade path from compact rooms to more advanced systems without changing design language.",
  ];

  if (d.videoWall) {
    differentiators.push("Can position both non-AVoIP and more advanced wall strategies depending on layout complexity.");
  }

  if (d.usbRequired || d.hybridMeeting) {
    differentiators.push("Stronger room workflow story when USB, collaboration and user simplicity are part of the requirement.");
  }

  const objectionHandling: string[] = [
    "A lower-cost competitor option may appear simpler, but may not hold once routing, distance or usability requirements are fully confirmed.",
    "A higher-complexity competitor architecture may be technically capable, but may add cost and support burden beyond the actual requirement.",
    "WyreStorm can be positioned as the balanced route between basic box-selling and over-engineered system design.",
  ];

  if (d.distanceM && d.distanceM > 30) {
    objectionHandling.push("Distance is not just an accessory issue; it can materially change transport quality, reliability and total project risk.");
  }

  if (d.videoWall) {
    objectionHandling.push("For video wall projects, the real differentiator is choosing the right processing path for the content behaviour, not just choosing the most expensive option.");
  }

  const whenWyreStormWins: string[] = [
    `When the customer needs a practical ${architecture.toLowerCase()} path without fragmented design decisions.`,
    "When the salesperson needs a clearer value story, not just a technical feature list.",
    "When future expansion matters but the customer does not want to overbuy on day one.",
  ];

  return {
    summary,
    differentiators,
    objectionHandling,
    whenWyreStormWins,
  };
}