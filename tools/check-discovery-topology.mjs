import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const checks = [];

function requireText(relative, text, label) {
  const source = read(relative);
  if (!source.includes(text)) failures.push(`${label}: missing ${text}`);
  else checks.push(label);
}

function rejectText(relative, text, label) {
  const source = read(relative);
  if (source.includes(text)) failures.push(`${label}: legacy marker still present: ${text}`);
  else checks.push(label);
}

requireText("src/wingman2/pages/DiscoveryPage.tsx", 'id: "locations-connections"', "Combined discovery step");
requireText("src/wingman2/pages/DiscoveryPage.tsx", "<DiscoveryLocationsConnections", "Topology editor rendering");
requireText("src/wingman2/pages/DiscoveryPage.tsx", "topology: activeTopology", "Project brief topology handoff");
rejectText("src/wingman2/pages/DiscoveryPage.tsx", 'id: "distance"', "Legacy distance question removed");
rejectText("src/wingman2/pages/DiscoveryPage.tsx", 'id: "infrastructure"', "Legacy infrastructure question removed");
rejectText("src/wingman2/pages/DiscoveryPage.tsx", 'id: "usb-path"', "Duplicate USB question removed");
requireText("src/wingman2/lib/projectTopology.ts", '"hdbaset-3"', "HDBaseT 3.0 transport model");
requireText("src/wingman2/lib/projectTopology.ts", '"fibre-sm"', "Single-mode fibre transport model");
requireText("src/wingman2/lib/projectTopology.ts", '"ip-av-vlan"', "AV VLAN transport model");
requireText("src/wingman2/pages/VisualDesignStudioPage.tsx", "buildProjectTopologyDiagram", "Visual Design topology handoff");
requireText("src/wingman2/lib/customRoomTemplates.ts", "topology", "Template topology persistence");
requireText("src/wingman2/lib/recommendationEvidence.ts", "projectTopologyEvidenceLines", "Recommendation topology evidence");

if (failures.length) {
  console.error("[discovery-topology] FAILED");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`[discovery-topology] PASS (${checks.length} checks)`);
