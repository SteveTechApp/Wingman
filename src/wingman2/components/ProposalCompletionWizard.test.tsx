import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  readProjectStore,
  setActiveProjectId,
  upsertStoredProject,
} from "../data/projectStore";
import { ProposalCompletionWizard } from "./ProposalCompletionWizard";
import { createProposalWizardDefaults, saveProposalWizardDraft } from "../lib/proposalWizard";

function renderWizard() {
  render(
    <MemoryRouter initialEntries={["/wingman/proposal"]}>
      <ProposalCompletionWizard />
    </MemoryRouter>,
  );
}

function seedActiveProject() {
  upsertStoredProject({
    id: "acme-hq-boardroom",
    name: "Acme HQ Boardroom",
    owner: "Steve",
    stage: "Proposal Builder",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/proposal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  setActiveProjectId("acme-hq-boardroom");
}

describe("ProposalCompletionWizard", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prompts to open a project when there is no active project", () => {
    renderWizard();

    expect(screen.getByText("Open a project before building a proposal")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Open projects" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Start Discovery" })).not.toBeNull();
  });

  it("renders the completion wizard for the active project", () => {
    seedActiveProject();
    renderWizard();

    expect(screen.getByText("Complete and export the customer proposal")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Proposal completion steps" })).not.toBeNull();
    expect(screen.getByText(/% complete/)).not.toBeNull();
  });

  it("gates every export button until readiness reaches 100%", () => {
    seedActiveProject();
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    for (const name of [
      "Export formatted DOCX",
      "Export PDF",
      "Export HTML",
      "Export BOM CSV",
    ]) {
      const button = screen.getByRole("button", { name: new RegExp(name) });
      expect(button.hasAttribute("disabled")).toBe(true);
    }
  });

  it("records recommendation feedback against the active project", () => {
    seedActiveProject();
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));
    fireEvent.click(screen.getByRole("button", { name: /Looks right/ }));

    expect(screen.getByText("Thanks - this helps improve future recommendations.")).not.toBeNull();

    const project = readProjectStore().projects.find((item) => item.id === "acme-hq-boardroom");
    expect(project?.feedback?.[0]?.rating).toBe("accepted");
    expect(project?.feedback?.[0]?.scope).toBe("proposal");
  });

  it("restores a saved proposal BOM when project selections are not separately present", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      proposal: {
        title: "Acme HQ Boardroom",
        summary: "Two-source boardroom presentation system.",
        sections: [],
        assumptions: [],
        products: [
          {
            sku: "NHD-600-TRX",
            title: "NetworkHD 600 transceiver",
            category: "AV-over-IP endpoint",
            quantity: 4,
          },
        ],
        bomRows: [
          {
            item: 1,
            sku: "NHD-600-TRX",
            description: "NetworkHD 600 transceiver",
            role: "Source and display endpoint",
            qty: 4,
            type: "Required",
            status: "recommended",
            evidence: "Two sources and two displays.",
            notes: "Configure endpoint roles before commissioning.",
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));

    expect(screen.getByText("NHD-600-TRX")).not.toBeNull();
    expect((screen.getByRole("spinbutton", { name: "Quantity for NHD-600-TRX" }) as HTMLInputElement).value).toBe("4");
    expect(screen.queryByText(/No final WyreStorm BOM is attached yet/i)).toBeNull();
  });

  it("refreshes discovery-derived wording and exposes direct edit links when the brief changes", () => {
    seedActiveProject();
    const currentProject = readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!;
    upsertStoredProject({
      ...currentProject,
      discoveryBrief: {
        capturedPercent: 88,
        roomModel: {
          application: "Meeting room / boardroom",
          roomType: "Meeting room / boardroom",
          outcome: "Meeting room for two local sources and two independently routed displays.",
          scale: "Single large room",
          sourceCount: "2-4 sources",
          displayCount: "2 displays / outputs",
          displayBehaviour: "Different content by display or zone",
        },
      },
    });
    saveProposalWizardDraft(createProposalWizardDefaults({
      projectId: "acme-hq-boardroom",
      projectName: "Acme HQ Boardroom",
      preparedBy: "Steve",
      executiveSummary: "Opportunity: Classroom / teaching space\nSources: 5-8 sources",
      architectureNarrative: "Old classroom architecture",
      discoveryFingerprint: "old-classroom-brief",
    }));

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));

    const summary = screen.getByRole("textbox", { name: "Executive summary" }) as HTMLTextAreaElement;
    expect(summary.value).toContain("Meeting room for two local sources");
    expect(summary.value).not.toContain("Classroom / teaching space");
    expect(screen.getByRole("link", { name: "Edit Application in Discovery" }).getAttribute("href"))
      .toBe("/wingman/discovery?edit=opportunity");
    expect(screen.getByRole("link", { name: "Edit Sources in Discovery" }).getAttribute("href"))
      .toBe("/wingman/discovery?edit=sources");
  });
});
