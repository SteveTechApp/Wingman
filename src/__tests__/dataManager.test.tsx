import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataManagerPage } from "@/wingman2/pages/DataManagerPage";
import { lifecycleToApiStatus, validateProductRecord, type ProductIntelligenceRecord } from "@/wingman2/data/productIntelligenceRepository";

const getWingmanSession = vi.fn();
const getWingmanJson = vi.fn();
const postWingmanJson = vi.fn();
const fetchLiveResearchReviewQueue = vi.fn();
const approveLiveResearchReview = vi.fn();
const rejectLiveResearchReview = vi.fn();

vi.mock("@/wingman2/api/wingmanApi", () => ({
  getWingmanSession: (...args: unknown[]) => getWingmanSession(...args),
  getWingmanJson: (...args: unknown[]) => getWingmanJson(...args),
  postWingmanJson: (...args: unknown[]) => postWingmanJson(...args),
  fetchLiveResearchReviewQueue: (...args: unknown[]) => fetchLiveResearchReviewQueue(...args),
  approveLiveResearchReview: (...args: unknown[]) => approveLiveResearchReview(...args),
  rejectLiveResearchReview: (...args: unknown[]) => rejectLiveResearchReview(...args),
}));

const record: ProductIntelligenceRecord = {
  id: "wyrestorm::wyrestorm::TEST-1",
  vendorType: "wyrestorm",
  brand: "WyreStorm",
  sku: "TEST-1",
  name: "Test encoder",
  family: "NetworkHD",
  category: "AVoIP",
  summary: "Test",
  status: "approved",
  lifecycle: "live",
  transport: "1GbE",
  inputs: [{ type: "HDMI", count: 1 }],
  outputs: [{ type: "HDMI", count: 1 }],
  mirroredOutputs: [{ type: "HDMI", count: 1 }],
  features: [],
  evidence: [{ label: "Datasheet", value: "1x HDMI", sourceUrl: "https://example.com" }],
  updatedAt: "2026-08-05T10:00:00Z",
  reviewedBy: "admin@example.com",
};

const liveResearchRecord = {
  id: "live-research::example::ENC-1",
  manufacturer: "Example",
  sku: "ENC-1",
  title: "Example Encoder",
  category: "AV-over-IP",
  comparisonDomain: "AVOIP",
  comparisonUseCase: "DISTRIBUTION",
  role: "Encoder",
  transport: "AV-over-IP",
  subtype: "Vendor codec",
  summary: "Researched 1GbE encoder.",
  sourceUrl: "https://manufacturer.example/ENC-1",
  sourceUrls: ["https://manufacturer.example/ENC-1"],
  technologyProfile: {
    vendorTechnology: "Example Stream",
    canonicalTransport: "AV-over-IP",
    networkClass: "1GbE",
    codecName: "Vendor codec",
  },
  bestMatch: {
    sku: "NHD-500-TX",
    matchType: "CLOSE MATCH",
    confidenceScore: 84,
    readiness: {
      status: "review",
      summary: "Review codec implementation.",
      blockers: [],
      warnings: ["Codec differs."],
      strengths: ["1GbE architecture aligns."],
      nextActions: [],
      reviewRequired: true,
    },
  },
  reviewStatus: "pending",
};

describe("ADMIN Data Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWingmanJson.mockResolvedValue({ ok: true, records: [record] });
    postWingmanJson.mockResolvedValue({ ok: true, record });
    fetchLiveResearchReviewQueue.mockResolvedValue({ ok: true, records: [] });
    approveLiveResearchReview.mockResolvedValue({ ok: true });
    rejectLiveResearchReview.mockResolvedValue({ ok: true });
  });

  it("allows an administrator to access the product table", async () => {
    getWingmanSession.mockResolvedValue({ ok: true, session: { workspaceRole: "admin", user: { email: "admin@example.com" } } });
    render(<MemoryRouter><DataManagerPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Data Manager" })).toBeInTheDocument();
    await screen.findByRole("heading", { name: "Data Manager" });
    fireEvent.click(screen.getByRole("button", { name: /WyreStorm Products/ }));
    expect(await screen.findByText("TEST-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Product/ })).toBeInTheDocument();
  });

  it("allows local development access without an admin session", async () => {
    getWingmanSession.mockResolvedValue({ ok: true, session: { workspaceRole: "sales" } });
    render(<MemoryRouter><DataManagerPage /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Data Manager" });
    fireEvent.click(screen.getByRole("button", { name: /WyreStorm Products/ }));
    expect(await screen.findByText("TEST-1")).toBeInTheDocument();
    expect(getWingmanJson).toHaveBeenCalledWith("/api/product-intelligence?limit=1000");
  });

  it("edits routed and mirrored outputs independently", async () => {
    getWingmanSession.mockResolvedValue({ ok: true, session: { workspaceRole: "admin" } });
    render(<MemoryRouter><DataManagerPage /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Data Manager" });
    fireEvent.click(screen.getByRole("button", { name: /WyreStorm Products/ }));
    const sku = await screen.findByText("TEST-1");
    fireEvent.click(within(sku.closest("tr")!).getByRole("button", { name: /Edit/ }));
    const routed = screen.getByLabelText("Routed outputs quantity 1");
    const mirrored = screen.getByLabelText("Mirrored / local outputs quantity 1");
    fireEvent.change(routed, { target: { value: "4" } });
    expect(mirrored).toHaveValue(1);
    fireEvent.change(mirrored, { target: { value: "2" } });
    expect(routed).toHaveValue(4);
  });

  it("archives DO NOT USE products through the governed status API", async () => {
    getWingmanSession.mockResolvedValue({ ok: true, session: { workspaceRole: "admin", user: { email: "admin@example.com" } } });
    render(<MemoryRouter><DataManagerPage /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Data Manager" });
    fireEvent.click(screen.getByRole("button", { name: /WyreStorm Products/ }));
    const sku = await screen.findByText("TEST-1");
    fireEvent.click(within(sku.closest("tr")!).getByRole("button", { name: /Archive/ }));
    await waitFor(() => expect(postWingmanJson).toHaveBeenCalledWith("/api/product-intelligence/status", expect.objectContaining({ status: "expired", notes: expect.stringContaining("do-not-use") })));
  });

  it("reviews and promotes live competitor research without approving equivalence", async () => {
    getWingmanSession.mockResolvedValue({
      ok: true,
      session: {
        workspaceRole: "admin",
        user: { email: "admin@example.com" },
      },
    });
    fetchLiveResearchReviewQueue.mockResolvedValue({
      ok: true,
      records: [liveResearchRecord],
    });

    render(<MemoryRouter><DataManagerPage /></MemoryRouter>);

    await screen.findByRole("heading", { name: "Data Manager" });
    fireEvent.click(screen.getByRole("button", { name: "Live Research" }));

    expect(
      await screen.findByRole("heading", { name: "Live Research Review" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Example ENC-1/)).toBeInTheDocument();
    expect(screen.getByText(/NHD-500-TX/)).toBeInTheDocument();
    expect(screen.getByText(/does not approve the proposed WyreStorm equivalence/i)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Approve & use in Compare" }),
    );

    await waitFor(() =>
      expect(approveLiveResearchReview).toHaveBeenCalledWith({
        id: "live-research::example::ENC-1",
        reviewer: "admin@example.com",
        sourceUrl: "https://manufacturer.example/ENC-1",
      }),
    );
  });
});

describe("Data Manager validation and lifecycle mapping", () => {
  it("maps blocked lifecycle values out of new recommendation eligibility", () => {
    expect(lifecycleToApiStatus("live")).toBe("approved");
    expect(lifecycleToApiStatus("do-not-use")).toBe("expired");
    expect(lifecycleToApiStatus("discontinued")).toBe("expired");
    expect(lifecycleToApiStatus("superseded")).toBe("expired");
  });

  it("rejects malformed identity, ports and missing AVoIP transport", () => {
    const invalid = { ...record, brand: "", sku: "", category: "AVoIP", transport: "", inputs: [{ type: "HDMI", count: -1 }] };
    expect(validateProductRecord(invalid, [])).toMatchObject({ brand: expect.any(String), sku: expect.any(String), ports: expect.any(String), transport: expect.any(String) });
  });
});