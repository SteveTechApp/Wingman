import fs from "node:fs/promises";
import path from "node:path";
import { writeJsonFileAtomic } from "../atomic-json-file.mjs";
import { COMPETITOR_LIVE_RESEARCH_REVIEW_FILE } from "../catalog/files.mjs";
import { upsertProductIntelligenceRecord } from "../product-intelligence-store.mjs";

function nowIso() {
  return new Date().toISOString();
}

function tidy(value) {
  return String(value ?? "").trim();
}

function normalise(value) {
  return tidy(value).toLowerCase();
}

function normaliseSku(value) {
  return tidy(value).toUpperCase();
}

function normaliseId(value) {
  return normalise(value).replace(/[^a-z0-9]+/g, "");
}

function safeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

function uniqueStrings(values, limit = 24) {
  const out = [];
  const seen = new Set();

  for (const value of Array.isArray(values) ? values : []) {
    const text = tidy(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }

  return out;
}

function normaliseSourceUrl(value) {
  const raw = tidy(value);
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (!["https:", "http:"].includes(parsed.protocol)) return "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function reviewId(manufacturer, sku) {
  return `live-research::${normaliseId(manufacturer) || "unknown"}::${normaliseSku(sku)}`;
}

async function readQueue(filePath = COMPETITOR_LIVE_RESEARCH_REVIEW_FILE) {
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    if (parsed && Array.isArray(parsed.records)) {
      return {
        version: 1,
        updatedAt: tidy(parsed.updatedAt) || nowIso(),
        records: parsed.records,
      };
    }
  } catch {
  }

  return {
    version: 1,
    updatedAt: nowIso(),
    records: [],
  };
}

async function writeQueue(db, filePath = COMPETITOR_LIVE_RESEARCH_REVIEW_FILE) {
  const next = {
    version: 1,
    updatedAt: nowIso(),
    records: [...db.records].sort((left, right) =>
      String(right.lastSeenAt || right.updatedAt || "").localeCompare(
        String(left.lastSeenAt || left.updatedAt || ""),
      ),
    ),
  };

  // Crash-atomic: temp file + rename, so a review decision can never leave
  // the queue file torn mid-write.
  await writeJsonFileAtomic(filePath, next);
  return next;
}

function trueFeatureLabels(features) {
  if (!features || typeof features !== "object") return [];

  return Object.entries(features)
    .filter(([, value]) => value === true)
    .map(([key]) =>
      key
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    )
    .slice(0, 24);
}

function normalisePortLabel(value) {
  const raw = tidy(value);
  if (!raw) return "Unknown";

  return raw
    .replace(/\b(video\s+)?input\b/gi, "")
    .replace(/\b(video\s+)?output\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || raw;
}

function mapIoGroups(groups) {
  const merged = new Map();

  for (const group of Array.isArray(groups) ? groups : []) {
    const count = Number(group?.count);
    if (!Number.isFinite(count) || count <= 0) continue;

    const type = normalisePortLabel(group?.type || group?.label);
    const key = type.toLowerCase();
    const current = merged.get(key);

    merged.set(key, {
      type,
      count: Math.round(count) + Number(current?.count || 0),
      label: tidy(group?.label) || undefined,
    });
  }

  return Array.from(merged.values());
}

function sumGroups(groups) {
  return (Array.isArray(groups) ? groups : []).reduce((total, group) => {
    const count = Number(group?.count);
    return total + (Number.isFinite(count) && count > 0 ? Math.round(count) : 0);
  }, 0);
}

function firstConnector(groups) {
  const first = (Array.isArray(groups) ? groups : []).find(
    (group) => Number(group?.count || 0) > 0,
  );
  return first ? normalisePortLabel(first.type || first.label) : null;
}

function confidenceLabel(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return "requires-review";
  if (value >= 90) return "high";
  if (value >= 70) return "medium";
  return "requires-review";
}

export function normaliseLiveResearchReviewRecord(result) {
  if (!result?.ok || result?.competitor_lookup_mode !== "live") {
    return null;
  }

  const competitor = result.competitor_product ?? {};
  const manufacturer = tidy(competitor.manufacturer);
  const sku = normaliseSku(competitor.model);

  if (!manufacturer || !sku) return null;

  const sourceUrls = uniqueStrings([
    result.resolved_competitor_url,
    competitor.resolvedUrl,
    ...(Array.isArray(competitor.sourceUrls) ? competitor.sourceUrls : []),
  ])
    .map(normaliseSourceUrl)
    .filter(Boolean);

  const best = result.best_match ?? null;

  return {
    id: reviewId(manufacturer, sku),
    manufacturer,
    sku,
    title: tidy(competitor.title) || sku,
    category: tidy(competitor.category) || "Uncategorized",
    comparisonDomain: tidy(competitor.comparisonDomain) || "UNKNOWN",
    comparisonUseCase: tidy(competitor.comparisonUseCase) || "UNKNOWN",
    role: tidy(competitor.role) || "Unknown",
    transport: tidy(competitor.transport) || "Unknown",
    subtype: tidy(competitor.subtype) || "Unknown",
    hdbtGeneration: tidy(competitor.hdbtGeneration) || "UNKNOWN",
    summary: tidy(competitor.summary),
    sourceUrl: sourceUrls[0] || "",
    sourceUrls,
    technologyProfile: safeObject(competitor.technologyProfile),
    ioProfile: safeObject(competitor.ioProfile),
    ports: safeObject(competitor.ports),
    video: safeObject(competitor.video),
    features: safeObject(competitor.features),
    bestMatch: best?.sku
      ? {
          sku: tidy(best.sku),
          name: tidy(best.name) || tidy(best.sku),
          matchType: tidy(best.match_type),
          confidenceScore: Number(best.confidence_score ?? best.match_score ?? 0) || 0,
          summary: tidy(best.summary),
          readiness: safeObject(best.readiness),
        }
      : null,
    reviewStatus: "pending",
    discoveredAt: tidy(result.fetchedAt) || nowIso(),
    firstSeenAt: nowIso(),
    lastSeenAt: nowIso(),
    seenCount: 1,
    reviewedAt: null,
    reviewedBy: null,
    reviewNotes: "",
    promotedRecordId: null,
  };
}

export async function stageLiveResearchReview(result, options = {}) {
  const candidate = normaliseLiveResearchReviewRecord(result);
  if (!candidate) {
    return { ok: true, staged: false, record: null };
  }

  const filePath = options.filePath || COMPETITOR_LIVE_RESEARCH_REVIEW_FILE;
  const db = await readQueue(filePath);
  const index = db.records.findIndex((record) => record.id === candidate.id);
  const existing = index >= 0 ? db.records[index] : null;
  const now = nowIso();

  const nextRecord = {
    ...existing,
    ...candidate,
    reviewStatus: existing?.reviewStatus || "pending",
    firstSeenAt: existing?.firstSeenAt || candidate.firstSeenAt || now,
    lastSeenAt: now,
    seenCount: Number(existing?.seenCount || 0) + 1,
    reviewedAt: existing?.reviewedAt ?? null,
    reviewedBy: existing?.reviewedBy ?? null,
    reviewNotes: existing?.reviewNotes || "",
    promotedRecordId: existing?.promotedRecordId ?? null,
  };

  if (index >= 0) db.records[index] = nextRecord;
  else db.records.push(nextRecord);

  await writeQueue(db, filePath);

  return {
    ok: true,
    staged: true,
    record: nextRecord,
  };
}

export async function listLiveResearchReviewRecords(options = {}) {
  const filePath = options.filePath || COMPETITOR_LIVE_RESEARCH_REVIEW_FILE;
  const db = await readQueue(filePath);
  const status = tidy(options.status);
  const query = normalise(options.q);

  let records = [...db.records];

  if (status) {
    records = records.filter((record) => record.reviewStatus === status);
  }

  if (query) {
    records = records.filter((record) =>
      [
        record.manufacturer,
        record.sku,
        record.title,
        record.category,
        record.role,
        record.transport,
        record.summary,
        record.bestMatch?.sku,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }

  return {
    ok: true,
    count: records.length,
    records,
    updatedAt: db.updatedAt,
  };
}

export function mapLiveResearchToProductRecord(record, reviewer, sourceUrlOverride = "") {
  const sourceUrl =
    normaliseSourceUrl(sourceUrlOverride) ||
    normaliseSourceUrl(record?.sourceUrl) ||
    (Array.isArray(record?.sourceUrls)
      ? record.sourceUrls.map(normaliseSourceUrl).find(Boolean)
      : "");

  if (!sourceUrl) {
    throw new Error("A manufacturer or datasheet source URL is required before approval.");
  }

  const reviewedBy = tidy(reviewer);
  if (!reviewedBy) {
    throw new Error("Reviewer is required before approval.");
  }

  const technology = safeObject(record?.technologyProfile);
  const ioProfile = record?.ioProfile && typeof record.ioProfile === "object"
    ? record.ioProfile
    : {};
  const videoInputs = Array.isArray(ioProfile.videoInputs) ? ioProfile.videoInputs : [];
  const videoOutputs = Array.isArray(ioProfile.videoOutputs) ? ioProfile.videoOutputs : [];
  const usbGroups = Array.isArray(ioProfile.usb) ? ioProfile.usb : [];
  const video = record?.video && typeof record.video === "object" ? record.video : {};
  const features = record?.features && typeof record.features === "object" ? record.features : {};
  const now = nowIso();
  const canonicalTransport = tidy(technology?.canonicalTransport || record?.transport);
  const networkClass = tidy(technology?.networkClass);
  const maxResolution = tidy(video?.maxResolution);
  const chroma = tidy(video?.chroma);
  const usbPresent = usbGroups.length > 0;
  const usbBehaviour = uniqueStrings(
    usbGroups.map((group) => group?.label || group?.type),
    8,
  ).join(" | ");

  const sourceReferences = uniqueStrings([
    sourceUrl,
    ...(Array.isArray(record?.sourceUrls) ? record.sourceUrls : []),
  ]).filter((value) => normaliseSourceUrl(value));

  const category =
    tidy(record?.category) ||
    tidy(record?.comparisonDomain) ||
    "Uncategorized";

  const family =
    tidy(technology?.vendorTechnology) ||
    tidy(record?.comparisonDomain) ||
    category;

  const summary =
    tidy(record?.summary) ||
    `${record?.manufacturer || "Competitor"} ${record?.sku || ""} researched competitor profile.`;

  return {
    vendorType: "competitor",
    brand: tidy(record?.manufacturer),
    sku: normaliseSku(record?.sku),
    name: tidy(record?.title) || normaliseSku(record?.sku),
    family,
    category,
    summary,
    status: "approved",
    lifecycle: "live",
    sourceType: "live",
    confidence: Math.max(
      0.55,
      Math.min(0.98, Number(record?.bestMatch?.confidenceScore || 70) / 100),
    ),
    sourceUrls: sourceReferences,
    features: trueFeatureLabels(features),
    transport: canonicalTransport,
    inputs: mapIoGroups(videoInputs),
    outputs: mapIoGroups(videoOutputs),
    mirroredOutputs: [],
    control: [],
    audio: [],
    video: maxResolution
      ? {
          maxResolution,
          hdr: typeof features.hdr === "boolean" ? features.hdr : undefined,
        }
      : undefined,
    applications:
      tidy(record?.comparisonUseCase) && record.comparisonUseCase !== "UNKNOWN"
        ? [record.comparisonUseCase]
        : [],
    dependencies: [],
    compatibility: [],
    limitations: uniqueStrings([
      ...(Array.isArray(record?.bestMatch?.readiness?.warnings)
        ? record.bestMatch.readiness.warnings
        : []),
      ...(Array.isArray(record?.bestMatch?.readiness?.blockers)
        ? record.bestMatch.readiness.blockers
        : []),
    ]),
    evidence: [
      {
        type: "spec",
        label: "Reviewed live research source",
        value: summary,
        sourceUrl,
        notes: "Promoted from Wingman live competitor research after administrator review.",
      },
    ],
    reviewedBy,
    lastReviewedAt: now,
    changeNote: "Approved from the live competitor research queue.",
    notes:
      "Promoted from live competitor research. Product identity/specification approval only; no WyreStorm equivalence decision was created.",
    productTruth: {
      identity: {
        role: tidy(record?.role) || null,
        description: summary || null,
      },
      videoInput: {
        connector: firstConnector(videoInputs),
        quantity: sumGroups(videoInputs) || null,
      },
      videoOutput: {
        connector: firstConnector(videoOutputs),
        routedQuantity: sumGroups(videoOutputs) || null,
      },
      videoCapability: {
        maximumResolution: maxResolution || null,
        chroma: chroma || null,
        hdr: typeof features.hdr === "boolean" ? features.hdr : null,
        scaling: typeof features.scaling === "boolean" ? features.scaling : null,
        multiview: typeof features.multiview === "boolean" ? features.multiview : null,
        videoWall: typeof features.videoWall === "boolean" ? features.videoWall : null,
      },
      usb: {
        supported: usbPresent,
        version: null,
        hostDeviceBehaviour: usbBehaviour || null,
        kvm: typeof features.kvm === "boolean" ? features.kvm : null,
      },
      transport: {
        hdBaseT: canonicalTransport === "HDBaseT",
        avOverIp: canonicalTransport === "AV-over-IP",
        networkClass: networkClass || null,
      },
      technology,
      governance: {
        confidence: confidenceLabel(record?.bestMatch?.confidenceScore),
        sourceReferences,
        lastVerifiedAt: now,
        verificationNotes:
          "Reviewed and promoted from live research. Equivalence remains a separate governed decision.",
        qualityFlags: [],
      },
    },
    // Deliberately omitted: equivalence. Product/spec approval must never
    // silently approve a WyreStorm equivalent.
    equivalence: undefined,
  };
}

export async function approveLiveResearchReview(input, options = {}) {
  const filePath = options.filePath || COMPETITOR_LIVE_RESEARCH_REVIEW_FILE;
  const upsert = options.upsert || upsertProductIntelligenceRecord;
  const db = await readQueue(filePath);
  const id = tidy(input?.id);
  const index = db.records.findIndex((record) => record.id === id);

  if (index < 0) {
    return { ok: false, error: "Live research review record not found." };
  }

  const reviewer = tidy(input?.reviewer);
  const sourceUrl =
    normaliseSourceUrl(input?.sourceUrl) ||
    normaliseSourceUrl(db.records[index]?.sourceUrl);

  let payload;
  try {
    payload = mapLiveResearchToProductRecord(
      db.records[index],
      reviewer,
      sourceUrl,
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Review approval failed.",
    };
  }

  const promoted = await upsert(payload);
  if (!promoted?.ok || !promoted?.record) {
    return {
      ok: false,
      error: promoted?.error || "Product intelligence promotion failed.",
    };
  }

  const now = nowIso();
  const nextRecord = {
    ...db.records[index],
    reviewStatus: "approved",
    reviewedAt: now,
    reviewedBy: reviewer,
    reviewNotes: tidy(input?.notes),
    sourceUrl,
    sourceUrls: uniqueStrings([
      sourceUrl,
      ...(Array.isArray(db.records[index].sourceUrls)
        ? db.records[index].sourceUrls
        : []),
    ]),
    promotedRecordId: promoted.record.id || null,
    updatedAt: now,
  };

  db.records[index] = nextRecord;
  await writeQueue(db, filePath);

  return {
    ok: true,
    record: nextRecord,
    productRecord: promoted.record,
  };
}

export async function rejectLiveResearchReview(input, options = {}) {
  const filePath = options.filePath || COMPETITOR_LIVE_RESEARCH_REVIEW_FILE;
  const db = await readQueue(filePath);
  const id = tidy(input?.id);
  const index = db.records.findIndex((record) => record.id === id);

  if (index < 0) {
    return { ok: false, error: "Live research review record not found." };
  }

  const reviewer = tidy(input?.reviewer);
  if (!reviewer) {
    return { ok: false, error: "Reviewer is required before rejection." };
  }

  const now = nowIso();
  db.records[index] = {
    ...db.records[index],
    reviewStatus: "rejected",
    reviewedAt: now,
    reviewedBy: reviewer,
    reviewNotes: tidy(input?.notes) || "Rejected during live research review.",
    updatedAt: now,
  };

  await writeQueue(db, filePath);

  return {
    ok: true,
    record: db.records[index],
  };
}

export async function handleLiveResearchReviewQueueGet(
  req,
  res,
  url,
  { sendJson },
) {
  const result = await listLiveResearchReviewRecords({
    status: url.searchParams.get("status") || "",
    q: url.searchParams.get("q") || "",
  });
  sendJson(res, 200, result);
}

export async function handleLiveResearchReviewSubmitPost(
  req,
  res,
  url,
  { sendJson, parseJsonBody },
) {
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const result = await stageLiveResearchReview(body.result);
  if (!result.staged) {
    sendJson(res, 400, {
      ok: false,
      error: "Only a completed live-research result can be submitted for review.",
    });
    return;
  }

  sendJson(res, 200, result);
}

export async function handleLiveResearchReviewApprovePost(
  req,
  res,
  url,
  { sendJson, parseJsonBody },
) {
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const result = await approveLiveResearchReview(body);
  sendJson(res, result.ok ? 200 : 400, result);
}

export async function handleLiveResearchReviewRejectPost(
  req,
  res,
  url,
  { sendJson, parseJsonBody },
) {
  let body = {};
  try {
    body = await parseJsonBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body." });
    return;
  }

  const result = await rejectLiveResearchReview(body);
  sendJson(res, result.ok ? 200 : 400, result);
}
