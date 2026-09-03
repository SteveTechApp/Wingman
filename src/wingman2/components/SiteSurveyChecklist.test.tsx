import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteSurveyChecklist } from "./SiteSurveyChecklist";
import type { StoredDiscoveryBrief, StoredProject } from "../data/projectStore";

// The sync module polls a backend and pushes edits on mount; this suite only
// pins the two download handlers, so the sync plumbing is stubbed and the real
// siteSurveyStorage + siteSurveyChecklist (whose downloadSiteSurveyHtml runs
// the deferred revoke under test) stay live.
vi.mock("../lib/siteSurveySync", () => ({
  startSurveySync: vi.fn(),
  stopSurveySync: vi.fn(),
  onSyncStatusChange: vi.fn(() => () => {}),
}));

// The checklist's action buttons only render when the discovery topology has
// content (a location or a cable), so the fixture seeds one location. The rest
// of the brief is irrelevant to the two download handlers under test.
const discoveryBrief = {
  topology: {
    locations: [{ id: "loc-boardroom", name: "Boardroom", type: "room" }],
  },
} as unknown as StoredDiscoveryBrief;

const project: StoredProject = {
  id: "acme-hq-boardroom",
  name: "Acme HQ Boardroom",
  owner: "Steve",
  stage: "Proposal Builder",
  status: "recommended",
  updated: "Just now",
  resumeTo: "/wingman/site-survey/acme-hq-boardroom",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  discoveryBrief,
};

// SiteSurveyChecklist's download handlers (Download HTML ->
// downloadSiteSurveyHtml and Export Edits -> JSON) revoke their blob URLs on a
// later task so the browser can begin the download fetch against a still-live
// URL. These tests pin that deferral from the component.
describe("SiteSurveyChecklist download deferral", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    Reflect.deleteProperty(URL, "revokeObjectURL");
    vi.restoreAllMocks();
  });

  it("downloads the checklist HTML and revokes the blob URL only after the download task starts", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wingman-test-survey-html");
    const revokeSpy = vi.fn();
    // revokeObjectURL is inherited in this environment; install an own,
    // spyable version so the deferred revoke can be observed.
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeSpy });

    render(<SiteSurveyChecklist project={project} />);

    fireEvent.click(screen.getByRole("button", { name: "Download HTML" }));

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeSpy).not.toHaveBeenCalled();

    await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith("blob:wingman-test-survey-html"));
  });

  it("exports the survey edits JSON and defers its revoke the same way", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wingman-test-survey-edits");
    const revokeSpy = vi.fn();
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeSpy });

    render(<SiteSurveyChecklist project={project} />);

    fireEvent.click(screen.getByRole("button", { name: "Export Edits" }));

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeSpy).not.toHaveBeenCalled();

    await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith("blob:wingman-test-survey-edits"));
  });
});
