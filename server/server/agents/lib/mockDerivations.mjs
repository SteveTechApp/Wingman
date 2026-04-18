import { clampConfidence, uniqueStrings } from "./json.mjs";

function findNumberNear(text, keywords = []) {
  const source = String(text || "");
  for (const keyword of keywords) {
    const pattern = new RegExp(`(\\d+)\\s*(?:x\\s*\\d+\\s*)?(?:${keyword})`, "i");
    const match = source.match(pattern);
    if (match) return Number(match[1]);
  }

  const reversePatterns = keywords.map((keyword) => new RegExp(`${keyword}\\s*(?:count|qty|quantity)?\\s*[:=-]?\\s*(\\d+)`, "i"));
  for (const pattern of reversePatterns) {
    const match = source.match(pattern);
    if (match) return Number(match[1]);
  }

  return null;
}

function detectVideoWallLayout(text) {
  const source = String(text || "").toLowerCase();
  const layoutMatch = source.match(/\b(2x2|3x3|4x4|4x2)\b/);
  if (layoutMatch) return layoutMatch[1];
  if (source.includes("video wall")) return "custom";
  return "none";
}

function detectRoomType(text) {
  const source = String(text || "").toLowerCase();
  if (source.includes("boardroom")) return "boardroom";
  if (source.includes("classroom")) return "classroom";
  if (source.includes("control room")) return "control-room";
  if (source.includes("retail")) return "retail";
  if (source.includes("hospitality")) return "hospitality";
  if (source.includes("residential")) return "residential";
  if (source.includes("meeting")) return "meeting-room";
  return "unknown";
}

function detectIntent(text) {
  const source = String(text || "").toLowerCase();
  if (source.includes("video wall")) return "video-wall";
  if (source.includes("avoip") || source.includes("av over ip")) return "avoip";
  if (source.includes("matrix")) return "matrix";
  if (source.includes("splitter")) return "splitter";
  if (source.includes("presentation")) return "presentation-switching";
  if (source.includes("extender") || source.includes("hdbaset")) return "extender";
  return "unknown";
}

function detectBudget(text) {
  const source = String(text || "").toLowerCase();
  if (source.includes("budget") || source.includes("value") || source.includes("cost sensitive")) return "entry";
  if (source.includes("premium") || source.includes("high performance")) return "premium";
  if (source.includes("mid")) return "mid";
  return "unknown";
}

function detectPriority(text) {
  const source = String(text || "").toLowerCase();
  if (source.includes("budget") || source.includes("cost")) return "cost";
  if (source.includes("simple") || source.includes("easy")) return "simplicity";
  if (source.includes("flexible") || source.includes("expand")) return "flexibility";
  if (source.includes("quality") || source.includes("performance")) return "performance";
  return "unknown";
}

function detectMaxDistance(text) {
  const source = String(text || "");
  const match = source.match(/(\d+)\s*(m|meter|metre)/i);
  return match ? Number(match[1]) : 0;
}

export function deriveDiscoveryFromInput({ userInput, context = {} }) {
  const source = `${userInput || ""} ${JSON.stringify(context || {})}`;
  const videoWallLayout = detectVideoWallLayout(source);
  const videoWall = videoWallLayout !== "none";
  const sourceCount = findNumberNear(source, ["source", "input"]) || 0;
  const displayCount = findNumberNear(source, ["display", "screen", "monitor", "output"]) || 0;

  const missingInformation = [];
  if (!sourceCount) missingInformation.push("source count");
  if (!displayCount && !videoWall) missingInformation.push("display count");
  if (!detectMaxDistance(source)) missingInformation.push("maximum cable distance");
  if (!/usb/i.test(source)) missingInformation.push("USB requirement");
  if (!/control/i.test(source)) missingInformation.push("control requirement");

  const assumptions = [];
  if (!displayCount && videoWall) assumptions.push("Display count assumed from video wall layout.");
  if (!findNumberNear(source, ["zone"])) assumptions.push("Single zone assumed unless otherwise stated.");

  const inferredDisplayCount =
    displayCount ||
    (videoWallLayout === "2x2" ? 4 :
      videoWallLayout === "3x3" ? 9 :
      videoWallLayout === "4x4" ? 16 :
      videoWallLayout === "4x2" ? 8 : 0);

  return {
    briefVersion: "1.0",
    summary: `Structured brief created from user input for a ${detectRoomType(source)} application.`,
    solutionIntent: detectIntent(source),
    roomProfile: {
      roomType: detectRoomType(source),
      displayCount: inferredDisplayCount,
      sourceCount,
      zones: findNumberNear(source, ["zone"]) || 1,
      maxDistanceM: detectMaxDistance(source),
      videoWall,
      videoWallLayout,
      usbRequired: /usb/i.test(source),
      audioBreakoutRequired: /audio breakout|de-embed|extract/i.test(source),
      controlRequired: /control/i.test(source),
    },
    commercialProfile: {
      budgetLevel: detectBudget(source),
      priority: detectPriority(source),
    },
    constraints: uniqueStrings([
      /network/i.test(source) ? "Network design may influence topology choice." : "",
      /budget|cost/i.test(source) ? "Commercial sensitivity noted." : "",
    ]).map((detail) => ({ type: detail.includes("Commercial") ? "budget" : "network", detail })),
    missingInformation,
    assumptions,
    confidence: clampConfidence(1 - missingInformation.length * 0.08, 0.62),
    recommendedNextAction: "architect",
  };
}

export function deriveArchitectureFromBrief({ brief, catalogMatches: _catalogMatches = [], compatibilityRules = [], videoWallRules = [], options = {} }) {
  const room = brief?.roomProfile || {};
  const commercial = brief?.commercialProfile || {};
  const recommendations = [];
  const alternatives = [];
  const risks = [];
  const designNotes = [];
  const assumptions = [...(brief?.assumptions || [])];
  const openQuestions = [...(brief?.missingInformation || [])];

  let family = "unknown";
  let topology = "Undetermined topology";
  let rationale = "Insufficient structured data.";

  const pushSku = (sku, role, qty, reason, confidence = 0.78) => {
    recommendations.push({ sku, role, qty, reason, confidence: clampConfidence(confidence) });
  };

  if (room.videoWall) {
    if (options?.preferValueEngineering || commercial?.priority === "cost" || commercial?.budgetLevel === "entry") {
      family = "video-wall-processor";
      topology = "Dedicated video wall processor with point-to-point display feeds.";
      rationale = "Budget-sensitive video wall use case favours a simpler dedicated processor path before higher-flexibility AVoIP options.";
      pushSku("SW-0206-VW", "processor", 1, "Dedicated non-AVoIP video wall option for suitable wall layouts.", 0.84);
      if ((room.sourceCount || 0) <= 4) {
        pushSku("NHD-0401-MV", "processor", 1, "Value-engineered multiview/input aggregation option for simple walls or LED input applications.", 0.72);
      }
      alternatives.push({
        family: "AVoIP-500",
        reason: "Choose this when routing flexibility or future growth matters more than lowest system cost.",
        tradeOffs: ["Higher network complexity", "Higher hardware count"],
      });
    } else {
      family = room.sourceCount > 9 ? "AVoIP-600" : "AVoIP-500";
      topology = "AV over IP encoder/decoder topology for distributed wall control.";
      rationale = "Video wall scope and flexibility requirements favour an AVoIP architecture.";
      if (family === "AVoIP-600") {
        pushSku("NHD-600-TRX", "transmitter", Math.max(1, room.sourceCount || 1), "Unified transceiver platform for higher-end flexible wall layouts.", 0.83);
        pushSku("NHD-600-TRX", "receiver", Math.max(1, room.displayCount || 1), "Per-display decode/control path for complex walls.", 0.83);
      } else {
        pushSku("NHD-500-E-TX", "transmitter", Math.max(1, room.sourceCount || 1), "Encode sources into the AVoIP fabric.", 0.8);
        pushSku("NHD-500-E-RX", "receiver", Math.max(1, room.displayCount || 1), "Decode to each display or wall zone.", 0.8);
        if ((room.sourceCount || 0) <= 4) {
          pushSku("NHD-0401-MV", "processor", 1, "Optional multiview source composition inside a 500-series workflow.", 0.77);
        }
      }
      alternatives.push({
        family: "video-wall-processor",
        reason: "Choose SW-0206-VW when cost and simplicity matter more than routed flexibility.",
        tradeOffs: ["Less networked flexibility", "Reduced expansion headroom"],
      });
    }
    designNotes.push(...videoWallRules);
  } else if ((room.displayCount || 0) <= 2 && (room.sourceCount || 0) <= 4 && (room.maxDistanceM || 0) <= 70) {
    family = "HDBaseT";
    topology = "Point-to-point or small-room switching/extender topology.";
    rationale = "Limited source/display counts and moderate distance suit a simpler fixed topology.";
    pushSku("SW-640L-TX-W", "switcher", 1, "Small-room presentation switching/transmission option.", 0.71);
    pushSku("RX-70-4K-G2", "receiver", Math.max(1, room.displayCount || 1), "Point-to-point receive path for moderate distances.", 0.68);
    alternatives.push({
      family: "matrix",
      reason: "Choose a matrix if input/output routing complexity grows.",
      tradeOffs: ["Higher cost", "More rack space"],
    });
  } else if ((room.displayCount || 0) > 2 || (room.zones || 1) > 1) {
    family = "AVoIP-500";
    topology = "Network-based distributed AV topology.";
    rationale = "Multiple endpoints or zones favour flexible distribution and easier expansion.";
    pushSku("NHD-500-E-TX", "transmitter", Math.max(1, room.sourceCount || 1), "Encode each source into the AVoIP network.", 0.79);
    pushSku("NHD-500-E-RX", "receiver", Math.max(1, room.displayCount || 1), "Decode at each display endpoint.", 0.79);
    alternatives.push({
      family: "matrix",
      reason: "Choose a matrix where the endpoint count is still modest and network independence is preferred.",
      tradeOffs: ["Lower expansion headroom", "Fixed routing limits"],
    });
  } else {
    family = "matrix";
    topology = "Centralised switching topology.";
    rationale = "Presentation switching or central routing fits the stated scope better than distributed decode.";
    pushSku("MX-0402-HDBT-H2A-KIT", "matrix", 1, "Compact switching path for modest input/output requirements.", 0.7);
    alternatives.push({
      family: "HDBaseT",
      reason: "Choose extender-led topology when routing is simple and rooms are self-contained.",
      tradeOffs: ["Lower routing flexibility"],
    });
  }

  if ((room.maxDistanceM || 0) > 100 && !String(family).startsWith("AVoIP")) {
    risks.push({
      severity: "high",
      detail: "Stated cable distance may exceed a simpler fixed-topology comfort zone. Re-check transport choice.",
    });
  }

  if (openQuestions.length > 0) {
    risks.push({
      severity: "medium",
      detail: "Open discovery questions remain and should be resolved before final proposal generation.",
    });
  }

  designNotes.push(...compatibilityRules);

  return {
    architectureVersion: "1.0",
    recommendedArchitecture: {
      family,
      topology,
      rationale,
    },
    recommendedProducts: recommendations,
    alternativeArchitectures: alternatives,
    designNotes: uniqueStrings(designNotes),
    risks,
    assumptions: uniqueStrings(assumptions),
    openQuestions: uniqueStrings(openQuestions),
    recommendedNextAction: "validate",
  };
}

export function deriveValidation({ brief, architecture }) {
  const checks = [];
  const blockingIssues = [];
  const warnings = [];
  const fixSuggestions = [];
  const revisedProductSuggestions = [];
  const room = brief?.roomProfile || {};
  const products = architecture?.recommendedProducts || [];

  const addCheck = (code, status, message) => checks.push({ code, status, message });

  if (!products.length) {
    addCheck("COUNT", "fail", "No recommended products were returned by architecture.");
    blockingIssues.push("No recommended products are available to validate.");
  } else {
    addCheck("COUNT", "pass", "Recommended product list is present.");
  }

  if ((brief?.missingInformation || []).length > 2) {
    addCheck("MISSING_INFO", "warn", "Multiple discovery fields are still unresolved.");
    warnings.push("Resolve the remaining discovery gaps before proposal issue.");
    fixSuggestions.push("Ask the user to confirm source count, display count, distance, USB and control requirements.");
  } else {
    addCheck("MISSING_INFO", "pass", "Discovery data is sufficiently complete for early-stage validation.");
  }

  if (room.videoWall) {
    const hasWallOption = products.some((item) =>
      ["SW-0206-VW", "NHD-600-TRX", "NHD-500-E-RX", "NHD-0401-MV"].includes(item.sku)
    );
    if (!hasWallOption) {
      addCheck("VIDEO_WALL", "fail", "Video wall scope was detected but no suitable wall-capable products were returned.");
      blockingIssues.push("No video-wall-capable path was identified.");
      fixSuggestions.push("Return to architecture and consider SW-0206-VW or AVoIP wall-capable options.");
    } else {
      addCheck("VIDEO_WALL", "pass", "Video wall-capable products are present.");
    }
  }

  if ((room.maxDistanceM || 0) > 100 && architecture?.recommendedArchitecture?.family === "HDBaseT") {
    addCheck("DISTANCE", "fail", "Distance appears too high for the selected simpler topology.");
    blockingIssues.push("Distance exceeds the comfort range for the current topology.");
    fixSuggestions.push("Consider an AVoIP architecture or re-check transport distance assumptions.");
  } else {
    addCheck("DISTANCE", "pass", "No critical distance conflict detected.");
  }

  if ((architecture?.openQuestions || []).length > 0) {
    addCheck("RISK", "warn", "Architecture still contains open questions.");
    warnings.push("Open questions remain on the design output.");
  } else {
    addCheck("RISK", "pass", "Architecture open-question count is acceptable.");
  }

  const status =
    blockingIssues.length > 0 ? "fail" : warnings.length > 0 ? "pass-with-warnings" : "pass";

  if (status !== "pass") {
    revisedProductSuggestions.push(...products.slice(0, 2).map((item) => ({
      sku: item.sku,
      role: item.role,
      qty: item.qty,
      reason: `Keep under review while blocking issues are resolved: ${item.reason}`,
    })));
  }

  return {
    validationVersion: "1.0",
    status,
    checks,
    blockingIssues,
    warnings,
    fixSuggestions: uniqueStrings(fixSuggestions),
    revisedProductSuggestions,
    confidence: clampConfidence(status === "pass" ? 0.86 : status === "pass-with-warnings" ? 0.72 : 0.55),
    recommendedNextAction: status === "fail" ? "return-to-architect" : "ready-for-proposal",
  };
}

export function deriveProposal({ brief, architecture, validation }) {
  const status = validation?.status || "fail";
  const family = architecture?.recommendedArchitecture?.family || "unknown";
  const projectLabel = brief?.roomProfile?.roomType || "application";

  return {
    proposalVersion: "1.0",
    readiness: status === "pass" ? "ready" : status === "pass-with-warnings" ? "conditional" : "blocked",
    executiveSummary:
      status === "fail"
        ? `Proposal generation is blocked pending clarification of the ${projectLabel} design.`
        : `Wingman recommends a ${family} architecture for this ${projectLabel} project based on the current discovery brief.`,
    solutionOverview: [
      architecture?.recommendedArchitecture?.rationale || "Architecture rationale is pending.",
      ...(architecture?.designNotes || []).slice(0, 3),
    ],
    bomNotes: (architecture?.recommendedProducts || []).map((item) => ({
      sku: item.sku,
      qty: item.qty,
      note: item.reason,
    })),
    exclusions: [
      "Network switch scope is excluded unless explicitly stated.",
      "Third-party control programming is excluded unless explicitly stated.",
      "Competitor data is excluded from BOM and proposal logic.",
    ],
    internalReviewNotes: [
      ...(validation?.warnings || []),
      ...(validation?.blockingIssues || []),
    ],
    nextSteps:
      status === "fail"
        ? ["Resolve blocking validation issues.", "Return to architecture.", "Re-run validation."]
        : ["Confirm open assumptions.", "Save design to project.", "Proceed to pricing and formal proposal wording."],
  };
}

export function deriveGuruAnswer({ question: _question, brief, architecture }) {
  const family = architecture?.recommendedArchitecture?.family || "unknown";
  const roomType = brief?.roomProfile?.roomType || "project";

  return {
    guruVersion: "1.0",
    answer: `For this ${roomType} project, the current best-fit architecture is ${family}. Refine the answer further by connecting the live Wingman product and rules services.`,
    bullets: [
      "Use Discovery for structured requirements capture.",
      "Use Architect for topology and candidate SKU selection.",
      "Use Validation before any customer-facing proposal output.",
    ],
    followUpActions: [
      "Open the project architecture card.",
      "Review validation warnings.",
      "Proceed to proposal only when readiness is not blocked.",
    ],
    confidence: 0.68,
  };
}

export function deriveCompetitorMatch({ competitorVendor, competitorSku, notes }) {
  return {
    competitorVersion: "1.0",
    summary: `Initial competitor match scaffold for ${competitorVendor || "unknown vendor"} ${competitorSku || ""}`.trim(),
    matches: [
      {
        sku: "NHD-500-E-TX",
        confidence: 0.56,
        reason: "Possible match for distributed AV-over-IP transmitter workflows.",
      },
      {
        sku: "SW-0206-VW",
        confidence: 0.43,
        reason: "Possible alternative where the competitor SKU appears wall-processing oriented.",
      },
    ],
    caveats: [
      "Competitor matching is advisory only.",
      "Competitor data must not drive BOM or proposal generation.",
      notes ? `User notes considered: ${notes}` : "No user notes supplied.",
    ],
    recommendedNextAction: "review-in-compare-tool",
  };
}
