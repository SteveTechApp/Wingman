export type ProposalSection = {
  heading: string;
  content: string;
};

export type ProposalResponse = {
  ok: true;
  mode: "deterministic-fallback";
  service: "proposalService";
  title: string;
  sections: ProposalSection[];
  assumptions: string[];
};

function readField(input: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
}

export async function generateProposal(input: unknown): Promise<ProposalResponse> {
  const source = (input && typeof input === "object") ? (input as Record<string, unknown>) : {};

  const customer = readField(source, ["customer", "client", "customerName"], "Sample customer");
  const roomName = readField(source, ["room", "roomName", "applicationType"], "AV Room");
  const tier = readField(source, ["tier", "selectedTier"], "Silver");
  const objective = readField(
    source,
    ["objective", "summary", "notes", "solutionOverview"],
    "Deliver a reliable, supportable AV workflow aligned to the captured requirements."
  );

  return {
    ok: true,
    mode: "deterministic-fallback",
    service: "proposalService",
    title: `${customer} - ${roomName} - ${tier} Proposal Draft`,
    sections: [
      {
        heading: "Executive Summary",
        content: objective,
      },
      {
        heading: "Recommended Solution Direction",
        content: `This fallback proposal recommends a ${tier.toLowerCase()}-tier design direction with clear transport, switching, and supportability priorities.`,
      },
      {
        heading: "Delivery Notes",
        content: "Final pricing, labour, and cable-route validation should be completed before issue to customer.",
      },
    ],
    assumptions: [
      "Deterministic fallback mode generated this proposal structure.",
      "Commercial values and final SKU selections are not included in this fallback response.",
    ],
  };
}
