import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { readProjectStore, writeProjectStore, type StoredProject } from "../../features/projects";
import { DependencyScopeReview } from "./DependencyScopeReview";

const PAIRING = "Which transmitter and receiver/end display input are paired, and does the path need USB, control, audio, or power?";
const CABLE = "Is the installed cable type, run length, patching, and certification known?";

/** The two dependency questions a boardroom matrix leaves open, as a save records them. */
function proposal() {
  return {
    title: "Boardroom",
    summary: "Share slides",
    sections: [],
    products: [{ sku: "MX-0402-MST", title: "Presentation matrix", category: "Switching", quantity: 1 }],
    assumptions: [],
    updatedAt: "2026-10-26T09:00:00.000Z",
    governedDependencies: [
      {
        id: "hdbaset-pairing",
        sku: "TBC-HDBASET-PAIR",
        label: "TX/RX pairing",
        role: "Signal extension pair",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: "Low",
        governanceKind: "Prompt",
        trigger: "Distance or extender language detected.",
        evidence: "Longest run basis: 100m+.",
        validationQuestion: PAIRING,
        customerSafeNote: "TX/RX compatibility, cable grade, and feature pass-through must be confirmed.",
      },
      {
        id: "cable-path",
        sku: "TBC-CABLE-PATH",
        label: "Cable path validation",
        role: "Infrastructure",
        qty: 1,
        type: "Validate",
        status: "validate",
        confidence: "Low",
        governanceKind: "Prompt",
        trigger: "Distance-based transport depends on the installed cable route.",
        evidence: "Path basis: 100m+.",
        validationQuestion: CABLE,
        customerSafeNote: "Installed cabling and pathway assumptions should be treated as validation items.",
      },
    ],
    bomRows: [
      { item: 1, sku: "MX-0402-MST", description: "Presentation matrix", role: "Switching", qty: 1, type: "Required", status: "included", evidence: "Customer brief", notes: "" },
      { item: 2, sku: "TBC-HDBASET-PAIR", description: "TX/RX pairing", role: "Signal extension pair", qty: 1, type: "Validate", status: "validate", evidence: "Longest run basis: 100m+.", notes: "Dependency prompt requiring design validation." },
      { item: 3, sku: "TBC-CABLE-PATH", description: "Cable path validation", role: "Infrastructure", qty: 1, type: "Validate", status: "validate", evidence: "Path basis: 100m+.", notes: "Dependency prompt requiring design validation." },
    ],
  };
}

function project(overrides: Partial<StoredProject> = {}): StoredProject {
  return {
    id: "project-1",
    name: "Boardroom",
    owner: "Northbridge",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Today",
    createdAt: "2026-10-26T09:00:00.000Z",
    updatedAt: "2026-10-26T09:00:00.000Z",
    resumeTo: "/wingman/proposal",
    proposal: proposal(),
    ...overrides,
  } as unknown as StoredProject;
}

function renderPanel(value: StoredProject) {
  return render(
    <MemoryRouter>
      <DependencyScopeReview project={value} />
    </MemoryRouter>,
  );
}

describe("DependencyScopeReview", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("names the questions the response carries instead of quote lines", () => {
    renderPanel(project());

    expect(screen.getByRole("heading", { name: "Dependencies to confirm" })).toBeTruthy();
    expect(screen.getByText("TX/RX pairing")).toBeTruthy();
    // The question the document prints travels with the row, so the rep answers
    // from the record rather than from memory of the gate.
    expect(screen.getByText(PAIRING)).toBeTruthy();
    expect(screen.getByText(CABLE)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Record Cable path validation as a documented dependency" })).toBeTruthy();
  });

  it("records an answer on the saved room without opening the proposal wizard", () => {
    const saved = project();
    writeProjectStore({ projects: [saved], proposalDrafts: [], activeProjectId: saved.id });
    const first = renderPanel(saved);

    fireEvent.click(screen.getByRole("button", { name: "Record TX/RX pairing as a documented dependency" }));

    const stored = readProjectStore().projects[0];
    // The decision is the project's own, so the wizard's gate reads the same
    // answer on its next visit.
    expect(stored.unquotedDependencySkus).toEqual(["TBC-HDBASET-PAIR"]);

    // The record as the page re-renders it from the store: the answered question
    // is no longer offered, and the other one still is.
    first.unmount();
    renderPanel(stored);
    expect(screen.queryByText("TX/RX pairing")).toBeNull();
    expect(screen.getByText("Cable path validation")).toBeTruthy();
  });

  it("offers nothing for a prompt the response has already answered", () => {
    renderPanel(project({ unquotedDependencySkus: ["TBC-HDBASET-PAIR", "TBC-CABLE-PATH"] }));

    expect(screen.queryByTestId("dependency-scope-review")).toBeNull();
  });

  it("renders no panel for a room with no saved response", () => {
    renderPanel(project({ proposal: undefined }));

    expect(screen.queryByTestId("dependency-scope-review")).toBeNull();
  });
});
