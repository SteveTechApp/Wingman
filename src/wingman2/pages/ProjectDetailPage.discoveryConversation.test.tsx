import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const { storedProject } = vi.hoisted(() => ({
  storedProject: {
    id: "project-1",
    name: "Meeting Room Refresh",
    owner: "Northbridge",
    stage: "Discovery",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-08-04T09:00:00.000Z",
    resumeTo: "/wingman/discovery",
    requirements: [],
    productSelections: [],
    compareRuns: [] as unknown[],
    discoveryBrief: {
      capturedPercent: 80,
      roomModel: {
        clientName: "Northbridge",
        application: "Boardroom",
      },
      discoveryConversation: [
        {
          stepId: "opportunity",
          question: "What type of opportunity is this?",
          answer: "Meeting room / boardroom",
          note: "The exec boardroom on the top floor.",
          confirmed: true,
        },
        {
          stepId: "scale",
          question: "What is the approximate room or system scale?",
          answer: "Single large room",
          note: "",
        },
      ],
    },
  },
}));

vi.mock("../data/projectStore", () => ({
  setActiveProjectId: vi.fn(),
  saveProjectRequirementsToProject: vi.fn(),
  updateStoredProject: vi.fn(),
  useProjectStore: () => ({
    projects: [storedProject],
    syncStatus: { state: "local", message: "Saved in this browser." },
    deleteProject: vi.fn(),
  }),
}));

import { ProjectDetailPage } from "./ProjectDetailPage";

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/wingman/projects/project-1"]}>
      <Routes>
        <Route path="/wingman/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function conversationSection() {
  const section = screen.getByText("Discovery conversation").closest("section");
  expect(section).not.toBeNull();
  return section!;
}

describe("ProjectDetailPage discovery conversation", () => {
  it("shows the Q&A trail with confirmation status and edit links", () => {
    renderDetail();

    const section = conversationSection();

    // Confirmed row renders as settled; open row carries the to-be-confirmed tone.
    expect(within(section).getByText("What type of opportunity is this?")).not.toBeNull();
    expect(within(section).getByText("Meeting room / boardroom")).not.toBeNull();
    expect(within(section).getByText("Confirmed with customer")).not.toBeNull();
    expect(within(section).getByText(/Single large room — to be confirmed/)).not.toBeNull();
    expect(within(section).getByText("To be confirmed")).not.toBeNull();

    // Each row deep-links back into Discovery for the question that produced it.
    const editLink = within(section).getByRole("link", {
      name: /Edit "What is the approximate room or system scale\?" in Discovery/,
    });
    expect(editLink.getAttribute("href")).toContain("/wingman/discovery?edit=scale");
  });

  it("shows the empty state when no conversation has been captured", () => {
    storedProject.discoveryBrief.discoveryConversation = [];
    renderDetail();

    const section = conversationSection();
    expect(
      within(section).getByText(/No discovery answers have been captured yet/),
    ).not.toBeNull();
  });
});
