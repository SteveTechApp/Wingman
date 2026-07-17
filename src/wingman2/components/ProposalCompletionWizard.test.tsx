import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  readProjectStore,
  setActiveProjectId,
  upsertStoredProject,
} from "../data/projectStore";
import { ProposalCompletionWizard } from "./ProposalCompletionWizard";

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
});
