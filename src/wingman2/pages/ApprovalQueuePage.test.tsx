import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredProject, StoredProjectProposal } from "../data/projectStore";
import { readProjectStore, resetProjectStore, writeProjectStore } from "../data/projectStore";
import { ApprovalQueuePage } from "./ApprovalQueuePage";

const postWingmanJson = vi.fn();

vi.mock("../api/wingmanApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/wingmanApi")>()),
  postWingmanJson: (...args: unknown[]) => postWingmanJson(...args),
}));

function pendingProposal(id: string, title: string): StoredProjectProposal {
  return {
    title,
    summary: "Route four operator feeds to the wall.",
    sections: [],
    products: [],
    assumptions: [],
    updatedAt: "2026-10-20T09:00:00.000Z",
    approvalStatus: "pending",
    submittedBy: "Dana Rep",
    submittedAt: "2026-10-21T09:00:00.000Z",
    // The queue only offers a decision on a submitted revision, so the fixture
    // carries the hash the request has to quote back. The codec drops a revision
    // without a schema version, which is why this is a versioned payload.
    designRevision: {
      schemaVersion: 1,
      revisionId: `revision-${id}`,
      contentHash: `hash-${id}`,
      projectId: id,
      projectName: title,
      compiledAt: "2026-10-21T08:00:00.000Z",
      customerRequirement: "Four feeds to the wall.",
      interpretedRequirement: "Route four operator feeds.",
      architecture: "NetworkHD",
      requirements: [],
      roleCoverage: [],
      productOverviews: [],
      assumptions: [],
      blockers: [],
      warnings: [],
      canIssue: true,
    } satisfies StoredProjectProposal["designRevision"],
  };
}

function project(id: string, name: string): StoredProject {
  return {
    id,
    name,
    owner: "Sales",
    stage: "Proposal Builder",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-10-20T09:00:00.000Z",
    createdAt: "2026-10-18T09:00:00.000Z",
    resumeTo: "/wingman/proposal",
    compareRuns: [],
    proposal: pendingProposal(id, `${name} proposal`),
  };
}

const SEEDED = [project("project-alpha", "Alpha Room"), project("project-bravo", "Bravo Room"), project("project-charlie", "Charlie Room")];

/** The store as the rep left it: Bravo open, and the gallery in seed order. */
function seedStore() {
  writeProjectStore({ projects: SEEDED, proposalDrafts: [], activeProjectId: "project-bravo" }, { syncBackend: false });
}

function renderQueue() {
  return render(
    <MemoryRouter initialEntries={["/wingman/approval-queue"]}>
      <ApprovalQueuePage />
    </MemoryRouter>,
  );
}

/** The decided project the API would hand back once the decision is stored. */
function decided(projectId: string, decision: "approved" | "rejected", comment?: string) {
  const seeded = SEEDED.find((candidate) => candidate.id === projectId)!;
  return {
    ...seeded,
    proposal: {
      ...seeded.proposal!,
      approvalStatus: decision,
      approvedBy: "reviewer@wingman.local",
      approvedAt: "2026-10-22T11:00:00.000Z",
      approvalComments: comment,
    },
  };
}

describe("approval queue decisions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetProjectStore();
    postWingmanJson.mockReset();
    seedStore();
  });

  it("approves without opening that project or moving it in the gallery", async () => {
    postWingmanJson.mockResolvedValue({ ok: true, project: decided("project-charlie", "approved") });

    renderQueue();
    const card = screen.getByText("Charlie Room proposal").closest(".wm-approval-card")!;
    fireEvent.click(within(card as HTMLElement).getByRole("button", { name: "Approve" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(readProjectStore().projects.find((p) => p.id === "project-charlie")?.proposal?.approvalStatus).toBe("approved");
    });

    // Deciding a proposal is not opening the project: whatever the rep had open
    // stays open, so the next screen is the one they chose.
    expect(readProjectStore().activeProjectId).toBe("project-bravo");
    // The gallery renders the store in this order, so a decision must not
    // promote the row to the front the way a save from the project does.
    expect(readProjectStore().projects.map((p) => p.id)).toEqual(["project-alpha", "project-bravo", "project-charlie"]);
    // The pending queue drops the decided proposal, which is the visible half of
    // the act; the title returns under Recent decisions, where it belongs.
    const stillPending = screen.getByRole("region", { name: "Pending proposals" });
    expect(within(stillPending).queryByText("Charlie Room proposal")).toBeNull();
    expect(screen.getByText("Charlie Room proposal").closest(".wm-approval-history")).not.toBeNull();
  });

  it("rejects with a comment without opening that project or moving it in the gallery", async () => {
    postWingmanJson.mockResolvedValue({ ok: true, project: decided("project-alpha", "rejected", "Swap the decoder.") });

    renderQueue();
    const card = screen.getByText("Alpha Room proposal").closest(".wm-approval-card")!;
    fireEvent.click(within(card as HTMLElement).getByRole("button", { name: "Request changes" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Swap the decoder." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Request changes" }));

    await waitFor(() => {
      expect(readProjectStore().projects.find((p) => p.id === "project-alpha")?.proposal?.approvalStatus).toBe("rejected");
    });

    expect(readProjectStore().projects.find((p) => p.id === "project-alpha")?.proposal?.approvalComments).toBe("Swap the decoder.");
    expect(readProjectStore().activeProjectId).toBe("project-bravo");
    expect(readProjectStore().projects.map((p) => p.id)).toEqual(["project-alpha", "project-bravo", "project-charlie"]);
  });
});
