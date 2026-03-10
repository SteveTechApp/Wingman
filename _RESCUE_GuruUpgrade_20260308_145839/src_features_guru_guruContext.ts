export type GuruContext = {
  title: string;
  suggestions: string[];
  quickPrompts: string[];
};

export function getGuruContext(pathname: string): GuruContext {
  const path = pathname.toLowerCase();

  if (path.includes("/discovery")) {
    return {
      title: "Discovery Guidance",
      suggestions: [
        "Capture customer, room, displays, sources, cable distance, and budget before choosing products.",
        "Clarify control, USB, audio, and future expansion requirements early.",
        "Use the discovery answers to narrow product family before SKU selection."
      ],
      quickPrompts: [
        "What should I ask next in Discovery?",
        "Which WyreStorm family suits this room?",
        "What information is still missing?"
      ]
    };
  }

  if (path.includes("/catalog")) {
    return {
      title: "Catalog Guidance",
      suggestions: [
        "Filter by product family first, then compare the likely shortlist.",
        "Select products by room role and transport need, not only by spec.",
        "Add candidate SKUs to the project as you build the shortlist."
      ],
      quickPrompts: [
        "What products fit a meeting room?",
        "Which family should I start with?",
        "What should I shortlist?"
      ]
    };
  }

  if (path.includes("/proposals")) {
    return {
      title: "Proposal Guidance",
      suggestions: [
        "Check BOM quantities, role descriptions, and scope notes before export.",
        "Keep proposal language customer-facing and outcome-led.",
        "Summarise value, architecture, and major assumptions clearly."
      ],
      quickPrompts: [
        "How should I structure this proposal?",
        "What proposal notes should I include?",
        "What should I check before export?"
      ]
    };
  }

  if (path.includes("/room-wizard")) {
    return {
      title: "Room Wizard Guidance",
      suggestions: [
        "Start with room type and use case before moving into solution tier.",
        "Prefer the simplest valid architecture first, then scale if needed.",
        "Use template logic to guide less technical users toward a safe design path."
      ],
      quickPrompts: [
        "Which room template should I use?",
        "Should this be HDBaseT or AVoIP?",
        "What tier should I start with?"
      ]
    };
  }

  if (path.includes("/dashboard")) {
    return {
      title: "Dashboard Guidance",
      suggestions: [
        "Use the dashboard to resume the next task, not to browse everything at once.",
        "Complete Discovery before selecting products or generating proposals.",
        "Treat Dashboard as workflow control, not just a summary page."
      ],
      quickPrompts: [
        "What should I do next?",
        "How do I start a new opportunity?",
        "Which tool should I open first?"
      ]
    };
  }

  return {
    title: "Wingman Guidance",
    suggestions: [
      "Move from Discovery to Design to Proposal in a simple guided flow.",
      "Keep the next action obvious for less technical users.",
      "Use Guru for product direction, workflow guidance, and proposal support."
    ],
    quickPrompts: [
      "What should I do next?",
      "Which tool should I use?",
      "How do I progress this project?"
    ]
  };
}