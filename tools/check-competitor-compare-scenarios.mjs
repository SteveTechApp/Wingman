import { resolveCompetitorIntelligence } from "../server/competitor/compare-intelligence.mjs";

const scenarios = [
  {
    name: "Simple HDMI switcher can match a richer WyreStorm switcher",
    input: {
      brand: "Generic",
      sku: "HDMI-401",
      productName: "4x1 HDMI switcher",
      rawText: "4x1 HDMI switcher, 4 HDMI inputs, 1 HDMI output, 4K60, no wireless casting, no USB-C",
      allowWeb: false,
    },
    expectedStatus: "candidate_match",
    expectedTopSku: "SW-0401-H2",
    minScore: 70,
    forbiddenDifference: /wireless/i,
  },
  {
    name: "8x8 HDBaseT matrix maps to active WyreStorm matrix kit",
    input: {
      brand: "Blustream",
      sku: "C88CS",
      rawText: "8x8 HDBaseT matrix switcher with 8 HDMI inputs and 8 HDBaseT outputs, RS-232, IR, LAN, EDID and HDCP.",
      allowWeb: false,
    },
    expectedStatus: "candidate_match",
    expectedTopSku: "MXV-0808-H2A-KIT",
    minScore: 85,
  },
  {
    name: "HDBaseT 3 extender prioritises the major transport and USB requirement",
    input: {
      brand: "AVPro Edge",
      sku: "AC-EX100-444-R3",
      rawText: "HDBaseT 3.0 extender kit 4K60 4:4:4 HDMI over CAT with USB 3.0, RS-232, IR and LAN. TX and RX set.",
      allowWeb: false,
    },
    expectedStatus: "candidate_match",
    expectedTopSku: "EX-100-USB3",
    minScore: 85,
  },
];

let failed = false;

for (const scenario of scenarios) {
  const result = await resolveCompetitorIntelligence(scenario.input);
  const top = result.wyrestorm?.candidates?.[0];
  const differences = top?.differences || [];
  const score = Number(top?.score || 0);
  const errors = [];

  if (result.wyrestorm?.matchStatus !== scenario.expectedStatus) {
    errors.push(`expected status ${scenario.expectedStatus}, got ${result.wyrestorm?.matchStatus || "none"}`);
  }

  if (top?.sku !== scenario.expectedTopSku) {
    errors.push(`expected top SKU ${scenario.expectedTopSku}, got ${top?.sku || "none"}`);
  }

  if (score < scenario.minScore) {
    errors.push(`expected score >= ${scenario.minScore}, got ${score}`);
  }

  if (!top?.majorMatches?.length) {
    errors.push("expected majorMatches evidence");
  }

  if (scenario.forbiddenDifference && differences.some((item) => scenario.forbiddenDifference.test(item))) {
    errors.push(`forbidden difference present: ${differences.join("; ")}`);
  }

  if (errors.length) {
    failed = true;
    console.log(`FAIL ${scenario.name}`);
    errors.forEach((error) => console.log(`  - ${error}`));
    continue;
  }

  console.log(`PASS ${scenario.name}`);
  console.log(`  ${top.sku} score=${score} fit=${top.fitSummary || "n/a"}`);
}

if (failed) {
  process.exitCode = 1;
}
