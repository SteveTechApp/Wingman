import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { readProjectStore, upsertStoredProject } from "../data/projectStore";
import { routeCatalogByKey } from "../app/routeCatalog";
import { DashboardPage } from "./DashboardPage";

const { getWingmanSession } = vi.hoisted(() => ({
  getWingmanSession: vi.fn(),
}));

vi.mock("../api/wingmanApi", async () => {
  const actual = await vi.importActual<typeof import("../api/wingmanApi")>(
    "../api/wingmanApi",
  );
  return {
    ...actual,
    getWingmanSession,
  };
});

function adminSessionResponse() {
  return {
    ok: true,
    session: {
      workspaceRole: "admin",
      permissions: { canManageWorkspace: true },
      user: {
        id: "test-admin",
        name: "Steve",
        role: "admin",
      },
    },
  };
}

function normalUserSessionResponse() {
  return {
    ok: true,
    session: {
      workspaceRole: "member",
      permissions: { canManageWorkspace: false },
      user: {
        id: "test-user",
        name: "Normal User",
        role: "member",
      },
    },
  };
}

function renderDashboard() {
  render(
    <MemoryRouter initialEntries={["/wingman"]}>
      <DashboardPage />
    </MemoryRouter>,
  );

  return within(screen.getByLabelText("Recent projects"));
}

function renderAdminDashboard() {
  getWingmanSession.mockResolvedValue(adminSessionResponse());
  return renderDashboard();
}

describe("DashboardPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    getWingmanSession.mockReset();
    getWingmanSession.mockResolvedValue(normalUserSessionResponse());
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

  it("renders the profiles-awaiting-human-confirmation card with its backlog for admins", async () => {
    renderAdminDashboard();

    const card = await screen.findByLabelText("Profiles awaiting human confirmation");
    expect(card.textContent).toContain("Profiles awaiting human confirmation");
    // The 2026-08-16 review passes confirmed 117 of the 134 governed profiles;
    // the 17 that remain all need data work first (the ready set was exhausted).
    expect(card.textContent).toContain("17 awaiting");
    expect(card.textContent).toContain("117/134 human-confirmed");
    expect(card.textContent).toContain("0 ready to confirm");
    // A real profile row with its spec-critical field state (the card lists
    // the first eight awaiting profiles alphabetically).
    expect(card.textContent).toContain("APO-DG-DOCK");
    expect(card.textContent).toContain("Power - missing data");
    expect(card.textContent).toMatch(/and [0-9]+ more awaiting confirmation/);
  });

  it("renders the human-verified reviewer trail recent-first with who, when and the source URL for admins", async () => {
    renderAdminDashboard();

    const card = await screen.findByLabelText("Human-verified profiles");
    expect(card.textContent).toContain("Human-verified profiles");
    expect(card.textContent).toContain("117 verified");
    // Recent-first is the default: the 97-profile batch's final write (the
    // last SKU in the batch list) is the first row, with its reviewer trail
    // and official source link.
    expect(card.textContent).toContain("TX-35-IWC-KVM");
    expect(card.textContent).toContain("confirmed by Steve · 2026-08-16");
    const evidenceLink = within(card).getByRole("link", { name: /wyrestorm\.com\/product\/tx-35-iwc-kvm/ });
    expect(evidenceLink.getAttribute("href")).toBe("https://www.wyrestorm.com/product/tx-35-iwc-kvm/");
    expect(evidenceLink.getAttribute("target")).toBe("_blank");
    expect(card.textContent).toMatch(/and 109 more verified profiles/);
  });

  it("sorts the human-verified list SKU A-Z or recent-first on demand for admins", async () => {
    renderAdminDashboard();

    const card = await screen.findByLabelText("Human-verified profiles");
    const sort = within(card).getByLabelText("Sort verified profiles");
    const firstRow = () => within(card).getAllByRole("listitem")[0].textContent ?? "";

    // Default is recent-first: TX-35-IWC-KVM carries the batch's final write.
    expect(firstRow()).toContain("TX-35-IWC-KVM");

    fireEvent.change(sort, { target: { value: "sku" } });
    expect(firstRow()).toContain("AMP-2120"); // alphabetically first verified SKU
    expect(card.textContent).toContain("APO-210-UC"); // inside the A-Z visible slice

    fireEvent.change(sort, { target: { value: "recent" } });
    expect(firstRow()).toContain("TX-35-IWC-KVM");
  });

  it("filters the human-verified list by reviewer for admins", async () => {
    renderAdminDashboard();

    const card = await screen.findByLabelText("Human-verified profiles");
    const filter = within(card).getByLabelText("Filter by reviewer");
    const options = Array.from(filter.querySelectorAll("option")).map((option) => option.textContent);
    // The review pass recorded a single reviewer of record so far; the control
    // is built from the data so future reviewers appear automatically.
    expect(options).toContain("All reviewers");
    expect(options).toContain("Steve");

    fireEvent.change(filter, { target: { value: "Steve" } });
    expect(within(card).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(card.textContent).toMatch(/and 109 more verified profiles/);

    fireEvent.change(filter, { target: { value: "all" } });
    expect(card.textContent).toMatch(/and 109 more verified profiles/);
  });

  it("marks profiles with missing spec-critical data as not yet confirmable for admins", async () => {
    renderAdminDashboard();

    const card = await screen.findByLabelText("Profiles awaiting human confirmation");
    const dockRow = within(card).getByText("APO-DG-DOCK").closest("li");
    expect(dockRow).not.toBeNull();
    const button = within(dockRow as HTMLElement).getByRole("button", { name: "Add data first" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps governance reviewer panels off the normal-user landing page", async () => {
    renderDashboard();

    await vi.waitFor(() => {
      expect(getWingmanSession).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByLabelText("Approved competitor decisions")).toBeNull();
    expect(screen.queryByLabelText("Profiles awaiting human confirmation")).toBeNull();
    expect(screen.queryByLabelText("Human-verified profiles")).toBeNull();
  });

  // The confirmation panel and API-write flow are covered in
  // DashboardPage.confirmationFlow.test.tsx, which mocks APO-210-UC back to a
  // ready-to-confirm profile: the real data now has 117 verified and zero
  // ready-to-confirm, so that flow needs a controlled ready profile to run.

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
