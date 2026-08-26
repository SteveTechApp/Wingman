import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { readProjectStore, upsertStoredProject } from "../data/projectStore";
import { routeCatalogByKey } from "../app/routeCatalog";
import { DashboardPage } from "./DashboardPage";

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={["/wingman"]}>
      <DashboardPage />
    </MemoryRouter>,
  );

  return within(screen.getByLabelText("Recent projects"));
}

describe("DashboardPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the fallback demo projects when the project store is empty", () => {
    const recentProjects = renderDashboard();

    expect(recentProjects.getByText("Northbridge Meeting Room Refresh")).not.toBeNull();
    expect(recentProjects.getByText("Harbour Retail Signage Rollout")).not.toBeNull();
    expect(recentProjects.getByText("Westbrook Classroom Standard")).not.toBeNull();
  });

  it("keeps governance administration off the Home landing page", () => {
    renderDashboard();

    expect(screen.queryByLabelText("Profiles awaiting human confirmation")).toBeNull();
    expect(screen.queryByLabelText("Human-verified profiles")).toBeNull();
    expect(screen.queryByLabelText("Approved competitor decisions")).toBeNull();
  });

  it("links each primary action to its Wingman route", () => {
    renderDashboard();

    expect(screen.getByRole("link", { name: /Start Discovery/ }).getAttribute("href")).toBe(
      routeCatalogByKey.discovery.path,
    );
    expect(screen.getByRole("link", { name: /Compare Products/ }).getAttribute("href")).toBe(
      routeCatalogByKey.compare.path,
    );
    expect(screen.getByRole("link", { name: /Browse Templates/ }).getAttribute("href")).toBe(
      routeCatalogByKey.templates.path,
    );
    expect(screen.getByRole("link", { name: /My Projects/ }).getAttribute("href")).toBe(
      routeCatalogByKey.projects.path,
    );
  });

  it("renders a real project from the store with its Discovery progress", () => {
    upsertStoredProject({
      id: "acme-hq-boardroom",
      name: "Acme HQ Boardroom",
      owner: "Steve",
      stage: "Discovery",
      status: "recommended",
      updated: "Just now",
      resumeTo: routeCatalogByKey.discovery.path,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      discoveryBrief: { capturedPercent: 42 } as never,
    });

    const recentProjects = renderDashboard();

    expect(recentProjects.getByText("Acme HQ Boardroom")).not.toBeNull();
    expect(recentProjects.getByLabelText("Discovery: 42%")).not.toBeNull();
  });

  it("shows the interview resume position and jumps straight back into the interview", () => {
    upsertStoredProject({
      id: "acme-hq-boardroom",
      name: "Acme HQ Boardroom",
      owner: "Steve",
      stage: "Discovery",
      status: "recommended",
      updated: "Just now",
      resumeTo: routeCatalogByKey.discovery.path,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      discoveryBrief: {
        capturedPercent: 42,
        nextBestQuestion: "Confirm the USB host requirement",
        discoveryConversation: [
          { stepId: "opportunity", question: "What type of opportunity is this?", answer: "Meeting room / boardroom", note: "" },
          { stepId: "scale", question: "What is the room scale?", answer: "Single large room", note: "" },
        ],
      } as never,
    });

    const recentProjects = renderDashboard();

    const resumeLine = recentProjects.getByTestId("dashboard-resume-position");
    expect(resumeLine.textContent).toContain("Resume interview");
    expect(resumeLine.textContent).toContain("Confirm the USB host requirement");
    expect(resumeLine.textContent).toContain("2 answered");

    const card = recentProjects.getByText("Acme HQ Boardroom").closest("a");
    expect(card!.getAttribute("href")).toContain("resume=project");
    expect(card!.getAttribute("href")).toContain("interview=1");
  });

  it("sets the clicked project as the active project", () => {
    upsertStoredProject({
      id: "acme-hq-boardroom",
      name: "Acme HQ Boardroom",
      owner: "Steve",
      stage: "Discovery",
      status: "recommended",
      updated: "Just now",
      resumeTo: routeCatalogByKey.discovery.path,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const recentProjects = renderDashboard();

    fireEvent.click(recentProjects.getByText("Acme HQ Boardroom"));

    expect(readProjectStore().activeProjectId).toBe("acme-hq-boardroom");
  });
});