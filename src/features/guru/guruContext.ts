export type GuruSuggestion = {
  title: string;
  copy: string;
};

export type GuruContext = {
  heading: string;
  body: string;
  suggestions: GuruSuggestion[];
};

export function getGuruContext(pathname: string): GuruContext {
  if (pathname.startsWith("/app/tools/discovery")) {
    return {
      heading: "Discovery guidance",
      body: "Capture the application first, then validate routing complexity, distance, USB needs and whether the network is suitable for AVoIP.",
      suggestions: [
        { title: "Ask about network", copy: "Confirm whether an AV VLAN or managed switch is available before leaning into AVoIP." },
        { title: "Check future growth", copy: "Expansion plans often change the correct architecture." },
        { title: "Avoid product-first design", copy: "Start from room behaviour, not from a preferred SKU." },
      ],
    };
  }

  if (pathname.startsWith("/app/tools/proposal")) {
    return {
      heading: "Proposal guidance",
      body: "Use the proposal page to explain why the recommendation is correct, why the tier is appropriate, and what must be confirmed before quote issue.",
      suggestions: [
        { title: "Use the tier properly", copy: "Bronze is lean, Silver is balanced, Gold is premium and future-ready." },
        { title: "Tell the story", copy: "Explain why this architecture fits the room better than a simpler or more complex alternative." },
        { title: "Review BOM logic", copy: "Check the bill of materials against the real workflow, not just the room quantity." },
      ],
    };
  }

  if (pathname.startsWith("/app/tools/video-wall")) {
    return {
      heading: "Video wall guidance",
      body: "Decide whether this is a fixed-layout wall, an advanced multiview wall, or a scalable AVoIP wall before selecting the BOM.",
      suggestions: [
        { title: "Fixed or flexible?", copy: "Processor-led walls are often better for simpler fixed layouts." },
        { title: "AVoIP only when justified", copy: "Use AVoIP when scale, flexibility or multiview genuinely matter." },
        { title: "Confirm content format", copy: "Wall aspect ratio, source count and layout behaviour drive the right choice." },
      ],
    };
  }

  if (pathname.startsWith("/app/tools/sales")) {
    return {
      heading: "Sales guidance",
      body: "Position the recommendation around application fit, user experience and lower design risk rather than only technical features.",
      suggestions: [
        { title: "Why WyreStorm", copy: "Use the practical single-vendor story across switching, transport, wall and control." },
        { title: "Challenge over-design", copy: "A more complex system is not always the better commercial answer." },
        { title: "Protect the quote", copy: "Confirm the key workflow assumptions before commercial issue." },
      ],
    };
  }

  if (pathname.startsWith("/app/dashboard")) {
    return {
      heading: "Mission control",
      body: "Start from the stage of the opportunity. Discovery is for qualification, Proposal is for output, Video Wall is for canvas-led design.",
      suggestions: [
        { title: "New enquiry", copy: "Start in Discovery or the project launcher." },
        { title: "Known room type", copy: "Use a template or jump straight into the right specialist tool." },
        { title: "Customer-facing output", copy: "Move into Proposal once the architecture is stable." },
      ],
    };
  }

  return {
    heading: "Wingman Guru",
    body: "Use Wingman as a guided AV design and sales assistant. Start with requirements, validate architecture, then produce a commercial output.",
    suggestions: [
      { title: "Capture first", copy: "Discovery should define architecture before product choice." },
      { title: "Use the right tool", copy: "Choose Proposal, Video Wall or Sales based on the opportunity stage." },
      { title: "Keep it practical", copy: "The best system is the one that fits the application with the right level of complexity." },
    ],
  };
}