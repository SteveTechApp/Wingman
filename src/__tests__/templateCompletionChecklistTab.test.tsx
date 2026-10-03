import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { createDeploymentTemplate, readRoomConcept, type RoomDeploymentDesign } from "../wingman2/lib/roomTemplateDeployment";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { saveCustomRoomTemplate, CUSTOM_ROOM_TEMPLATE_EVENT } from "../wingman2/lib/customRoomTemplates";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";

const design: RoomDeploymentDesign = {
  id: "ui-chk", name: "Checklist UI design", vertical: "Corporate", space: "10-seat meeting room, 4 × 6 m.",
  construction: "Fit-out within an existing office floor.", occupancy: "10 seats.", activity: "Hybrid meetings with local presentation.",
  transport: "hdbt",
  sources: [["Laptop at the wallplate", 1, "Table position 1"]], outputs: [["75\" display", 1, "Front wall"]],
  speakers: 2, microphones: 2,   audio: {
    approach: "programme-and-speech", experience: "Speech intelligibility for meetings with programme playback.",
    zones: [{ name: "Room", purpose: "Meeting audio", speakers: 2, topology: "lowZ", amplifierWatts: 120 }],
    microphones: "2 table microphones", processing: "DSP with AEC for conferencing.",
    connectivity: "Analogue mic lines to the DSP.", dante: false, aec: true,
    programmeFeeds: 0, routing: "Programme and speech mixed in the DSP.",
  },
  rationale: "Single-run HDBaseT extension for one table input to one display.",
  alternative: "A UC bar for conferencing if calls become routine.",
  constraints: ["Confirm the wallplate back-box depth."],
};

function renderReview(templateId: string) {
  return render(
    <MemoryRouter initialEntries={[`/wingman/templates/${templateId}`]}>
      <Routes>
        <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("template complete-room checklist tab", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the six layers with unspecified guidance for a completion-free template", () => {
    const template = roomTemplates[0];
    renderReview(template.id);

    const tab = screen.getByRole("tab", { name: "Complete room" });
    expect(tab).toHaveAttribute("aria-selected", "false");
    fireEvent.click(tab);

    const section = screen.getByLabelText("Complete-room design checklist");
    expect(within(section).getByRole("heading", { name: "Does this design describe a whole room?" })).toBeVisible();
    expect(within(section).getByText(/5 layers to decide/)).toBeVisible();
    expect(within(section).getAllByText("Covered")).toHaveLength(1);
    expect(within(section).getAllByText("Not addressed")).toHaveLength(5);
    expect(within(section).getByText("Signal transport")).toBeVisible();
    expect(within(section).getByText("Compliance & governance")).toBeVisible();
  });

  it("surfaces authored completion layers as covered with their design values", () => {
    const template = createDeploymentTemplate({
      ...design,
      completion: {
        humanFactors: { farthestViewerMetres: 4.5, contentClass: "bdm" },
        assurance: { trainingAudience: "the teaching team", warrantyTier: "on-site-nbd" },
      },
    });
    const saved = saveCustomRoomTemplate(template, { sourceTemplateId: "ui-chk-source" });
    renderReview(saved.id);

    fireEvent.click(screen.getByRole("tab", { name: "Complete room" }));

    const section = screen.getByLabelText("Complete-room design checklist");
    expect(within(section).getByText(/3 layers to decide/)).toBeVisible();
    const hf = within(section).getByText("Experience & human factors").closest("li")!;
    expect(within(hf).getByText("Covered")).toBeVisible();
    expect(within(hf).getByText(/Farthest viewer 4\.5 m/)).toBeVisible();
    const assurance = within(section).getByText("Services & assurance").closest("li")!;
    expect(within(assurance).getByText(/the teaching team/)).toBeVisible();
  });

  it("preserves the completion block through custom-template persistence", () => {
    const template = createDeploymentTemplate({
      ...design,
      completion: { compliance: { assistiveListening: "required" } },
    });
    saveCustomRoomTemplate(template, { sourceTemplateId: "ui-chk-source" });
    const stored = window.localStorage.getItem("wingman-custom-room-templates-v1")!;
    const parsed = JSON.parse(stored)[0];
    expect(parsed.concept.completion).toBeDefined();

    const reread = readRoomConcept(parsed.concept);
    expect(reread?.completion).toEqual({ compliance: { assistiveListening: "required" } });
  });
});
