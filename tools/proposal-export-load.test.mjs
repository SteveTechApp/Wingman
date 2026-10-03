/**
 * Proposal compilation/export load benchmark.
 *
 * Proposal export runs in the CLIENT (the rep's browser builds the DOCX from
 * the stored project via src/wingman2/lib/proposalDocxExport.ts), so there is
 * no server endpoint to load-test — the harness tools/load-test.mjs benchmarks
 * the HTTP flows and this file benchmarks the real export code path that
 * ProposalCompletionWizard / TemplateReviewPage call on every export:
 *
 *   buildProposalDocx(proposal, bomRows, wizard) + Packer.toBuffer(...)
 *
 * Run with more iterations for a proper measurement:
 *   npm run load-test:proposal-export          # LOAD_ITERATIONS=60
 *
 * Under plain `npm test` it runs with a small iteration count (8) as a sanity
 * check that the compile path stays healthy and fast enough to notice drift.
 *
 * Percentiles use the same definitions as tools/load-test.mjs; the reported
 * "payload" is the serialized DOCX size (what a rep would download).
 */

import { Packer } from "docx";
import { describe, expect, it } from "vitest";
// NOTE: tools .mjs files are parsed as plain JavaScript, so no `import type`
// here - the fixture is structurally typed by the modules it feeds.
import { buildProposalDocx } from "../src/wingman2/lib/proposalDocxExport";
import { createProposalWizardDefaults } from "../src/wingman2/lib/proposalWizard";

const ITERATIONS = Number(process.env.LOAD_ITERATIONS) || 8;

function buildFixture() {
  const proposal = {
    title: "Government Control Room - NetworkHD 600",
    summary: "Provide resilient, low-latency routing for a government control room with redundant sources and operator displays.",
    sections: ["Executive Summary", "Scope of Work", "Equipment and Pricing", "Services and Commercial Allowances"],
    products: [
      { sku: "NHD-CTL-PRO-V2", quantity: 1, title: "NetworkHD controller", family: "NetworkHD", category: "AV over IP", status: "recommended", addedAt: "2026-08-06T00:00:00.000Z", source: "Recommendations", evidence: [], cautions: [] },
      { sku: "NHD-621-TX", quantity: 8, title: "NetworkHD 600 4K60 Encoder", family: "NetworkHD", category: "AV over IP", status: "recommended", addedAt: "2026-08-06T00:00:00.000Z", source: "Recommendations", evidence: [], cautions: [] },
      { sku: "NHD-621-RX", quantity: 8, title: "NetworkHD 600 4K60 Decoder", family: "NetworkHD", category: "AV over IP", status: "recommended", addedAt: "2026-08-06T00:00:00.000Z", source: "Recommendations", evidence: [], cautions: [] },
    ],
    assumptions: ["Existing managed network is 1GbE capable.", "Installation takes place outside operating hours.", "Operator displays are provided by a third party."],
    readinessScore: 92,
    companyName: "WyreStorm", preparedBy: "Solutions Team", contactEmail: "sales@wyrestorm.com",
    updatedAt: "2026-08-06T00:00:00.000Z",
    discoveryConversation: [
      { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Control room", note: "Government facility.", confirmed: true, confidence: "high", confidenceScore: 12 },
      { stepId: "sources", question: "How many source positions are likely?", answer: "8-12 sources", note: "Across two operator desks.", confirmed: true, confidence: "high", confidenceScore: 10 },
      { stepId: "displays", question: "How many displays or outputs are needed?", answer: "8 displays", note: "Operator + overview.", confirmed: false, confidence: "low", confidenceScore: 1 },
    ],
    applicationProposal: {
      vertical: "Government", application: "Control room", executiveSummary: "Operational control room with resilient routing.",
      customerNeed: "Maintain operational visibility at all times.", solutionOverview: "Sources route through NetworkHD to operator displays.",
      benefits: [
        { title: "Resilience", detail: "Support continuous operations with redundant paths." },
        { title: "Low latency", detail: "Sub-frame transport for live sources." },
      ],
      userJourney: ["Operators select an operational source and route it to an approved display."],
      technicalFacts: [], architectureDiagram: "Operational sources → NetworkHD 600 fabric → Operator displays",
      acceptanceCriteria: ["All approved source-to-display routes pass functional testing."],
      visualBriefs: [], verifiedDesignParameters: [], deploymentConditions: [],
      marketStory: "The room supports rapid, controlled decision-making.",
      productSpecifications: [
        { sku: "NHD-CTL-PRO-V2", name: "NetworkHD controller", role: "Routing control", quantity: 1, summary: "Controls the NetworkHD system.", keyFeatures: ["Central routing management"], validation: ["Confirm firmware compatibility"] },
        { sku: "NHD-621-TX", name: "NetworkHD 600 encoder", role: "Source encode", quantity: 8, summary: "Encodes sources onto the AV fabric.", keyFeatures: ["4K60 4:4:4"], validation: ["Confirm HDCP requirements"] },
      ],
      thirdPartyScope: [{ category: "Displays", description: "Operator and overview displays", responsibility: "Integrator", status: "allowance", quantity: 8, notes: "Confirm size and mounting." }],
    },
  };

  const bom = [
    { item: 1, sku: "NHD-CTL-PRO-V2", description: "NetworkHD controller", role: "Routing control", qty: 1, type: "Required", status: "included", evidence: "Selected by template", notes: "" },
    { item: 2, sku: "NHD-621-TX", description: "NetworkHD 600 4K60 Encoder", role: "Source encoder", qty: 8, type: "Required", status: "included", evidence: "Selected by template", notes: "" },
    { item: 3, sku: "NHD-621-RX", description: "NetworkHD 600 4K60 Decoder", role: "Display decoder", qty: 8, type: "Required", status: "included", evidence: "Selected by template", notes: "" },
    { item: 4, sku: "CAB-HDMI-5M", description: "HDMI cable 5 m", role: "Cabling", qty: 16, type: "Cabling and consumables", status: "included", evidence: "", notes: "" },
  ];

  const wizard = createProposalWizardDefaults({
    projectId: "government-control-room", projectName: proposal.title, preparedBy: "Solutions Team",
    executiveSummary: proposal.summary, architectureNarrative: "NetworkHD 600 10G AV-over-IP architecture.",
    customerName: "Example Customer",
  });
  wizard.bomUnitPrices = { "NHD-CTL-PRO-V2": "1250.00", "NHD-621-TX": "1895.00", "NHD-621-RX": "1495.00", "CAB-HDMI-5M": "12.50" };

  return { proposal, bom, wizard };
}

function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

describe("proposal DOCX export load", () => {
  it(`compiles and serializes the real proposal DOCX (${ITERATIONS} iterations)`, async () => {
    const { proposal, bom, wizard } = buildFixture();
    const samples = [];
    let lastBuffer = null;

    for (let i = 0; i < ITERATIONS; i += 1) {
      const start = performance.now();
      const buffer = await Packer.toBuffer(buildProposalDocx(proposal, bom, wizard));
      samples.push(performance.now() - start);
      lastBuffer = buffer;
    }

    // Prove the benchmark exercised the real export: a DOCX is a zip archive.
    expect(Buffer.isBuffer(lastBuffer)).toBe(true);
    expect(lastBuffer.length).toBeGreaterThan(10_000);
    expect(lastBuffer.subarray(0, 2).toString("latin1")).toBe("PK");

    const sorted = [...samples].sort((a, b) => a - b);
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const p50 = calculatePercentile(sorted, 50);
    const p95 = calculatePercentile(sorted, 95);
    const p99 = calculatePercentile(sorted, 99);
    const bytes = lastBuffer.length;

    console.log(
      `\n[proposal-export-load] ${ITERATIONS} iterations | DOCX payload ${(bytes / 1024).toFixed(1)} KB\n` +
      `  min ${sorted[0].toFixed(1)}ms | p50 ${p50.toFixed(1)}ms | avg ${avg.toFixed(1)}ms | ` +
      `p95 ${p95.toFixed(1)}ms | p99 ${p99.toFixed(1)}ms | max ${sorted[sorted.length - 1].toFixed(1)}ms | ` +
      `${(ITERATIONS / (samples.reduce((a, b) => a + b, 0) / 1000)).toFixed(1)} exports/s`,
    );

    // Loose upper bound so the check catches catastrophic regressions on any
    // machine without being timing-flaky in CI. The dated budget for this flow
    // lives in docs/LOAD_TESTING.md, not here.
    expect(p99).toBeLessThan(15_000);
    expect(p95).toBeLessThan(10_000);
  });
});
