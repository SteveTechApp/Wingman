import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteSurveyPhotoCapture } from "./SiteSurveyPhotoCapture";
import { analyzeSiteSurveyPhoto, mapExtractionToTopology } from "../lib/siteSurveyPhotoAnalysis";

vi.mock("../lib/siteSurveyPhotoAnalysis", () => ({
  analyzeSiteSurveyPhoto: vi.fn(),
  mapExtractionToTopology: vi.fn(),
}));

vi.mock("../lib/siteSurveyPhotoToTopology", () => ({
  applyPhotoExtractionToTopology: vi.fn(() => ({
    locationsAdded: [],
    devicesAdded: [],
    connectionsAdded: [],
    warnings: [],
  })),
  buildUpdatedTopology: vi.fn(() => ({
    schemaVersion: 1,
    mode: "simple",
    locations: [],
    devices: [],
    connections: [],
    generatedFromDiscovery: false,
    createdAt: "2026-10-22T09:00:00.000Z",
    updatedAt: "2026-10-22T09:00:00.000Z",
  })),
}));

const TOPOLOGY = {
  schemaVersion: 1 as const,
  mode: "simple" as const,
  locations: [],
  devices: [],
  connections: [],
  generatedFromDiscovery: false,
  createdAt: "2026-10-22T09:00:00.000Z",
  updatedAt: "2026-10-22T09:00:00.000Z",
};

function renderCapture() {
  return render(
    <SiteSurveyPhotoCapture
      onExtractionReady={vi.fn()}
      onTopologyUpdate={vi.fn()}
      existingTopology={TOPOLOGY}
      existingLocationNames={[]}
      existingEquipmentNames={[]}
    />,
  );
}

describe("SiteSurveyPhotoCapture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:site-photo");
    URL.revokeObjectURL = vi.fn();
    vi.mocked(mapExtractionToTopology).mockReturnValue({
      locationsToCreate: [],
      equipmentToCreate: [],
      cablesToCreate: [],
      locationNameToId: new Map(),
      equipmentNameToId: new Map(),
    });
    vi.mocked(analyzeSiteSurveyPhoto).mockResolvedValue({
      id: "survey-1",
      fileName: "boardroom.jpg",
      summary: "Sample summary: no model was called.",
      locations: [],
      equipment: [],
      cables: [],
      rawObservations: [],
      confidence: 0.62,
      analyzedAt: "2026-10-22T09:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function pick(container: HTMLElement) {
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(["photo"], "boardroom.jpg", { type: "image/jpeg" })] },
    });
  }

  it("analyses a site photo without asking for sample data by default", async () => {
    const { container } = renderCapture();

    pick(container);

    await waitFor(() => expect(vi.mocked(analyzeSiteSurveyPhoto)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(analyzeSiteSurveyPhoto).mock.calls[0][1]).toEqual({ mock: false });
  });

  it("asks for the development sample only while the switch is on", async () => {
    const { container } = renderCapture();

    // The switch is what lets the review and apply steps be walked without a
    // model key; it only ever appears on a development build.
    fireEvent.click(screen.getByTestId("site-survey-photo-mock"));
    pick(container);

    await waitFor(() => expect(vi.mocked(analyzeSiteSurveyPhoto)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(analyzeSiteSurveyPhoto).mock.calls[0][1]).toEqual({ mock: true });
    // The sample is reviewed like a real reading, so the result still renders.
    await waitFor(() => expect(screen.getByText(/Sample summary/)).toBeTruthy());
  });
});
