export type GuruContext = {
  title: string;
  suggestions: string[];
};

export function getGuruContext(pathname: string): GuruContext {
  const path = pathname.toLowerCase();

  if (path.includes("/dashboard")) {
    return {
      title: "Dashboard Guidance",
      suggestions: [
        "Start a new project or resume an active opportunity.",
        "Complete Discovery before selecting products.",
        "Use ToolHub if you are unsure which workflow step comes next.",
      ],
    };
  }

  if (path.includes("/discovery")) {
    return {
      title: "Discovery Guidance",
      suggestions: [
        "Capture customer, room, displays, sources, cable distance, and budget.",
        "Ask about control, USB, audio, and future expansion.",
        "Use discovery answers to narrow the likely product family.",
      ],
    };
  }

  if (path.includes("/room-wizard")) {
    return {
      title: "Room Wizard Guidance",
      suggestions: [
        "Start with market and room type before choosing a solution tier.",
        "Use the simplest valid architecture first.",
        "Compare Bronze, Silver, and Gold only after the room type is clear.",
      ],
    };
  }

  if (path.includes("/catalog")) {
    return {
      title: "Catalog Guidance",
      suggestions: [
        "Filter by product family before scanning individual SKUs.",
        "Choose products based on room role, not just specification.",
        "Add shortlist items to the project BOM as you go.",
      ],
    };
  }

  if (path.includes("/proposals")) {
    return {
      title: "Proposal Guidance",
      suggestions: [
        "Check BOM quantities and role descriptions before export.",
        "Keep commercial notes concise and customer-facing.",
        "Summarise business value, not just product features.",
      ],
    };
  }

  if (path.includes("/competitor")) {
    return {
      title: "Competitor Guidance",
      suggestions: [
        "Lead with the nearest WyreStorm equivalent.",
        "Explain the replacement pathway, not just the SKU difference.",
        "Use comparison to support sales confidence and objection handling.",
      ],
    };
  }

  if (path.includes("/templates")) {
    return {
      title: "Template Guidance",
      suggestions: [
        "Choose template by market, room type, and expected user experience.",
        "Start with the nearest standard design before customising.",
        "Use templates to speed up non-technical sales support.",
      ],
    };
  }

  if (path.includes("/projects")) {
    return {
      title: "Project Guidance",
      suggestions: [
        "Resume the most recent active workspace first.",
        "Keep stage, status, and next action visible.",
        "Use project structure to track Discovery, Design, and Proposal.",
      ],
    };
  }

  return {
    title: "Wingman Guidance",
    suggestions: [
      "Use Guru to guide the next workflow step.",
      "Keep the task obvious and avoid jumping ahead.",
      "Move from Discovery to Design to Proposal.",
    ],
  };
}