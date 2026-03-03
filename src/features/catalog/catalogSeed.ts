export type CatalogEntry = {
  id: string;
  name: string;
  family: string;
  useCase: string;
  summary: string;
  tags: string[];
  nextLabel: string;
  nextRoute: string;
};

export const CATALOG_SEED: CatalogEntry[] = [
  {
    id: "av-over-ip",
    name: "AV over IP",
    family: "NetworkHD / AVoIP",
    useCase: "Scalable distribution across multiple rooms or endpoints",
    summary: "Best for flexible signal distribution where scale, switching, and expansion matter more than point-to-point simplicity.",
    tags: ["AVoIP", "scalable", "multi-endpoint", "distribution"],
    nextLabel: "Open Templates",
    nextRoute: "/app/templates",
  },
  {
    id: "hdbaset-extension",
    name: "Point-to-point extension",
    family: "HDBaseT / Extension",
    useCase: "Simple source-to-display extension across distance",
    summary: "Best when the requirement is a cleaner direct extension path with fewer moving parts than a wider switching system.",
    tags: ["HDBaseT", "extension", "distance", "display"],
    nextLabel: "Open Room Wizard",
    nextRoute: "/app/tools/room",
  },
  {
    id: "matrix-switching",
    name: "Matrix switching",
    family: "Switching / Matrix",
    useCase: "Multiple sources to multiple displays with controlled routing",
    summary: "Best when the customer needs structured routing logic, source flexibility, and a defined switching core.",
    tags: ["matrix", "routing", "sources", "displays"],
    nextLabel: "Open Proposal Builder",
    nextRoute: "/app/tools/proposal",
  },
  {
    id: "byod-room",
    name: "BYOD room systems",
    family: "Collaboration / Room Systems",
    useCase: "Meeting rooms where user-device flexibility matters",
    summary: "Best when the requirement starts with collaboration, laptop connectivity, and practical in-room usability.",
    tags: ["BYOD", "meeting room", "USB-C", "collaboration"],
    nextLabel: "Open Templates",
    nextRoute: "/app/templates",
  },
  {
    id: "competitor-replacement",
    name: "Competitor replacement",
    family: "Migration / Cross-reference",
    useCase: "Customer already has another brand in mind",
    summary: "Best when the conversation starts with a competitor SKU or an installed-base reference point.",
    tags: ["competitor", "replacement", "cross-reference", "migration"],
    nextLabel: "Open Competitor Compare",
    nextRoute: "/app/tools/competitor",
  },
  {
    id: "video-wall",
    name: "Video wall and multiview",
    family: "Processing / Video Wall",
    useCase: "Large format display layouts or specialist visual arrangements",
    summary: "Best when the requirement includes video wall layouts, display processing, or more advanced display logic.",
    tags: ["videowall", "multiview", "processing", "display"],
    nextLabel: "Open Video Wall Planner",
    nextRoute: "/app/tools/videowall",
  },
  {
    id: "sales-guidance",
    name: "Sales guidance",
    family: "Advisory / Assisted Selection",
    useCase: "User needs help deciding where to start",
    summary: "Best when the user needs guided product direction instead of manually choosing a path.",
    tags: ["guidance", "assistant", "pre-sales", "advice"],
    nextLabel: "Open Guru",
    nextRoute: "/app/tools/guru",
  },
  {
    id: "training-reference",
    name: "Training and reference",
    family: "Enablement / Knowledge",
    useCase: "User wants to understand concepts before configuring products",
    summary: "Best when the user needs confidence, terminology, or pre-sales understanding before selecting equipment.",
    tags: ["training", "reference", "enablement", "knowledge"],
    nextLabel: "Open Training Hub",
    nextRoute: "/app/tools/training",
  },
];