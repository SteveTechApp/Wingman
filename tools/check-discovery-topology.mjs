import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const checks = [];

function read(relative) {
  const filePath = path.join(root, relative);

  if (!fs.existsSync(filePath)) {
    failures.push(`Required file missing: ${relative}`);
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function requireText(relative, text, label) {
  const source = read(relative);
  if (!source.includes(text)) failures.push(`${label}: missing ${text}`);
  else checks.push(label);
}

function rejectText(relative, text, label) {
  const source = read(relative);
  if (source.includes(text)) {
    failures.push(`${label}: legacy marker still present: ${text}`);
  } else {
    checks.push(label);
  }
}

// Discovery topology capture.
requireText(
  "src/wingman2/pages/discovery/discoveryQuestions.ts",
  'id: "locations-connections"',
  "Combined discovery step",
);

requireText(
  "src/wingman2/pages/DiscoveryPage.tsx",
  "<DiscoveryLocationsConnections",
  "Topology editor rendering",
);

requireText(
  "src/wingman2/pages/DiscoveryPage.tsx",
  "topology: activeTopology",
  "Project brief topology handoff",
);

rejectText(
  "src/wingman2/pages/discovery/discoveryQuestions.ts",
  'id: "distance"',
  "Legacy distance question removed",
);

rejectText(
  "src/wingman2/pages/discovery/discoveryQuestions.ts",
  'id: "infrastructure"',
  "Legacy infrastructure question removed",
);

rejectText(
  "src/wingman2/pages/discovery/discoveryQuestions.ts",
  'id: "usb-path"',
  "Duplicate USB question removed",
);

// Structured transport model.
requireText(
  "src/wingman2/lib/projectTopology.ts",
  '"hdbaset-3"',
  "HDBaseT 3.0 transport model",
);

requireText(
  "src/wingman2/lib/projectTopology.ts",
  '"fibre-sm"',
  "Single-mode fibre transport model",
);

requireText(
  "src/wingman2/lib/projectTopology.ts",
  '"ip-av-vlan"',
  "AV VLAN transport model",
);

// Canonical visual path.
//
// VisualDesignStudioPage.tsx was retired when Proposal Visuals became the
// canonical visual workspace. Verify the current project-aware schematic chain
// instead of reading the deleted page.
requireText(
  "src/wingman2/pages/ProposalVisualsPage.tsx",
  "buildWholeProjectVisualDiagram",
  "Proposal Visuals project-diagram handoff",
);

requireText(
  "src/wingman2/lib/schematic/wholeProjectVisualDiagram.ts",
  "buildSchematicBriefFromProject",
  "Whole-project schematic adapter handoff",
);

requireText(
  "src/wingman2/lib/schematic/projectToSchematicBrief.ts",
  "project?.discoveryBrief",
  "Saved discovery brief feeds canonical schematic",
);

// Other topology consumers.
requireText(
  "src/wingman2/lib/customRoomTemplates.ts",
  "topology",
  "Template topology persistence",
);

requireText(
  "src/wingman2/lib/recommendationEvidence.ts",
  "projectTopologyEvidenceLines",
  "Recommendation topology evidence",
);

if (failures.length) {
  console.error("[discovery-topology] FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[discovery-topology] PASS (${checks.length} checks)`);