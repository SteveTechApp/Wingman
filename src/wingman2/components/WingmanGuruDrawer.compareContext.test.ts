import { describe, expect, it } from "vitest";

import { answerCompareProductManagerQuestion } from "./WingmanGuruDrawer";

const compareContext = [
  "Act as the WyreStorm technical product manager for this Wingman Compare result.",
  "Result status: Further checks required.",
  "Competitor: Atlona AT-OME-CS31-SA - Three-input HDMI switcher with USB and amplification.",
  "WyreStorm direction: MX-0402-MST - 4x2 multi-input conference-room switcher.",
  "Core requirement: switch several room sources to two independent displays and preserve USB conferencing.",
  "Match evidence: Technology class matches | Independent dual-display switching is supported.",
  "Important differences: Amplification is not integrated | Exact USB host switching behaviour needs confirmation.",
  "Dependencies and checks: Confirm the external audio system | Confirm MST support on the customer laptop.",
  "Response request: Explain why this option is being considered.",
].join(" ");

describe("Guru Compare product-manager context", () => {
  it("answers the complete product comparison instead of the first glossary acronym", () => {
    const answer = answerCompareProductManagerQuestion(compareContext, [], compareContext);

    expect(answer).toContain("MX-0402-MST - product-manager view");
    expect(answer).toContain("Why it is being considered");
    expect(answer).toContain("Nuanced differences");
    expect(answer).toContain("Dependencies before quote");
    expect(answer).toContain("Ask the customer next");
    expect(answer).not.toMatch(/^MST\s+MST means/i);
  });

  it("uses retained comparison context for a focused follow-up", () => {
    const answer = answerCompareProductManagerQuestion(
      "What are the important differences?",
      [],
      compareContext,
    );

    expect(answer).toContain("Atlona AT-OME-CS31-SA");
    expect(answer).toContain("versus MX-0402-MST");
    expect(answer).toContain("Amplification is not integrated");
    expect(answer).toContain("Ask me to go deeper on I/O, topology, USB, control or customer-facing positioning.");
  });
});
