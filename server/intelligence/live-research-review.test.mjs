import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveLiveResearchReview,
  listLiveResearchReviewRecords,
  mapLiveResearchToProductRecord,
  rejectLiveResearchReview,
  stageLiveResearchReview,
} from "./live-research-review.mjs";

let tempDir = "";
let filePath = "";

const liveResult = {
  ok: true,
  fetchedAt: "2026-08-18T19:00:00.000Z",
  competitor_lookup_mode: "live",
  resolved_competitor_url: "https://manufacturer.example/product/ENC-1",
  competitor_product: {
    manufacturer: "Example",
    model: "ENC-1",
    title: "Example Encoder",
    category: "Encoder",
    comparisonDomain: "AVOIP",
    comparisonUseCase: "DISTRIBUTION",
    transport: "AV-over-IP",
    role: "Encoder",
    subtype: "Vendor codec",
    summary: "1GbE AV-over-IP encoder.",
    resolvedUrl: "https://manufacturer.example/product/ENC-1",
    sourceUrls: ["https://manufacturer.example/product/ENC-1"],
    technologyProfile: {
      vendorTechnology: "Example Stream",
      canonicalTransport: "AV-over-IP",
      networkClass: "1GbE",
      codecName: "Vendor codec",
      interoperability: "vendor-ecosystem",
    },
    ioProfile: {
      videoInputs: [
        { type: "HDMI input", count: 1, label: "1 HDMI in", confidence: "explicit" },
      ],
      videoOutputs: [
        { type: "AVoIP stream", count: 1, label: "1 AVoIP stream", confidence: "explicit" },
      ],
      usb: [],
    },
    video: {
      maxResolution: "4K60",
      chroma: "4:4:4",
    },
    features: {
      hdr: true,
      scaling: false,
    },
  },
  best_match: {
    sku: "NHD-500-TX",
    name: "NHD-500-TX",
    match_type: "CLOSE MATCH",
    confidence_score: 84,
    readiness: {
      status: "review",
      summary: "Architecture aligns; codec differs.",
      warnings: ["Codec implementation differs."],
      blockers: [],
    },
  },
};

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "wingman-live-review-"));
  filePath = path.join(tempDir, "queue.json");
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("live research review governance", () => {
  it("stages only genuine live research into the review queue", async () => {
    const staged = await stageLiveResearchReview(liveResult, { filePath });
    expect(staged.staged).toBe(true);
    expect(staged.record.reviewStatus).toBe("pending");

    const listed = await listLiveResearchReviewRecords({ filePath });
    expect(listed.records).toHaveLength(1);
    expect(listed.records[0].bestMatch.sku).toBe("NHD-500-TX");

    const ignored = await stageLiveResearchReview(
      { ...liveResult, competitor_lookup_mode: "stored-intelligence" },
      { filePath },
    );
    expect(ignored.staged).toBe(false);
  });

  it("maps an approved discovery into product intelligence without approving equivalence", () => {
    const queueRecord = {
      ...(liveResult.competitor_product || {}),
      id: "live-research::example::ENC-1",
      manufacturer: "Example",
      sku: "ENC-1",
      title: "Example Encoder",
      sourceUrl: "https://manufacturer.example/product/ENC-1",
      sourceUrls: ["https://manufacturer.example/product/ENC-1"],
      bestMatch: liveResult.best_match,
    };

    const payload = mapLiveResearchToProductRecord(
      queueRecord,
      "admin@example.com",
    );

    expect(payload.status).toBe("approved");
    expect(payload.lifecycle).toBe("live");
    expect(payload.sourceType).toBe("live");
    expect(payload.productTruth.technology.networkClass).toBe("1GbE");
    expect(payload.productTruth.identity.role).toBe("Encoder");
    expect(payload.equivalence).toBeUndefined();
  });

  it("promotes an approved queue item and records the reviewer", async () => {
    await stageLiveResearchReview(liveResult, { filePath });

    const upsert = vi.fn().mockImplementation(async (payload) => ({
      ok: true,
      record: {
        ...payload,
        id: "competitor::example::ENC-1",
      },
    }));

    const approved = await approveLiveResearchReview(
      {
        id: "live-research::example::ENC-1",
        reviewer: "admin@example.com",
      },
      { filePath, upsert },
    );

    expect(approved.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorType: "competitor",
        brand: "Example",
        sku: "ENC-1",
        status: "approved",
      }),
    );
    expect(approved.record.reviewStatus).toBe("approved");
    expect(approved.record.reviewedBy).toBe("admin@example.com");
  });

  it("keeps rejection as a review decision without product promotion", async () => {
    await stageLiveResearchReview(liveResult, { filePath });

    const rejected = await rejectLiveResearchReview(
      {
        id: "live-research::example::ENC-1",
        reviewer: "admin@example.com",
        notes: "Wrong product page.",
      },
      { filePath },
    );

    expect(rejected.ok).toBe(true);
    expect(rejected.record.reviewStatus).toBe("rejected");
    expect(rejected.record.reviewNotes).toBe("Wrong product page.");
  });
});