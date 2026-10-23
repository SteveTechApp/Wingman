import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { deleteStoredProject, readProjectStore, upsertStoredProject } from "../data/projectStore";
import { routeCatalogByKey } from "../app/routeCatalog";
import { DashboardPage } from "./DashboardPage";
import { UiModeProvider } from "../data/uiMode";

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={["/wingman"]}>
      <UiModeProvider>
        <DashboardPage />
      </UiModeProvider>
    </MemoryRouter>,
  );

  return within(screen.getByLabelText("Recent projects"));
}

describe("DashboardPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the initial demo projects for a new project store", () => {
    const recentProjects = renderDashboard();

    expect(recentProjects.getByText("Northbridge Meeting Room Refresh")).not.toBeNull();
    expect(recentProjects.getByText("Harbour Retail Signage Rollout")).not.toBeNull();
    expect(recentProjects.getByText("Westbrook Classroom Standard")).not.toBeNull();
  });

  it("keeps all deleted examples absent when Home reloads", () => {
    const names = readProjectStore().projects.map((project) => project.name);
    renderDashboard();
    for (const name of names) {
      fireEvent.click(screen.getByRole("button", { name: `Project actions for ${name}` }));
      fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
      fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    }
    expect(readProjectStore().projects).toHaveLength(0);
    expect(screen.queryByText("Northbridge Meeting Room Refresh")).toBeNull();
    expect(screen.queryByText("Harbour Retail Signage Rollout")).toBeNull();
    expect(screen.queryByText("Westbrook Classroom Standard")).toBeNull();
  });

  it("shows an empty dashboard for a persisted empty project store", () => {
    for (const project of readProjectStore().projects) deleteStoredProject(project.id);
    const recentProjects = renderDashboard();
    expect(recentProjects.queryByText("Northbridge Meeting Room Refresh")).toBeNull();
    expect(recentProjects.getByText("No projects yet. Create a new project to get started.")).not.toBeNull();
    expect(within(screen.getByLabelText("Dashboard focus panel")).queryByText("Continue discovery")).toBeNull();
  });

  it("keeps governance administration off the Home landing page", () => {
    renderDashboard();

    expect(screen.queryByLabelText("Profiles awaiting human confirmation")).toBeNull();
    expect(screen.queryByLabelText("Human-verified profiles")).toBeNull();
    expect(screen.queryByLabelText("Approved competitor decisions")).toBeNull();
  });

  it("links each primary action to its Wingman route", () => {
    renderDashboard();

    expect(screen.getByRole("link", { name: /New Opportunity/ }).getAttribute("href")).toBe(
      routeCatalogByKey.discovery.path,
    );
    expect(screen.getByRole("link", { name: /Compare Products/ }).getAttribute("href")).toBe(
      routeCatalogByKey.compare.path,
    );
    expect(screen.getByRole("link", { name: /Build Response/ }).getAttribute("href")).toBe(
      routeCatalogByKey.responsePack.path,
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

  it("flags a project whose last survey review cleared rows", () => {
    const reviewedAt = "2026-10-20T14:12:00.000Z";
    upsertStoredProject({
      id: "harbour-survey-review",
      name: "Harbour Survey Review",
      owner: "Steve",
      stage: "Proposal Builder",
      status: "recommended",
      updated: "Just now",
      resumeTo: routeCatalogByKey.projects.path,
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
      videowall: {
        savedAt: reviewedAt,
        wallType: "lcd",
        summary: {
          version: 2,
          requirements: {
            surveyReview: {
              reviewedAt,
              photoCount: 1,
              confidence: 0.8,
              rows: [
                { id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" },
                { id: "display-2", label: "Panel 2", metres: 9, confidence: 0.4, decision: "rejected" },
              ],
            },
          },
        },
      },
    });

    const recentProjects = renderDashboard();

    // The card names the follow-up and offers the way in: the flag is a link to
    // the review panel, not just a label beside it.
    const chip = recentProjects.getByText("1 survey row cleared");
    expect(chip.closest(".wm-status-chip")?.getAttribute("title")).toContain("Requirements section");
    const flag = recentProjects.getByTestId("survey-review-flag");
    expect(flag.tagName).toBe("A");
    expect(flag.getAttribute("data-survey-review")).toBe("cleared");
    // The address names the row the chip counted, not only the table it is in.
    expect(flag.getAttribute("href")).toBe(
      "/wingman/projects/harbour-survey-review?view=confirm#wall-survey-review-row-display-2",
    );
    expect(flag.getAttribute("data-survey-review-row")).toBe("display-2");
  });

  it("says a review that kept every row happened, without the cleared warning", () => {
    const reviewedAt = "2026-10-20T14:12:00.000Z";
    upsertStoredProject({
      id: "harbour-survey-accepted",
      name: "Harbour Survey Accepted",
      owner: "Steve",
      stage: "Proposal Builder",
      status: "recommended",
      updated: "Just now",
      resumeTo: routeCatalogByKey.projects.path,
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
      videowall: {
        savedAt: reviewedAt,
        wallType: "lcd",
        summary: {
          version: 2,
          requirements: {
            surveyReview: {
              reviewedAt,
              photoCount: 1,
              confidence: 0.8,
              rows: [{ id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" }],
            },
          },
        },
      },
    });

    const recentProjects = renderDashboard();

    // Without this the card would read like a room nobody has surveyed yet, so
    // the clean review is stated — just quietly, and without inventing a count.
    const flag = recentProjects.getByTestId("survey-review-flag");
    expect(flag.textContent).toContain("Survey reviewed");
    expect(flag.getAttribute("data-survey-review")).toBe("reviewed");
    expect(flag.className).toContain("wm-status-neutral");
    expect(flag.className).not.toContain("wm-status-warning");
    expect(flag.getAttribute("href")).toBe("/wingman/projects/harbour-survey-accepted?view=confirm#wall-survey-review");
    expect(recentProjects.queryByText(/survey rows? cleared/)).toBeNull();
  });

  it("flags the same survey follow-up in the focused dashboard", () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "guided");
    const reviewedAt = "2026-10-20T14:12:00.000Z";
    upsertStoredProject({
      id: "focused-survey-review",
      name: "Focused Survey Review",
      owner: "Steve",
      stage: "Proposal Builder",
      status: "recommended",
      updated: "Just now",
      resumeTo: routeCatalogByKey.projects.path,
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
      videowall: {
        savedAt: reviewedAt,
        wallType: "lcd",
        summary: {
          version: 2,
          requirements: {
            surveyReview: {
              reviewedAt,
              photoCount: 1,
              confidence: 0.8,
              rows: [
                { id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "rejected" },
              ],
            },
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/wingman"]}>
        <UiModeProvider>
          <DashboardPage />
        </UiModeProvider>
      </MemoryRouter>,
    );

    const recent = within(screen.getByLabelText("Continue where you left off"));
    const chip = recent.getByText("1 survey row cleared");
    expect(chip.closest(".wm-status-chip")?.getAttribute("title")).toContain("Requirements section");
    // The focused card is not a link itself, so the flag links on its own rather
    // than sitting inside the card's destination.
    const flag = recent.getByTestId("survey-review-flag");
    expect(flag.getAttribute("href")).toBe(
      "/wingman/projects/focused-survey-review?view=confirm#wall-survey-review-row-display-1",
    );
    expect(flag.closest("a")).toBe(flag);
  });

  it("shows the quiet reviewed state on the focused card too", () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "guided");
    const reviewedAt = "2026-10-20T14:12:00.000Z";
    upsertStoredProject({
      id: "focused-survey-clean",
      name: "Focused Clean Survey",
      owner: "Steve",
      stage: "Proposal Builder",
      status: "recommended",
      updated: "Just now",
      resumeTo: routeCatalogByKey.projects.path,
      createdAt: reviewedAt,
      updatedAt: reviewedAt,
      videowall: {
        savedAt: reviewedAt,
        wallType: "lcd",
        summary: {
          version: 2,
          requirements: {
            surveyReview: {
              reviewedAt,
              photoCount: 1,
              confidence: 0.8,
              rows: [
                { id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" },
              ],
            },
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={["/wingman"]}>
        <UiModeProvider>
          <DashboardPage />
        </UiModeProvider>
      </MemoryRouter>,
    );

    // The focused reading is where most reps live, so a clean review cannot be
    // visible only on the expert dashboard's card.
    const recent = within(screen.getByLabelText("Continue where you left off"));
    const flag = recent.getByTestId("survey-review-flag");
    expect(flag.textContent).toContain("Survey reviewed");
    expect(flag.getAttribute("data-survey-review")).toBe("reviewed");
    expect(flag.className).not.toContain("wm-status-warning");
    // Same landing as the cleared flag: the rows the review decided are one
    // click away, not just a label on the card.
    expect(flag.getAttribute("href")).toBe("/wingman/projects/focused-survey-clean?view=confirm#wall-survey-review");
    expect(flag.closest("a")).toBe(flag);
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

describe("dashboard survey re-confirm", () => {
  const DAY_MS = 86_400_000;
  const staleAt = () => new Date(Date.now() - 200 * DAY_MS).toISOString();
  const SAVED_AT = "2026-01-15T09:00:00.000Z";

  function wall(reviewedAt: string) {
    return {
      savedAt: SAVED_AT,
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt,
            photoCount: 1,
            confidence: 0.8,
            rows: [
              { id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" },
              { id: "display-2", label: "Panel 2", metres: 4, confidence: 0.9, decision: "accepted" },
            ],
          },
        },
      },
    };
  }

  function project(id: string, name: string, videowall: ReturnType<typeof wall>) {
    return {
      id,
      name,
      owner: "Steve",
      stage: "Proposal Builder" as const,
      status: "recommended" as const,
      updated: "Just now",
      resumeTo: routeCatalogByKey.projects.path,
      createdAt: SAVED_AT,
      updatedAt: SAVED_AT,
      videowall,
    };
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("wingman-ui-mode-v1", "unguided");
  });

  it("renews a stale clean reading from the card, and the chip reads as current again", () => {
    const reviewedAt = staleAt();
    upsertStoredProject(project("acme-survey", "Acme Survey Refresh", wall(reviewedAt)));

    const recentProjects = renderDashboard();
    const card = recentProjects.getByText("Acme Survey Refresh").closest("article")!;
    const chip = within(card).getByTestId("survey-review-flag");
    expect(chip.getAttribute("data-survey-review-age")).toBe("stale");
    expect(chip.textContent).toContain("re-confirm");

    fireEvent.click(within(card).getByRole("button", { name: "Re-confirm the survey for Acme Survey Refresh" }));

    // The same card, re-read from the store: the doubt is settled in one tap and
    // the action that raised it is gone, without the wall builder being opened.
    const renewed = within(
      within(screen.getByLabelText("Recent projects")).getByText("Acme Survey Refresh").closest("article")!,
    );
    const renewedChip = renewed.getByTestId("survey-review-flag");
    expect(renewedChip.getAttribute("data-survey-review-age")).toBe("fresh");
    expect(renewedChip.textContent).toContain("today");
    expect(renewedChip.textContent).not.toContain("re-confirm");
    expect(renewed.queryByRole("button", { name: /Re-confirm/ })).toBeNull();

    // Only the date moved: the rows the review kept and the wall's own save time
    // stay as they were, and the trail records the check rather than a re-save.
    const saved = readProjectStore().projects.find((entry) => entry.id === "acme-survey")!;
    const requirements = (saved.videowall!.summary as { requirements: Record<string, any> }).requirements;
    expect(requirements.surveyReview.reviewedAt).not.toBe(reviewedAt);
    expect(requirements.surveyReview.rows).toHaveLength(2);
    expect(saved.videowall!.savedAt).toBe(SAVED_AT);
    expect(saved.auditTrail?.[0]).toMatchObject({ action: "wall-survey-reconfirm", scope: "videowall" });
  });

  it("offers the same tap on the focused dashboard's card, beside its chip", () => {
    window.localStorage.setItem("wingman-ui-mode-v1", "guided");
    upsertStoredProject(project("focused-survey-stale", "Focused Stale Survey", wall(staleAt())));

    render(
      <MemoryRouter initialEntries={["/wingman"]}>
        <UiModeProvider>
          <DashboardPage />
        </UiModeProvider>
      </MemoryRouter>,
    );

    const recent = within(screen.getByLabelText("Continue where you left off"));
    const action = recent.getByRole("button", { name: "Re-confirm the survey for Focused Stale Survey" });

    // The chip is a link, so the tap sits beside it rather than inside it — and
    // outside the card's own hit area, which would otherwise open the project.
    expect(action.closest("a")).toBeNull();
    expect(recent.getByTestId("survey-review-flag").getAttribute("data-survey-review-age")).toBe("stale");
  });
});
