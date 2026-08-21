import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runCompetitorLookup, submitLiveResearchReview, WingmanApiError } from "../../api/wingmanApi";
import { findSavedCompetitorSpec } from "../../lib/savedCompetitorSpecs";
import { CompetitorEvidencePanel } from "./CompetitorEvidencePanel";

vi.mock("../../api/wingmanApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/wingmanApi")>();
  return { ...actual, runCompetitorLookup: vi.fn(), submitLiveResearchReview: vi.fn() };
});

const mockedLookup = vi.mocked(runCompetitorLookup);
const mockedSubmit = vi.mocked(submitLiveResearchReview);

describe("CompetitorEvidencePanel live lookup", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockedLookup.mockReset();
    mockedSubmit.mockReset();
  });

  it("shows a persistent sign-in action when the protected lookup rejects the request", async () => {
    mockedLookup.mockRejectedValue(new WingmanApiError("Authentication required.", 401));
    render(<CompetitorEvidencePanel brand="Blustream" sku="UNKNOWN-SKU" onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run live lookup" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Live lookup could not run");
    expect(
      screen.getByRole("link", { name: "Open Workspace settings" }).getAttribute("href"),
    ).toBe("/wingman/settings");
    expect(mockedLookup).toHaveBeenCalledWith({ brand: "Blustream", sku: "UNKNOWN-SKU" });
  });

  it("shows lookup progress and renders returned manufacturer evidence", async () => {
    let finishLookup: ((value: Awaited<ReturnType<typeof runCompetitorLookup>>) => void) | undefined;
    mockedLookup.mockImplementation(() => new Promise((resolve) => { finishLookup = resolve; }));
    render(<CompetitorEvidencePanel brand="Blustream" sku="NEW-SKU" onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run live lookup" }));
    expect(screen.getByRole("status").textContent).toContain(
      "Searching approved manufacturer sources",
    );

    finishLookup?.({
      ok: true,
      record: { name: "New Blustream product", summary: "Verified manufacturer summary.", sourceUrl: "https://www.blustream.co.uk/example" },
    });

    await waitFor(() => expect(screen.queryByText("New Blustream product")).not.toBeNull());
    expect(screen.getAllByText("Verified manufacturer summary.").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("link", { name: "View manufacturer source" }).getAttribute("href"),
    ).toBe("https://www.blustream.co.uk/example");
  });

  it("surfaces a general (non-auth) lookup error with a retry action rather than a sign-in prompt", async () => {
    mockedLookup.mockRejectedValue(new WingmanApiError("Upstream manufacturer source timed out.", 502));
    render(<CompetitorEvidencePanel brand="Atlona" sku="AT-UNKNOWN" onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run live lookup" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Live lookup could not run");
    expect(alert.textContent).toContain("Upstream manufacturer source timed out.");
    // A general error offers a retry, not the workspace sign-in route.
    expect(screen.getByRole("button", { name: "Try live lookup again" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Open Workspace settings" })).toBeNull();
  });

  it("falls back to a manual-confirmation message when the lookup throws a non-API error", async () => {
    mockedLookup.mockRejectedValue(new Error("network down"));
    render(<CompetitorEvidencePanel brand="Kramer" sku="KR-UNKNOWN" onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run live lookup" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "Live lookup failed. Confirm the product on the manufacturer's site directly.",
    );
  });

  it("recovers on retry: a failed lookup then a successful one renders the evidence", async () => {
    mockedLookup
      .mockRejectedValueOnce(new WingmanApiError("Temporary upstream error.", 503))
      .mockResolvedValueOnce({
        ok: true,
        record: { name: "Recovered product", summary: "Second attempt summary.", sourceUrl: "https://example.com/x" },
      });
    render(<CompetitorEvidencePanel brand="Extron" sku="EX-RETRY" onSaved={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Run live lookup" }));
    fireEvent.click(await screen.findByRole("button", { name: "Try live lookup again" }));

    await waitFor(() => expect(screen.queryByText("Recovered product")).not.toBeNull());
    expect(mockedLookup).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps confirmed live facts locally and submits the same research package for admin review", async () => {
    const onSaved = vi.fn();
    const liveResult = {
      ok: true,
      competitor_lookup_mode: "live",
      resolved_competitor_url: "https://cypeurope.com/product/el-42m-pip",
      competitor_product: {
        manufacturer: "CYP",
        model: "EL-42M-PIP",
        title: "CYP EL-42M-PIP",
        comparisonDomain: "MULTIVIEW",
        role: "Multiview Processor",
        transport: "HDMI",
        summary: "4x2 seamless matrix and multiviewer",
        video: { maxResolution: "4K60", chroma: "4:4:4" },
        ioProfile: { headline: { inputs: 4, outputs: 2 } },
      },
    } as const;
    mockedSubmit.mockResolvedValue({ ok: true, staged: true });

    render(<CompetitorEvidencePanel brand="CYP" sku="EL-42M-PIP" onSaved={onSaved} liveResearchResult={liveResult} />);
    fireEvent.click(await screen.findByRole("button", { name: "Keep researched facts" }));

    await screen.findByText(/Sent to Wingman admin for formal review/i);
    expect(mockedSubmit).toHaveBeenCalledWith(liveResult);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(findSavedCompetitorSpec("CYP", "EL-42M-PIP")).toMatchObject({
      domain: "MULTIVIEW",
      role: "Multiview Processor",
      inputCount: 4,
      outputCount: 2,
      maxResolution: "4K60",
      savedFrom: "live-lookup",
    });
  });
});
