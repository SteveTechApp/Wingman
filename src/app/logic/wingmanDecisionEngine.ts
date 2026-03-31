export type WingmanInputs = {
  sources: number;
  displays: number;
  distanceM?: number;
  usbRequired?: boolean;
  wireless?: boolean;
  videoWall?: boolean;
  advancedMultiview?: boolean;
  hybridMeeting?: boolean;
  networkReady?: boolean;
  futureExpansion?: boolean;
};

export type WingmanDecision = {
  recommendedTier: "Bronze" | "Silver" | "Gold";
  architecture: string;
  primaryProducts: string[];
  supportingProducts: string[];
  reasoning: string[];
};

export function buildDecision(input: WingmanInputs): WingmanDecision {
  const sources = Number(input.sources ?? 0);
  const displays = Number(input.displays ?? 0);
  const distanceM = Number(input.distanceM ?? 0);

  let avoipScore = 0;
  if (sources >= 3) avoipScore += 2;
  if (displays >= 3) avoipScore += 2;
  if (input.videoWall) avoipScore += 3;
  if (input.advancedMultiview) avoipScore += 3;
  if (distanceM > 30) avoipScore += 1;
  if (input.networkReady) avoipScore += 2;
  if (input.futureExpansion) avoipScore += 2;

  if (input.wireless && !input.videoWall && avoipScore < 5) {
    const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
      architecture: "Wireless Presentation and Conferencing",
      primaryProducts: sources > 2 ? ["SW-640L-TX-W"] : ["SW-620-TX-W"],
      supportingProducts: input.hybridMeeting
        ? ["APO-DG2", "SYN-TOUCH10"]
        : ["SYN-TOUCH10"],
      reasoning: [
        "Wireless collaboration is required",
        "Integrated USB, charging and network handoff simplifies room design",
        "Suitable for BYOD and hybrid meeting spaces",
      ],
    };
  }

  if (input.videoWall) {
    if (avoipScore >= 7 && input.networkReady) {
      const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
        architecture: "AV over IP Video Wall System",
        primaryProducts: ["NHD-500-TX", "NHD-500-RX"],
        supportingProducts: ["NHD-CTL-PRO", "SW-0206-VW"],
        reasoning: [
          "Video wall requirement is present",
          "Network-ready infrastructure makes AVoIP viable",
          "Scalability and flexible wall behaviour favour AV over IP",
          "Suitable where future expansion or advanced wall routing is important",
        ],
      };
    }

    if (displays <= 6 && !input.advancedMultiview) {
      const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
        architecture: "Dedicated Video Wall Processor",
        primaryProducts: ["SW-0206-VW"],
        supportingProducts: [],
        reasoning: [
          "Video wall requested",
          "Smaller wall size is suitable for dedicated processor workflow",
          "Cost-effective non-AVoIP wall solution",
          "Appropriate where fixed layouts are acceptable",
        ],
      };
    }

    const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
      architecture: "Advanced Video Wall Processing",
      primaryProducts: ["MX-0812-SCL"],
      supportingProducts: [],
      reasoning: [
        "Video wall requested",
        "Advanced layout or multiview flexibility required",
        "Better fit for larger or more configurable wall systems",
      ],
    };
  }

  if (avoipScore >= 5 && input.networkReady) {
    const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
      architecture: "AV over IP Distribution",
      primaryProducts: ["NHD-500-TX", "NHD-500-RX"],
      supportingProducts: ["NHD-CTL-PRO"],
      reasoning: [
        "Multiple source/display routing suggests a scalable architecture",
        "Managed network readiness supports AVoIP deployment",
        "Appropriate where flexibility, scaling, and future expansion matter",
        "Higher initial cost is justified by routing freedom and long-term adaptability",
      ],
    };
  }

  if (sources > 2 || displays > 2) {
    const supportingProducts: string[] = ["SYN-TOUCH10"];

    if (input.usbRequired || input.hybridMeeting) {
      supportingProducts.push("APO-VX20-UC v2");
    }

    const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
      architecture: "Presentation Matrix System",
      primaryProducts: ["MX-0402-MST"],
      supportingProducts,
      reasoning: [
        "Multiple sources or displays require matrix-style switching",
        "USB-C, USB and presentation workflows are better served by presentation matrix products",
        "Provides a stronger foundation for professional meeting and teaching spaces",
        "A fixed architecture is more appropriate than AVoIP for the current requirement",
      ],
    };
  }

  if (distanceM > 10) {
    const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
      architecture: "HDBaseT Extension System",
      primaryProducts: ["SW-510-TX", "SW-515-RX"],
      supportingProducts: [],
      reasoning: [
        "Signal distance exceeds a simple local HDMI connection",
        "HDBaseT architecture is more suitable for structured cabling",
        "Good fit for simple single-display extension rooms",
      ],
    };
  }

  const recommendedTier =
  avoipScore >= 6 || input.videoWall || input.advancedMultiview
    ? "Gold"
    : (sources <= 2 && displays <= 2)
      ? "Bronze"
      : "Silver";

return {
  recommendedTier,
    architecture: "Basic Room Switching",
    primaryProducts: ["SW-510-TX"],
    supportingProducts: ["SW-515-RX"],
    reasoning: [
      "Simple wired room requirement",
      "Appropriate for lower source count and straightforward display routing",
      "Provides a practical baseline architecture",
    ],
  };
}