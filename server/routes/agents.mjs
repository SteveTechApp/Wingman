import fs from "node:fs/promises";
import { getWingmanRequestAuth } from "../wingman-app-store.mjs";
import {
  LEGACY_WINGMAN_APP_DB_FILE,
  PRODUCT_INTELLIGENCE_DB_FILE,
  WINGMAN_APP_DB_FILE,
  WINGMAN_CANONICAL_PRODUCT_STORE_FILE,
} from "../catalog/files.mjs";
import { runGuruAgent } from "../server/agents/guruAgent.mjs";

const UI_HOST = String(process.env.WINGMAN_UI_HOST || "127.0.0.1").trim() || "127.0.0.1";
const parsedUiPort = Number(process.env.WINGMAN_UI_PORT || 3000);
const UI_PORT = Number.isFinite(parsedUiPort) ? parsedUiPort : 3000;
const CORS_ALLOW_ORIGIN = String(process.env.WINGMAN_CORS_ALLOW_ORIGIN || `http://${UI_HOST}:${UI_PORT}`).trim();
const CORS_ALLOW_CREDENTIALS = CORS_ALLOW_ORIGIN !== "*";
const MAX_JSON_BODY_BYTES = Math.max(1024, Number(process.env.WINGMAN_MAX_JSON_BODY_BYTES || 1_048_576));
const ENABLE_SECURITY_HEADERS = !["0", "false", "off", "no"].includes(String(process.env.WINGMAN_ENABLE_SECURITY_HEADERS ?? "true").trim().toLowerCase());
const API_CONTENT_SECURITY_POLICY = String(process.env.WINGMAN_API_CONTENT_SECURITY_POLICY || "default-src 'none'; frame-ancestors 'none'; base-uri 'none'").trim();
const API_STRICT_TRANSPORT_SECURITY = String(process.env.WINGMAN_API_HSTS || "max-age=31536000; includeSubDomains").trim();

function withCorsHeaders(base = {}) {
  const headers = {
    "Access-Control-Allow-Origin": CORS_ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Wingman-Session",
    Vary: "Origin",
  };
  if (ENABLE_SECURITY_HEADERS) {
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    headers["Content-Security-Policy"] = API_CONTENT_SECURITY_POLICY;
    if (API_STRICT_TRANSPORT_SECURITY) {
      headers["Strict-Transport-Security"] = API_STRICT_TRANSPORT_SECURITY;
    }
  }
  if (CORS_ALLOW_CREDENTIALS) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return {
    ...headers,
    ...base,
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, withCorsHeaders({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  }));
  res.end(body);
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bodyBytes = 0;
    let done = false;

    const fail = (error) => {
      if (done) return;
      done = true;
      reject(error);
    };

    const succeed = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };

    req.on("data", (chunk) => {
      chunks.push(chunk);
      bodyBytes += chunk.length;
      if (bodyBytes > MAX_JSON_BODY_BYTES) {
        const error = new Error(`Request body too large. Max ${MAX_JSON_BODY_BYTES} bytes.`);
        error.statusCode = 413;
        fail(error);
        req.destroy();
      }
    });
    req.on("end", () => {
      if (done) return;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        if (!text) {
          succeed({});
          return;
        }
        succeed(JSON.parse(text));
      } catch (error) {
        fail(error);
      }
    });
    req.on("error", fail);
  });
}

function getAgentsPath(req) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname || "/";
  if (pathname === "/api/wingman/agents" || pathname.startsWith("/api/wingman/agents/")) {
    return pathname;
  }
  return "";
}

function nowIso() {
  return new Date().toISOString();
}

function tidy(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return tidy(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cloneJson(value, fallback = {}) {
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch {
    return fallback;
  }
}

async function readJsonFile(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function integerFromMatch(text, regex, fallback = 0) {
  const match = String(text || "").match(regex);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : fallback;
}

function detectSolutionIntent(text) {
  const t = lower(text);
  if (t.includes("video wall") || t.includes("videowall")) return "video-wall";
  if (t.includes("avoip") || t.includes("av over ip") || t.includes("networkhd")) return "avoip";
  if (t.includes("matrix") || t.includes("switching") || t.includes("presentation")) return "presentation-switching";
  if (t.includes("extender") || t.includes("hdbaset")) return "extender";
  return "unknown";
}

function detectRoomType(text, fallback = "unknown") {
  const t = lower(text);
  if (t.includes("boardroom")) return "boardroom";
  if (t.includes("meeting room")) return "meeting-room";
  if (t.includes("classroom")) return "classroom";
  if (t.includes("retail")) return "retail";
  if (t.includes("control room")) return "control-room";
  if (t.includes("hospitality")) return "hospitality";
  if (t.includes("residential")) return "residential";
  return fallback || "unknown";
}

function detectBudget(text) {
  const t = lower(text);
  if (t.includes("value") || t.includes("budget") || t.includes("cost sensitive")) return "entry";
  if (t.includes("premium") || t.includes("high end")) return "premium";
  if (t.includes("mid")) return "mid";
  return "unknown";
}

function detectPriority(text) {
  const t = lower(text);
  if (t.includes("simple") || t.includes("simplicity")) return "simplicity";
  if (t.includes("flexible") || t.includes("flexibility")) return "flexibility";
  if (t.includes("performance")) return "performance";
  if (t.includes("cost") || t.includes("budget") || t.includes("value")) return "cost";
  return "unknown";
}

function uniqueStrings(values) {
  return Array.from(new Set(asArray(values).map((value) => tidy(value)).filter(Boolean)));
}

function flattenObjectStrings(value, bucket = []) {
  if (value == null) return bucket;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    bucket.push(String(value));
    return bucket;
  }
  if (Array.isArray(value)) {
    for (const item of value) flattenObjectStrings(item, bucket);
    return bucket;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) flattenObjectStrings(item, bucket);
  }
  return bucket;
}

function normalizeSku(value) {
  return tidy(value).toUpperCase();
}

function normalizeId(value) {
  return tidy(value).toLowerCase().replace(/[\s_\-/]+/g, "");
}

function extractRecordsFromValue(value, records = [], depth = 0) {
  if (depth > 4 || value == null) return records;

  if (Array.isArray(value)) {
    for (const item of value) {
      extractRecordsFromValue(item, records, depth + 1);
    }
    return records;
  }

  if (typeof value !== "object") {
    return records;
  }

  const sku = normalizeSku(
    value.sku ??
    value.SKU ??
    value.model ??
    value.modelNumber ??
    value.code ??
    value.id
  );

  if (sku) {
    const title = tidy(
      value.title ??
      value.name ??
      value.label ??
      value.description ??
      value.productName ??
      value.summary
    );
    const family = tidy(value.family ?? value.familyCode ?? value.series ?? value.productFamily);
    const category = tidy(value.category ?? value.group ?? value.type);
    const keywords = uniqueStrings([
      sku,
      title,
      family,
      category,
      ...flattenObjectStrings(value).slice(0, 50),
    ]).join(" ").toLowerCase();

    records.push({
      sku,
      normalizedId: normalizeId(sku),
      title,
      family,
      category,
      raw: value,
      keywords,
    });
  }

  for (const child of Object.values(value)) {
    extractRecordsFromValue(child, records, depth + 1);
  }

  return records;
}

function dedupeRecords(records) {
  const bySku = new Map();
  for (const record of records) {
    if (!record?.sku) continue;
    if (!bySku.has(record.sku)) {
      bySku.set(record.sku, record);
      continue;
    }
    const existing = bySku.get(record.sku);
    const existingScore = (existing.title ? 1 : 0) + (existing.family ? 1 : 0) + (existing.category ? 1 : 0);
    const nextScore = (record.title ? 1 : 0) + (record.family ? 1 : 0) + (record.category ? 1 : 0);
    if (nextScore > existingScore) {
      bySku.set(record.sku, record);
    }
  }
  return Array.from(bySku.values());
}

let appDbCache = null;
let catalogCache = null;

async function loadAppDb() {
  if (appDbCache) return appDbCache;
  const fallback = {
      users: [],
      workspaces: [],
      projectsByWorkspace: {},
      invitations: [],
      sessions: [],
      auditEvents: [],
      telemetryEvents: [],
    };
  appDbCache = await readJsonFile(
    WINGMAN_APP_DB_FILE,
    await readJsonFile(LEGACY_WINGMAN_APP_DB_FILE, fallback),
  );
  return appDbCache;
}

async function loadCatalogContext() {
  if (catalogCache) return catalogCache;

  const [canonicalProducts, productIntelligenceDb] = await Promise.all([
    readJsonFile(WINGMAN_CANONICAL_PRODUCT_STORE_FILE, []),
    readJsonFile(PRODUCT_INTELLIGENCE_DB_FILE, []),
  ]);

  const records = dedupeRecords([
    ...extractRecordsFromValue(canonicalProducts),
    ...extractRecordsFromValue(productIntelligenceDb),
  ]);

  const bySku = new Map(records.map((record) => [record.sku, record]));

  catalogCache = {
    records,
    bySku,
    counts: {
      records: records.length,
    },
  };

  return catalogCache;
}

function findWorkspace(db, workspaceId) {
  const workspaces = asArray(db?.workspaces);
  return workspaces.find((workspace) =>
    tidy(workspace?.id) === tidy(workspaceId) || tidy(workspace?.slug) === tidy(workspaceId)
  ) ?? null;
}

function findProject(db, workspaceId, projectId) {
  const projectsByWorkspace = db?.projectsByWorkspace ?? {};
  const workspaceProjects = asArray(projectsByWorkspace?.[workspaceId]);
  const direct = workspaceProjects.find((project) => tidy(project?.id) === tidy(projectId));
  if (direct) return direct;

  for (const projects of Object.values(projectsByWorkspace)) {
    const match = asArray(projects).find((project) => tidy(project?.id) === tidy(projectId));
    if (match) return match;
  }
  return null;
}

async function getProjectContext(workspaceId, projectId) {
  const db = await loadAppDb();
  const workspace = findWorkspace(db, workspaceId);
  const project = findProject(db, workspaceId, projectId);

  return {
    workspace: workspace ? {
      id: tidy(workspace.id),
      name: tidy(workspace.name),
      slug: tidy(workspace.slug),
      tier: tidy(workspace.tier),
    } : null,
    project: project ? cloneJson(project, {}) : null,
  };
}

function upperPrefix(value) {
  return tidy(value).toUpperCase();
}

function chooseProducts(records, options = {}) {
  const exact = uniqueStrings(asArray(options.exact).map((item) => normalizeSku(item)));
  const prefixes = uniqueStrings(asArray(options.prefixes).map((item) => upperPrefix(item)));
  const includeTerms = uniqueStrings(asArray(options.includeTerms).map((item) => lower(item)));
  const excludeTerms = uniqueStrings(asArray(options.excludeTerms).map((item) => lower(item)));
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 3;

  const scored = [];
  const exactSet = new Set(exact);

  for (const record of records) {
    let score = 0;
    const sku = record.sku;
    const title = lower(record.title);
    const family = lower(record.family);
    const category = lower(record.category);
    const keywords = record.keywords || "";

    if (exactSet.has(sku)) score += 100;
    for (const prefix of prefixes) {
      if (sku.startsWith(prefix)) score += 25;
    }
    for (const term of includeTerms) {
      if (keywords.includes(term)) score += 8;
      if (title.includes(term) || family.includes(term) || category.includes(term)) score += 6;
    }
    for (const term of excludeTerms) {
      if (keywords.includes(term)) score -= 20;
    }

    if (score > 0) {
      scored.push({ score, record });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.record.sku.localeCompare(b.record.sku);
  });

  const out = [];
  const seen = new Set();
  for (const item of scored) {
    if (seen.has(item.record.sku)) continue;
    seen.add(item.record.sku);
    out.push(item.record);
    if (out.length >= limit) break;
  }
  return out;
}

function buildRecommendedProducts(records, role, reason, confidence = 0.7) {
  return records.map((record) => ({
    sku: record.sku,
    role,
    qty: 1,
    reason,
    confidence,
    title: record.title || undefined,
  }));
}

function deriveDiscovery(input = {}, projectContext = {}) {
  const requestContext = input.context ?? {};
  const projectData = cloneJson(projectContext.project, {});
  const mergedExistingProjectData = {
    ...(cloneJson(requestContext.existingProjectData, {})),
    ...(cloneJson(projectData, {})),
  };

  const joined = [
    tidy(input.userInput),
    tidy(requestContext.roomType),
    tidy(requestContext.customerName),
    ...flattenObjectStrings(mergedExistingProjectData).slice(0, 80),
  ].filter(Boolean).join(" ");

  const displayCount = integerFromMatch(joined, /(\d+)\s*displays?/i, 0);
  const sourceCount = integerFromMatch(joined, /(\d+)\s*sources?/i, 0);
  const maxDistanceM = integerFromMatch(joined, /(\d+)\s*m(?:etre|eter|)?\s*(?:cable run|run|distance)?/i, 0);

  const usbRequired = /usb|usb-c|usbc/i.test(joined);
  const controlRequired = /control|rs-232|serial|api|automation/i.test(joined);
  const audioBreakoutRequired = /audio breakout|de-embed|deembed|analog audio|audio out/i.test(joined);
  const videoWall = /video wall|videowall/i.test(joined);

  const summaryParts = [];
  summaryParts.push(detectRoomType(joined, tidy(requestContext.roomType) || "unknown"));
  if (displayCount > 0) summaryParts.push(`${displayCount} display${displayCount === 1 ? "" : "s"}`);
  if (sourceCount > 0) summaryParts.push(`${sourceCount} source${sourceCount === 1 ? "" : "s"}`);
  if (maxDistanceM > 0) summaryParts.push(`${maxDistanceM}m max run`);

  const missingInformation = [];
  if (!displayCount) missingInformation.push("display count");
  if (!sourceCount) missingInformation.push("source count");
  if (!maxDistanceM) missingInformation.push("maximum cable distance");
  if (!/budget|value|cost|premium|mid/i.test(joined)) missingInformation.push("budget guidance");
  if (!/control|rs-232|serial|api|automation/i.test(joined)) missingInformation.push("control system requirement");
  if (!/audio breakout|de-embed|deembed|analog audio|audio out/i.test(joined)) missingInformation.push("audio breakout / de-embed requirement");

  const confidenceBase = 1 - Math.min(0.7, missingInformation.length * 0.08);
  const confidence = Number(Math.max(0.25, confidenceBase).toFixed(2));

  return {
    briefVersion: "1.0",
    summary: summaryParts.join(", "),
    solutionIntent: detectSolutionIntent(joined),
    roomProfile: {
      roomType: detectRoomType(joined, tidy(requestContext.roomType) || "unknown"),
      displayCount,
      sourceCount,
      zones: 1,
      maxDistanceM,
      videoWall,
      videoWallLayout: videoWall ? "custom" : "none",
      usbRequired,
      audioBreakoutRequired,
      controlRequired,
    },
    commercialProfile: {
      budgetLevel: detectBudget(joined),
      priority: detectPriority(joined),
    },
    constraints: maxDistanceM > 0 ? [
      {
        type: "distance",
        detail: `Maximum stated run is ${maxDistanceM}m.`,
      }
    ] : [],
    missingInformation,
    assumptions: [
      "Assumes single-room deployment unless stored project data indicates otherwise.",
      "Assumes standard meeting-space signal flow when topology detail is limited."
    ],
    confidence,
    recommendedNextAction: "architect",
    projectContext: {
      workspace: projectContext.workspace ?? null,
      projectId: tidy(input.projectId),
      existingProjectKeys: Object.keys(mergedExistingProjectData),
    },
  };
}

function deriveArchitecture(input = {}, catalogContext = { records: [], bySku: new Map() }) {
  const brief = input.brief ?? {};
  const roomProfile = brief.roomProfile ?? {};
  const commercialProfile = brief.commercialProfile ?? {};
  const displayCount = Number(roomProfile.displayCount || 0);
  const sourceCount = Number(roomProfile.sourceCount || 0);
  const maxDistanceM = Number(roomProfile.maxDistanceM || 0);
  const videoWall = Boolean(roomProfile.videoWall);
  const usbRequired = Boolean(roomProfile.usbRequired);

  let family = "unknown";
  let topology = "Undetermined topology";
  let rationale = "Insufficient information to choose a reliable architecture.";
  let recommendedProducts = [];
  const alternativeArchitectures = [];
  const designNotes = [];
  const risks = [];
  const openQuestions = [...asArray(brief.missingInformation)];
  const assumptions = [...asArray(brief.assumptions)];

  const records = catalogContext.records ?? [];

  if (videoWall) {
    family = "video-wall-processor";
    topology = "Dedicated video wall processing or AVoIP-based wall depending on scale and flexibility.";
    rationale = "Video wall intent detected, so a dedicated wall workflow is more appropriate than standard room switching.";

    const primary = chooseProducts(records, {
      exact: ["SW-0206-VW", "NHD-0401-MV"],
      prefixes: ["SW", "NHD"],
      includeTerms: ["video wall", "multiview", "networkhd"],
      limit: 3,
    });

    recommendedProducts = buildRecommendedProducts(
      primary,
      "processor",
      "Selected from live WyreStorm catalog data for video wall / multiview scenarios.",
      0.78
    );

    alternativeArchitectures.push({
      family: "AVoIP-500",
      reason: "Use when wall flexibility, distributed endpoints, or scaling beyond a simple fixed wall is required.",
      tradeOffs: [
        "Higher system complexity than fixed processor approach.",
        "Better long-term flexibility and routing options."
      ],
    });
  } else if (sourceCount > 1 && displayCount > 1) {
    family = "matrix";
    topology = `${Math.max(sourceCount, 2)}x${Math.max(displayCount, 2)} presentation switcher / matrix-style room topology`;
    rationale = "Multiple sources and displays with moderate room complexity lean toward a matrix or presentation-switching design.";

    const primary = chooseProducts(records, {
      prefixes: ["MX", "SW"],
      includeTerms: usbRequired
        ? ["matrix", "switcher", "presentation", "usb-c", "usb"]
        : ["matrix", "switcher", "presentation"],
      excludeTerms: ["video wall"],
      limit: 3,
    });

    recommendedProducts = buildRecommendedProducts(
      primary,
      "matrix",
      "Matched against live WyreStorm catalog entries that align with room switching workflows.",
      0.7
    );

    if (usbRequired) {
      designNotes.push("USB-C source integration is part of the stated requirement and must be validated against the final selected switcher.");
    }

    alternativeArchitectures.push({
      family: "HDBaseT",
      reason: "Could suit a simpler point-to-point or lightly switched room where flexibility is reduced.",
      tradeOffs: [
        "Lower flexibility than matrix switching.",
        "Often simpler to deploy in straightforward rooms."
      ],
    });
  } else if (maxDistanceM > 0 && maxDistanceM >= 30) {
    family = "HDBaseT";
    topology = "Point-to-point extender topology";
    rationale = "Longer stated run with limited switching complexity suggests an extender-led design.";

    const primary = chooseProducts(records, {
      prefixes: ["EX", "TX", "RX"],
      includeTerms: ["hdbaset", "extender", "transmitter", "receiver"],
      limit: 4,
    });

    recommendedProducts = buildRecommendedProducts(
      primary,
      "transport",
      "Matched against live WyreStorm transport catalog entries for distance-led workflows.",
      0.66
    );
  } else if (displayCount > 2 || sourceCount > 4 || brief.solutionIntent === "avoip") {
    family = "AVoIP-500";
    topology = "Distributed AVoIP topology";
    rationale = "Higher scale or future flexibility requirement pushes toward AVoIP rather than fixed room switching.";

    const primary = chooseProducts(records, {
      prefixes: ["NHD"],
      includeTerms: ["networkhd", "encoder", "decoder", "multiview"],
      limit: 4,
    });

    recommendedProducts = buildRecommendedProducts(
      primary,
      "transport",
      "Matched against live WyreStorm NetworkHD catalog entries.",
      0.68
    );
  }

  if (family === "unknown") {
    risks.push({
      severity: "high",
      detail: "Insufficient information to recommend a reliable architecture family.",
    });
  }

  if (recommendedProducts.length === 0 && family !== "unknown") {
    risks.push({
      severity: "medium",
      detail: "Architecture family resolved, but no strong live catalog matches were found by the current selector.",
    });
  }

  if (asArray(brief.missingInformation).length > 0) {
    risks.push({
      severity: "medium",
      detail: `Architecture based on incomplete discovery data: ${asArray(brief.missingInformation).join(", ")}.`,
    });
  }

  if (commercialProfile.budgetLevel === "entry") {
    designNotes.push("Budget sensitivity detected, so value-engineered alternatives should be surfaced alongside preferred architecture.");
  }

  return {
    architectureVersion: "1.0",
    catalogBacked: true,
    recommendedArchitecture: {
      family,
      topology,
      rationale,
    },
    recommendedProducts,
    alternativeArchitectures,
    designNotes,
    risks,
    assumptions,
    openQuestions,
    recommendedNextAction: "validate",
    catalogStats: {
      recordCount: Number(catalogContext?.counts?.records || 0),
    },
  };
}

function deriveValidation(input = {}, catalogContext = { bySku: new Map() }) {
  const brief = input.brief ?? {};
  const architecture = input.architecture ?? {};
  const recommendedArchitecture = architecture.recommendedArchitecture ?? {};
  const roomProfile = brief.roomProfile ?? {};
  const checks = [];
  const blockingIssues = [];
  const warnings = [];
  const fixSuggestions = [];
  const revisedProductSuggestions = [];

  if (!recommendedArchitecture.family || recommendedArchitecture.family === "unknown") {
    checks.push({
      code: "TOPOLOGY",
      status: "fail",
      message: "No valid architecture family has been selected.",
    });
    blockingIssues.push("Architecture family is not yet resolved.");
    fixSuggestions.push("Complete discovery inputs and rerun architecture selection.");
  } else {
    checks.push({
      code: "TOPOLOGY",
      status: "pass",
      message: `Architecture family '${recommendedArchitecture.family}' has been selected.`,
    });
  }

  const missingInformation = asArray(brief.missingInformation);
  if (missingInformation.length > 0) {
    checks.push({
      code: "MISSING_INFO",
      status: "warn",
      message: `Missing discovery inputs: ${missingInformation.join(", ")}.`,
    });
    warnings.push(`Recommendation still depends on unresolved items: ${missingInformation.join(", ")}.`);
    fixSuggestions.push("Prompt the user for the remaining discovery gaps before proposal stage.");
  } else {
    checks.push({
      code: "MISSING_INFO",
      status: "pass",
      message: "No mandatory discovery gaps were flagged by the current validator.",
    });
  }

  if (Number(roomProfile.maxDistanceM || 0) === 0) {
    checks.push({
      code: "DISTANCE",
      status: "warn",
      message: "Distance has not been confirmed, so transport validation is incomplete.",
    });
    warnings.push("Cable distance should be confirmed before final SKU recommendation.");
    fixSuggestions.push("Capture the maximum endpoint-to-endpoint cable distance.");
  } else {
    checks.push({
      code: "DISTANCE",
      status: "pass",
      message: `Distance captured at ${roomProfile.maxDistanceM}m.`,
    });
  }

  const recommendedProducts = asArray(architecture.recommendedProducts);
  if (!recommendedProducts.length) {
    checks.push({
      code: "COUNT",
      status: "warn",
      message: "No product list has been attached to the architecture yet.",
    });
    warnings.push("Product selection is incomplete.");
    fixSuggestions.push("Bind the architecture to approved WyreStorm SKUs.");
  } else {
    checks.push({
      code: "COUNT",
      status: "pass",
      message: `${recommendedProducts.length} recommended product entries are present.`,
    });
  }

  const unknownSkus = recommendedProducts
    .map((item) => normalizeSku(item?.sku))
    .filter((sku) => sku && !catalogContext.bySku?.has(sku));

  if (unknownSkus.length > 0) {
    checks.push({
      code: "COMPATIBILITY",
      status: "warn",
      message: `Some recommended SKUs were not found in the current live catalog index: ${unknownSkus.join(", ")}.`,
    });
    warnings.push(`Catalog confirmation missing for: ${unknownSkus.join(", ")}.`);
    fixSuggestions.push("Refresh catalog sources or bind architecture logic to an approved SKU shortlist.");
  } else if (recommendedProducts.length > 0) {
    checks.push({
      code: "COMPATIBILITY",
      status: "pass",
      message: "All recommended SKUs exist in the current live catalog index.",
    });
  }

  if (Boolean(roomProfile.videoWall) && !["video-wall-processor", "AVoIP-500", "AVoIP-600"].includes(tidy(recommendedArchitecture.family))) {
    checks.push({
      code: "VIDEO_WALL",
      status: "warn",
      message: "Brief indicates video wall intent but architecture family is not explicitly wall-oriented.",
    });
    warnings.push("Video wall workflow should be rechecked against the chosen family.");
    fixSuggestions.push("Route the brief through the video wall decision rules before proposal stage.");
  }

  let status = "pass";
  if (blockingIssues.length > 0) {
    status = "fail";
  } else if (warnings.length > 0) {
    status = "pass-with-warnings";
  }

  return {
    validationVersion: "1.0",
    status,
    checks,
    blockingIssues,
    warnings,
    fixSuggestions,
    revisedProductSuggestions,
    confidence: status === "fail" ? 0.35 : status === "pass-with-warnings" ? 0.68 : 0.86,
    recommendedNextAction: status === "fail" ? "return-to-architect" : "ready-for-proposal",
    catalogBacked: true,
  };
}

async function runPhase1Pipeline(payload = {}) {
  const projectContext = await getProjectContext(payload.workspaceId, payload.projectId);
  const catalogContext = await loadCatalogContext();

  const discovery = deriveDiscovery(payload, projectContext);
  const architecture = deriveArchitecture({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId,
    brief: discovery,
    options: payload.options ?? {},
  }, catalogContext);
  const validation = deriveValidation({
    workspaceId: payload.workspaceId,
    projectId: payload.projectId,
    brief: discovery,
    architecture,
  }, catalogContext);

  return {
    ok: true,
    mode: "phase1-real-data-pipeline",
    projectContext,
    discovery,
    architecture,
    validation,
    status: validation.status,
    timestamp: nowIso(),
  };
}

export async function handleAgentsRoute(req, res) {
  const pathname = getAgentsPath(req);
  if (!pathname) {
    return false;
  }
  const method = req.method || "GET";
  const url = new URL(req.url || "/", "http://localhost");

  if (method === "OPTIONS") {
    res.writeHead(204, withCorsHeaders());
    res.end();
    return true;
  }

  const isHealthRoute = (pathname === "/api/wingman/agents" || pathname === "/api/wingman/agents/health") && method === "GET";
  if (!isHealthRoute) {
    const auth = await getWingmanRequestAuth(req, url);
    if (!auth.ok) {
      sendJson(res, 401, {
        ok: false,
        error: auth.error || "Authentication required.",
      });
      return true;
    }
  }

  if (isHealthRoute) {
    const catalogContext = await loadCatalogContext();
    sendJson(res, 200, {
      ok: true,
      service: "wingman-agents",
      runtime: "node:http",
      mode: "phase1-real-data-pipeline",
      phases: ["discovery", "architect", "validate", "proposal", "guru", "competitor"],
      catalogRecords: Number(catalogContext?.counts?.records || 0),
      timestamp: nowIso(),
    });
    return true;
  }

  if (pathname === "/api/wingman/agents/run-pipeline" && method === "POST") {
    try {
      const body = await parseJsonBody(req);
      sendJson(res, 200, await runPhase1Pipeline(body));
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        phase: "run-pipeline",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (pathname === "/api/wingman/agents/discovery" && method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const projectContext = await getProjectContext(body.workspaceId, body.projectId);
      sendJson(res, 200, {
        ok: true,
        phase: "discovery",
        data: deriveDiscovery(body, projectContext),
        timestamp: nowIso(),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        phase: "discovery",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (pathname === "/api/wingman/agents/architect" && method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const catalogContext = await loadCatalogContext();
      sendJson(res, 200, {
        ok: true,
        phase: "architect",
        data: deriveArchitecture(body, catalogContext),
        timestamp: nowIso(),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        phase: "architect",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (pathname === "/api/wingman/agents/validate" && method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const catalogContext = await loadCatalogContext();
      sendJson(res, 200, {
        ok: true,
        phase: "validate",
        data: deriveValidation(body, catalogContext),
        timestamp: nowIso(),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        phase: "validate",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (pathname === "/api/wingman/agents/proposal" && method === "POST") {
    try {
      const body = await parseJsonBody(req);
      sendJson(res, 200, {
        ok: true,
        phase: "proposal",
        note: "Proposal phase remains intentionally separate from competitor logic and still needs template binding.",
        received: body,
        timestamp: nowIso(),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        phase: "proposal",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (pathname === "/api/wingman/agents/guru" && method === "POST") {
    try {
      const body = await parseJsonBody(req);
      sendJson(res, 200, {
        ok: true,
        phase: "guru",
        data: await runGuruAgent(body),
        timestamp: nowIso(),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        phase: "guru",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  if (pathname === "/api/wingman/agents/competitor" && method === "POST") {
    try {
      const body = await parseJsonBody(req);
      sendJson(res, 200, {
        ok: true,
        phase: "competitor",
        note: "Competitor phase scaffold is mounted and remains isolated from proposal / BOM outputs.",
        received: body,
        timestamp: nowIso(),
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        phase: "competitor",
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return true;
  }

  sendJson(res, 404, {
    ok: false,
    error: "Unknown Wingman agents route",
    pathname,
    method,
  });
  return true;
}
