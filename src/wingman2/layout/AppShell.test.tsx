import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { writeProjectStore, type StoredProject } from "../features/projects";
import { AppShell } from "./AppShell";

const REVIEWED_AT = "2026-09-01T09:00:00.000Z";
/** Old enough to be stale on any run of this test, not only today. */
const OLD_REVIEWED_AT = "2025-01-01T09:00:00.000Z";

function project(id: string, overrides: Partial<StoredProject> = {}): StoredProject {
  return {
    id,
    name: `Room ${id}`,
    owner: "Sales",
    stage: "Discovery",
    status: "recommended",
    updated: "Today",
    updatedAt: "2026-09-01T09:00:00.000Z",
    createdAt: "2026-09-01T09:00:00.000Z",
    resumeTo: "/wingman/discovery",
    compareRuns: [],
    ...overrides,
  };
}

function surveyed(id: string, decision: "accepted" | "rejected", reviewedAt = REVIEWED_AT): StoredProject {
  return project(id, {
    videowall: {
      savedAt: reviewedAt,
      wallType: "projection",
      summary: {
        requirements: {
          surveyReview: {
            reviewedAt,
            photoCount: 1,
            confidence: 0.9,
            rows: [{ id: "source-1", label: "Source 1", metres: 4, confidence: 0.9, decision }],
          },
        },
      },
    } as StoredProject["videowall"],
  });
}

function store(projects: StoredProject[]) {
  writeProjectStore({ projects, proposalDrafts: [], activeProjectId: null }, { syncBackend: false });
}

/**
 * The count arrives from an on-demand import, so the shell paints first and the
 * badge follows. Awaiting that same module here settles the effect before the
 * assertions run, whether the answer is a count or none at all.
 */
async function settleSurveyCount() {
  await act(async () => {
    await import("../lib/wallSurveyReview");
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderShell() {
  const view = render(
    <MemoryRouter initialEntries={["/wingman/dashboard"]}>
      <AppShell>
        <div>page</div>
      </AppShell>
    </MemoryRouter>,
  );
  await settleSurveyCount();
  return view;
}

const projectsLink = () => screen.getByRole("link", { name: /^Projects:/ });

beforeEach(() => {
  window.localStorage.clear();
  store([]);
});

describe("AppShell survey attention", () => {
  it("counts the surveys that still ask for a rep on the Projects entry", async () => {
    store([
      surveyed("cleared", "rejected"),
      surveyed("stale", "accepted", OLD_REVIEWED_AT),
      surveyed("current", "accepted"),
      project("no-survey"),
    ]);
    const { container } = await renderShell();

    // Two projects need a rep: one row was cleared, one review is old. A clean
    // recent review and a wall nobody surveyed are not work.
    expect(container.querySelector(".wingman-nav-attention")?.textContent).toBe("2");
    expect(projectsLink().getAttribute("aria-label")).toContain("2 surveys need attention");
  });

  it("says one survey in the singular", async () => {
    store([surveyed("cleared", "rejected")]);
    const { container } = await renderShell();

    expect(container.querySelector(".wingman-nav-attention")?.textContent).toBe("1");
    expect(projectsLink().getAttribute("aria-label")).toContain("1 survey needs attention");
  });

  it("shows no count when every survey is settled", async () => {
    store([surveyed("current", "accepted"), project("no-survey")]);
    const { container } = await renderShell();

    expect(container.querySelector(".wingman-nav-attention")).toBeNull();
    expect(projectsLink().getAttribute("aria-label")).not.toContain("attention");
  });

  it("counts only once the projects are read, so a settled wall is not a badge", async () => {
    // A cleared row added after the shell mounted moves the count, which is how
    // the badge follows a saved wall without the navigation fetching its own copy.
    store([surveyed("current", "accepted")]);
    const { container } = await renderShell();
    expect(container.querySelector(".wingman-nav-attention")).toBeNull();

    act(() => store([surveyed("cleared", "rejected"), surveyed("current", "accepted")]));
    await settleSurveyCount();
    expect(container.querySelector(".wingman-nav-attention")?.textContent).toBe("1");
  });
});
