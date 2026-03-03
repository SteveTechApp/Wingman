export type GuruMode = "ask" | "resources" | "project-check";

export type GuruAnswer = {
  text: string;
  sources?: Array<{ title: string; kind: "training" | "video" | "doc" | "link"; to?: string; url?: string }>;
  confidence?: "low" | "medium" | "high";
};

export type GuruContext = {
  mode: GuruMode;
  // Optional project/design context passed by callers later
  room?: any;
  videowall?: any;
  bom?: any;
  notes?: string;
};

/**
 * Stubbed AI call for Phase 2 wiring.
 * Next step: connect to your real AI service (Gemini/OpenAI/etc) + internal WyreStorm knowledge base.
 */
export async function askGuru(question: string, ctx: GuruContext): Promise<GuruAnswer> {
  const q = (question || "").trim();
  if (!q) return { text: "Ask a question to get started.", confidence: "low" };

  // Lightweight heuristics for immediate usefulness (no external AI yet)
  const lower = q.toLowerCase();

  const sources: GuruAnswer["sources"] = [];
  if (lower.includes("videowall") || lower.includes("video wall") || lower.includes("led") || lower.includes("lcd")) {
    sources.push(
      { title: "Video Wall Planner (Tool)", kind: "training", to: "/app/toolhub/videowall-next" },
      { title: "Video Wall Basics (Training)", kind: "training", to: "/training" }
    );
  }
  if (lower.includes("proposal") || lower.includes("bom")) {
    sources.push({ title: "Proposal Builder (Tool)", kind: "training", to: "/app/toolhub/proposal-next" });
  }
  if (lower.includes("price") || lower.includes("pricing")) {
    sources.push({ title: "Product Catalog (Tool)", kind: "training", to: "/app/toolhub/products" });
  }

  // WyreStorm product hints (expand later)
  if (lower.includes("sw-620") || lower.includes("synergy")) {
    return {
      text:
        "SW-620-TX-W (Synergy) is a 2-input 4K60 presentation switcher with USB-C MST + 100W PD, multiview, and wireless presentation support. For exact I/O, supported resolutions, and system topology, connect Guru to the product database next (Phase 3).",
      sources,
      confidence: "medium"
    };
  }

  return {
    text:
      "Guru is installed and ready. Phase 2 provides the always-available helper UI, tool links, and scaffolding. Next step is connecting Guru to your AI service + WyreStorm knowledge base so answers can be product-accurate and reference sources.",
    sources,
    confidence: "low"
  };
}
