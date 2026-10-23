import { describe, expect, it, vi } from "vitest";
import type { StoredProjectProposal, StoredProductSelection } from "../data/projectStore";
import { buildBomCsv, buildBomRows, buildProposalHtml, exportProposalHtml } from "./proposalExport";
import { defaultWallRequirements, wallCanvasPlan, wallResolutionSummary, type WallRequirements } from "./videowallOptions";
import { wallStartPresets } from "./videowallDecision";
import { wallStartingPointOrigin } from "./wallStartingPointOrigin";

/** A saved wall summary, shaped as the project store writes one. */
function savedWall(overrides: Partial<WallRequirements> = {}) {
  const requirements: WallRequirements = { ...defaultWallRequirements, ...overrides };
  const resolution = wallResolutionSummary(requirements);
  const plan = wallCanvasPlan(requirements);
  return {
    savedAt: "2026-10-19T00:00:00.000Z",
    wallType: requirements.application.startsWith("lcd") ? "lcd" : requirements.application,
    summary: {
      version: 2,
      requirements,
      resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
      canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
    },
  };
}

function wallProposal(): StoredProjectProposal {
  return { title: "Two-way wall", summary: "A large wall.", sections: [], products: [], assumptions: [], updatedAt: "2026-10-19T00:00:00.000Z" };
}

describe("source mapping pair in proposal HTML", () => {
  it("shows fit and fill side by side, each with the share it costs", () => {
    const html = buildProposalHtml(wallProposal(), [], [], null, savedWall({ application: "led", ledCanvasWidth: 1920, ledCanvasHeight: 2160, mapping: "fill" }));

    // One equal column per mapping, so the customer compares them, not reads one.
    expect(html).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(html).toContain('data-mapping-option="fit"');
    expect(html).toContain('data-mapping-option="fill"');
    expect(html).toContain("Leaves 50% of the wall as black bars, 540 px top and bottom.");
    expect(html).toContain("Loses 50% of the picture to the crop, 960 px left and right.");
    // The chosen mapping is marked, and the lead says what the pair is.
    expect(html).toContain("this design uses <strong>Fill</strong>");
    expect(html).toContain("Fill · in this design");
    // Each option carries its own drawing of this wall.
    expect(html).toContain("wall-elevation-bar");
    expect(html).toContain("wall-elevation-crop");
  });

  it("keeps the fit/fill row on one printed page without pinning the schedule to it", () => {
    const html = buildProposalHtml(wallProposal(), [], [], null, savedWall({ application: "led", ledCanvasWidth: 1920, ledCanvasHeight: 2160, mapping: "fill" }));

    // The pair is one unbreakable row: a page break may fall before it, never
    // between Fit and Fill.
    expect(html).toContain(
      'data-mapping-row="fit-fill" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start;break-inside:avoid;page-break-inside:avoid;"',
    );
    // The display schedule after it is not wrapped in an avoid container, so a
    // long wall still starts on the page the comparison row left room on.
    expect(html).not.toMatch(/<table[^>]*(break-inside|page-break-inside)/);
    // The row still sits in the Display Schedule section, ahead of its table.
    const row = html.indexOf('data-mapping-row="fit-fill"');
    expect(row).toBeGreaterThan(html.indexOf("<h2>Display Schedule</h2>"));
    expect(row).toBeLessThan(html.indexOf("<table>", row));
  });

  it("recommends the mapping the captured window plan calls for, and says why", () => {
    const html = buildProposalHtml(wallProposal(), [], [], null, savedWall({
      application: "lcd-loop",
      layout: "quad",
      columns: 4,
      rows: 2,
      windows: 4,
      sources: 4,
    }));

    // A wall built to show four feeds at once must not trim all four of them.
    expect(html).toContain('data-mapping-recommendation="fit"');
    expect(html).toContain("<strong>Recommendation: Fit.</strong>");
    expect(html).toContain("puts 4 windows on the wall from 4 sources");
    // The recommended option is named on its own card as well.
    expect(html).toMatch(/>Fit · in this design · recommended<\/p>/);
  });

  it("prints the pair only when the shapes actually differ", () => {
    const html = buildProposalHtml(wallProposal(), [], [], null, savedWall({ application: "lcd-loop", columns: 2, rows: 2 }));

    expect(html).toContain("Wall elevation");
    expect(html).not.toContain("Source mapping options");
    expect(html).not.toContain('data-mapping-option="fit"');
  });
});

describe("the wall's starting point in the printed proposal", () => {
  const preset = wallStartPresets.find((entry) => entry.key === "two-up")!;

  /** The saved wall for these answers, keeping the card it started on. */
  function wallFromCard(requirements: WallRequirements) {
    const resolution = wallResolutionSummary(requirements);
    const plan = wallCanvasPlan(requirements);
    return {
      savedAt: "2026-10-19T00:00:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements,
        resolution: { canvas: resolution.canvas, display: resolution.display, source: resolution.source, mapping: resolution.label },
        canvasPlan: { canvas: plan.canvas, native: plan.native, perPanel: plan.perPanel, recommended: plan.recommended, rationale: plan.rationale, text: plan.text },
        startingPoint: wallStartingPointOrigin(preset),
      },
    };
  }

  it("names the card the wall started on and the answers the room changed", () => {
    const html = buildProposalHtml(
      wallProposal(),
      [],
      [],
      null,
      wallFromCard({ ...preset.requirements, sources: preset.requirements.sources + 1 }),
    );

    expect(html).toContain(`data-wall-starting-point="${preset.key}"`);
    expect(html).toContain(
      `Started from ${preset.label}. 1 answer changed: Sources: ${preset.requirements.sources} → ${preset.requirements.sources + 1}.`,
    );
    // The record belongs to the wall's own section, not to a footnote elsewhere.
    const record = html.indexOf("data-wall-starting-point=");
    expect(record).toBeGreaterThan(html.indexOf("<h2>Display Schedule</h2>"));
    expect(record).toBeLessThan(html.indexOf("<table>", record));
  });

  it("says the drawing is the card's own design when nothing moved", () => {
    const html = buildProposalHtml(wallProposal(), [], [], null, wallFromCard(preset.requirements));

    expect(html).toContain(`Started from ${preset.label}. No answers changed from the card.`);
  });

  it("prints no record for a wall that never started on a card", () => {
    const html = buildProposalHtml(wallProposal(), [], [], null, savedWall({ application: "lcd-loop", columns: 2, rows: 2 }));

    expect(html).not.toContain("data-wall-starting-point");
  });
});

describe("printed proposal page setup", () => {
  it("gives the printed sheet an A4 page with running header, reference and page numbers", () => {
    const html = buildProposalHtml(wallProposal(), []);

    expect(html).toContain("size: A4;");
    expect(html).toContain('content: "Page " counter(page) " of " counter(pages);');
    expect(html).toContain("@top-left");
    // The running header names the document, not just the company.
    expect(html).toContain("WyreStorm · Two-way wall");
    expect(html).toContain("Proposal Reference: WYR-");
    expect(html).toContain("Draft Proposal ·");
  });

  it("repeats table headings on every printed page and keeps rows whole", () => {
    const html = buildProposalHtml(wallProposal(), []);

    expect(html).toContain("thead { display: table-header-group; break-after: avoid; page-break-after: avoid; }");
    expect(html).toContain("tr, td, th { break-inside: avoid; page-break-inside: avoid; }");
    // A long schedule still breaks between rows instead of being pushed whole.
    expect(html).toContain("table { font-size: 10pt; break-inside: auto; page-break-inside: auto; }");
  });

  it("keeps markup in the title out of the stylesheet", () => {
    const html = buildProposalHtml({ ...wallProposal(), title: 'Quote "x" </style><script>alert(1)</script>' }, []);

    expect(html.match(/<\/style>/g)).toHaveLength(buildProposalHtml(wallProposal(), []).match(/<\/style>/g)!.length);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("\\3c /style\\3e ");
  });
});

describe("BOM export rows", () => {
  it("carries captured quantities instead of assuming one unit per line", () => {
    const products: StoredProductSelection[] = [
      { sku: "NHD-120-TX", title: "NetworkHD 100 encoder", quantity: 4 },
      { sku: "MX-0808-SCL", title: "8x8 matrix", quantity: 1 },
      { sku: "RX-700", title: "HDBaseT receiver" },
    ];

    const rows = buildBomRows(products);
    expect(rows.map((row) => `${row.sku}x${row.qty}`)).toEqual(["NHD-120-TXx4", "MX-0808-SCLx1", "RX-700x1"]);
    expect(buildBomCsv(rows)).toContain('"NHD-120-TX","NetworkHD 100 encoder","Core product","4"');
  });

  it("carries the Compare verdict confidence into the exported evidence basis", () => {
    // The Compare page prepends "Compare verdict: <tier>" to a committed
    // selection's evidence, and the BOM evidence basis takes evidence[0] - so
    // a quoted comparison keeps the same explicit confidence label a rep saw
    // on screen, in both the HTML export and the CSV.
    const products: StoredProductSelection[] = [
      {
        sku: "NHD-500-TX",
        title: "NHD-500-TX AV-over-IP Transmitter",
        status: "recommended",
        evidence: ["Compare verdict: Plausible — confirm", "Technology class matches."],
      },
    ];

    const rows = buildBomRows(products);
    expect(rows[0].evidence).toBe("Compare verdict: Plausible — confirm");
    expect(buildBomCsv(rows)).toContain("Compare verdict: Plausible — confirm");

    const proposal: StoredProjectProposal = {
      title: "Tiered proposal",
      summary: "A quoted comparison.",
      sections: [],
      products,
      assumptions: [],
      updatedAt: "2026-08-16T00:00:00.000Z",
    };
    const html = buildProposalHtml(proposal, buildBomRows(products));
    expect(html).toContain("Compare verdict: Plausible — confirm");
  });
});

describe("discovery conversation in proposal HTML", () => {
  it("renders the discovery Q&A trail when captured", () => {
    const proposal: StoredProjectProposal = {
      title: "Conversation-backed proposal",
      summary: "Meeting room for the exec team.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-08-26T00:00:00.000Z",
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "A boardroom for the exec team.", confirmed: true, confidence: "high", confidenceScore: 12 },
        { stepId: "uc-camera", question: "What camera types are required?", answer: "USB PTZ camera", note: "A usb ptz camera at the front.", confidence: "low", confidenceScore: 1 },
      ],
    };

    const html = buildProposalHtml(proposal, []);
    expect(html).toContain("Discovery Conversation");
    expect(html).toContain("What type of opportunity is this?");
    expect(html).toContain("Meeting room / boardroom");
    expect(html).toContain("A boardroom for the exec team.");
    expect(html).toContain("USB PTZ camera");
    expect(html).toContain("A usb ptz camera at the front.");
    expect(html).toContain("<th>Capture confidence</th>");
    // The trust level (and the score behind it) for each you-said → matched
    // pair is visible — low rows carry the "verify before quote" flag.
    expect(html).toContain("High confidence (12)");
    expect(html).toContain("Low confidence — verify before quote (1)");
  });

  it("marks confirmed rows settled and open rows 'to be confirmed' in the HTML", () => {
    const proposal: StoredProjectProposal = {
      title: "Conversation-backed proposal",
      summary: "Meeting room for the exec team.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-08-26T00:00:00.000Z",
      discoveryConversation: [
        { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "", confirmed: true },
        { stepId: "sources", question: "How many source positions are likely?", answer: "2-4 sources", note: "", confirmed: false },
      ],
    };

    const html = buildProposalHtml(proposal, []);
    expect(html).toContain("Confirmed with customer");
    expect(html).toContain("To be confirmed");
    expect(html).toContain("<th>Status</th>");
    expect(html).toContain("<th>Capture confidence</th>");
    // Rows recorded before confidence existed render an honest placeholder.
    expect(html).toContain("<td>—</td>");
    expect(html).toContain("a partial match we will check with you before quoting");
  });

  it("omits the section entirely when no conversation was captured", () => {
    const proposal: StoredProjectProposal = {
      title: "Plain proposal",
      summary: "Room requirement.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-08-26T00:00:00.000Z",
    };
    const html = buildProposalHtml(proposal, []);
    expect(html).not.toContain("Discovery Conversation");
  });
});

describe("proposal safety standard", () => {
  it("exports the canonical requirement, completeness and product context from one revision", () => {
    const proposal: StoredProjectProposal = { title: "Canonical design", summary: "Room", sections: [], products: [], assumptions: [], updatedAt: "2026-09-07", designRevision: { schemaVersion: 1, revisionId: "dp1-test", contentHash: "dp1-test", projectId: "p", projectName: "Room", compiledAt: "2026-09-07", customerRequirement: "Customer said two displays", interpretedRequirement: "Wingman understood independent destinations", architecture: "Matrix transport", requirements: [{ id: "r", customerStatement: "Two displays", interpretation: "Independent destinations", designConsequence: "Provide two routed outputs", source: "Customer", state: "confirmed", confidence: "high" }], roleCoverage: [{ role: "destination", label: "Displays and destinations", required: true, covered: true, evidence: ["2 × outputs"], requirementIds: ["r"] }], productOverviews: [{ sku: "MX-0402-MST", name: "Matrix", quantity: 1, designRole: "Routing", requirementIds: ["r"], reason: "Serves two independent displays", proof: ["Two routed outputs"], dependencies: [], validation: [] }], assumptions: [], blockers: [], warnings: [], canIssue: true } };
    const html = buildProposalHtml(proposal, []);
    expect(html).toContain("What You Asked For and How We Designed It");
    expect(html).toContain("System Completeness");
    expect(html).toContain("Products and Their Role");
    expect(html).toContain("dp1-test");
    expect(html).toContain("Serves two independent displays");
  });

  it("separates every required customer-safe output section", () => {
    const proposal: StoredProjectProposal = {
      title: "Test proposal",
      summary: "Confirmed room requirement.",
      sections: [],
      products: [],
      assumptions: ["Display location requires confirmation."],
      updatedAt: "2026-06-28T00:00:00.000Z",
    };

    const html = buildProposalHtml(proposal, []);
    for (const heading of [
      "Executive Summary",
      "What You Asked For",
      "Recommended Solution",
      "Practical Operation",
      "Commercial and Operational Benefits",
      "Technical Architecture",
      "Equipment Schedule",
      "Options",
      "Assumptions and Exclusions",
      "Risks and Dependencies",
      "Implementation and Next Steps",
    ]) {
      expect(html).toContain(`<h2>${heading}</h2>`);
    }
  });

  it("labels assumptions, risks and options rather than blending them into prose", () => {
    const proposal: StoredProjectProposal = {
      title: "Labelled proposal",
      summary: "Confirmed requirement for a labelled test.",
      sections: [],
      products: [],
      assumptions: ["Assume the network is AV-over-IP ready."],
      governanceWarnings: ["Confirm cable distance before order."],
      updatedAt: "2026-06-28T00:00:00.000Z",
    };

    const html = buildProposalHtml(proposal, [
      {
        item: 1,
        sku: "NHD-500-TX",
        description: "NetworkHD 500 encoder",
        role: "Source endpoint",
        qty: 2,
        type: "Optional",
        status: "optional",
        evidence: "Assumes two sources.",
        notes: "Confirm source count.",
      },
    ]);

    expect(html).toContain("<strong>Assumption:</strong>");
    expect(html).toContain("<strong>Risk:</strong>");
    expect(html).toContain("<strong>Option:</strong>");
  });

  it("carries the best-efforts disclaimer in the HTML body", () => {
    const proposal: StoredProjectProposal = {
      title: "Disclaimer proposal",
      summary: "Confirmed requirement.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-06-28T00:00:00.000Z",
    };

    const html = buildProposalHtml(proposal, []);
    expect(html).toContain('data-wingman-best-efforts-disclaimer="true"');
    expect(html).toContain("Best-Efforts Disclaimer");
    expect(html).toContain("best-efforts basis");
    expect(html).toContain("independently verified against the current official WyreStorm documentation");
    expect(html).toContain("not be liable");
  });

  it("lists BY-OTHERS rows as explicit exclusions from the WyreStorm scope", () => {
    const proposal: StoredProjectProposal = {
      title: "Exclusions proposal",
      summary: "Confirmed requirement.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-06-28T00:00:00.000Z",
    };

    const html = buildProposalHtml(proposal, [
      {
        item: 1,
        sku: "BY-OTHERS-NETWORK-INFRASTRUCTURE",
        description: "Managed network switch and configuration",
        role: "Network infrastructure by others",
        qty: 1,
        type: "Validate",
        status: "validate",
        evidence: "Placeholder row.",
        notes: "Confirm switch model.",
      },
    ]);

    expect(html).toContain("Required to complete the AV system, supplied by the named third parties");
    expect(html).toContain("BY-OTHERS-NETWORK-INFRASTRUCTURE");
  });
});

describe("power strategy section", () => {
  it("includes a Power Strategy heading when products are provided", () => {
    const products: StoredProductSelection[] = [
      { sku: "AMP-2120-DNT", title: "AMP-2120-DNT amplifier", quantity: 1 },
    ];
    const proposal: StoredProjectProposal = {
      title: "Power proposal",
      summary: "Test power section.",
      sections: [],
      products,
      assumptions: [],
      updatedAt: "2026-08-23T00:00:00.000Z",
    };
    const html = buildProposalHtml(proposal, [], products);
    expect(html).toContain("<h2>Power Strategy</h2>");
    expect(html).toContain("AMP-2120-DNT");
    expect(html).toContain("come from WyreStorm product data");
  });

  it("renders per-SKU wattage and total from governed profiles", () => {
    const products: StoredProductSelection[] = [
      { sku: "AMP-2120-DNT", title: "AMP-2120-DNT amplifier", quantity: 1 },
      { sku: "AMP-2120-DNT", title: "AMP-2120-DNT amplifier", quantity: 2 },
    ];
    const proposal: StoredProjectProposal = {
      title: "Multi-unit power",
      summary: "Test summed power.",
      sections: [],
      products,
      assumptions: [],
      updatedAt: "2026-08-23T00:00:00.000Z",
    };
    const html = buildProposalHtml(proposal, [], products);
    expect(html).toContain("Per-unit max");
    expect(html).toContain("Total max");
    // AMP-2120-DNT has "Max 120W" via 24V DC 5A (120W)
    expect(html).toContain("120W");
    // 3 units × 120W = 360W total
    expect(html).toContain("360W");
    expect(html).toContain("approximately");
  });

  it("shows PoE audit when products use PoE/PoH", () => {
    const products: StoredProductSelection[] = [
      { sku: "NHD-120-TX", title: "NHD-120-TX encoder", quantity: 1 },
    ];
    const proposal: StoredProjectProposal = {
      title: "PoE proposal",
      summary: "Test PoE audit.",
      sections: [],
      products,
      assumptions: [],
      updatedAt: "2026-08-23T00:00:00.000Z",
    };
    const html = buildProposalHtml(proposal, [], products);
    expect(html).toContain("PoE/PoH");
    expect(html).toContain("injector or switch PoE budget");
  });

  it("omits the power section when no products are selected", () => {
    const proposal: StoredProjectProposal = {
      title: "Empty proposal",
      summary: "No products.",
      sections: [],
      products: [],
      assumptions: [],
      updatedAt: "2026-08-23T00:00:00.000Z",
    };
    const html = buildProposalHtml(proposal, []);
    // Power Strategy heading should still appear but with a fallback message
    expect(html).toContain("<h2>Power Strategy</h2>");
    expect(html).toContain("No products have been selected");
  });
});

describe("proposal export gate on wall cable runs", () => {
  it("refuses the HTML export and names the over-limit link with its fix", async () => {
    await expect(exportProposalHtml(wallProposal(), [], [], savedWall({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 1,
      sources: 2,
      windows: 2,
      measuredRuns: { "display-2": 40 },
    }))).rejects.toThrow(/Proposal export blocked — 1 issue to resolve first\. Panel 2 cannot carry its run[\s\S]*Fix: Use an active or fibre HDMI cable/);
  });

  it("lets a wall whose runs fit export as before", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wingman-wall-test");
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    try {
      await exportProposalHtml(wallProposal(), [], [], savedWall({
        application: "lcd-direct",
        layout: "independent",
        columns: 2,
        rows: 1,
        sources: 2,
        windows: 2,
        measuredRuns: { "display-1": 3, "display-2": 3 },
      }));
      expect(createSpy).toHaveBeenCalled();
    } finally {
      createSpy.mockRestore();
    }
  });
});

describe("proposal export gate on wall cable runs", () => {
  it("refuses the HTML export and names the over-limit link with its fix", async () => {
    await expect(exportProposalHtml(wallProposal(), [], [], savedWall({
      application: "lcd-direct",
      layout: "independent",
      columns: 2,
      rows: 1,
      sources: 2,
      windows: 2,
      measuredRuns: { "display-2": 40 },
    }))).rejects.toThrow(/Proposal export blocked — 1 issue to resolve first\. Panel 2 cannot carry its run[\s\S]*Fix: Use an active or fibre HDMI cable/);
  });

  it("lets a wall whose runs fit export as before", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wingman-wall-test");
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
    try {
      await exportProposalHtml(wallProposal(), [], [], savedWall({
        application: "lcd-direct",
        layout: "independent",
        columns: 2,
        rows: 1,
        sources: 2,
        windows: 2,
        measuredRuns: { "display-1": 3, "display-2": 3 },
      }));
      expect(createSpy).toHaveBeenCalled();
    } finally {
      createSpy.mockRestore();
    }
  });
});

describe("proposal download (blob URL lifecycle)", () => {
  it("defers the blob-URL revoke until after the download task starts", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wingman-proposal-test");
    const revokeSpy = vi.fn();
    // revokeObjectURL is inherited in this environment; install an own,
    // spyable version so the deferred revoke can be observed.
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeSpy });
    try {
      const proposal: StoredProjectProposal = {
        title: "Download test proposal",
        summary: "A room requirement.",
        sections: [],
        products: [],
        assumptions: [],
        updatedAt: "2026-08-26T00:00:00.000Z",
      };
      await exportProposalHtml(proposal, []);

      // Inside the synchronous handler the URL must still be live: the revoke
      // is deferred to the next task so the browser can begin the download
      // fetch against it (see SavedComparisonHistory.exportCsv).
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
      expect(revokeSpy).not.toHaveBeenCalled();

      // Once the task queue drains, the exact created URL is revoked.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(revokeSpy).toHaveBeenCalledWith("blob:wingman-proposal-test");
    } finally {
      Reflect.deleteProperty(URL, "revokeObjectURL");
      vi.restoreAllMocks();
    }
  });
});
