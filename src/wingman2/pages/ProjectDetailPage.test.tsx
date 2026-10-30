import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { projectAnchors, projectDetailSections, projectSectionHref } from "../lib/projectAnchors";
import { WALL_ENTRY_SENTENCE_NAME } from "../lib/wallEntry";
import { VIDEO_WALL_DRAFT_KEY } from "../lib/videowallDraft";
import { CRM_WEBHOOK_DROPS_KEY } from "../lib/crmWebhook";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteProject, updateStoredProject, storedProject } = vi.hoisted(() => ({
  deleteProject: vi.fn(),
  updateStoredProject: vi.fn(),
  storedProject: {
    id: "project-1",
    name: "Meeting Room Refresh",
    owner: "Northbridge",
    stage: "Discovery",
    status: "alternative",
    updated: "Today",
    updatedAt: "2026-08-04T09:00:00.000Z",
    resumeTo: "/wingman/discovery",
    syncConflict: undefined as { fields: string[]; detectedAt: string } | undefined,
    videowall: undefined as
      | { savedAt: string; wallType: string; summary: { version: number; requirements: Record<string, unknown> } }
      | undefined,
    auditTrail: [] as Array<{
      id: string;
      action: string;
      detail: string;
      scope: string;
      severity: "info";
      actorName: string;
      createdAt: string;
    }>,
    requirements: [] as Array<Record<string, unknown>>,
    productSelections: [],
    proposal: undefined as Record<string, unknown> | undefined,
    discoveryBrief: undefined as { savedAt: string; roomModel: Record<string, unknown> } | undefined,
    compareRuns: [] as Array<{ id: string; createdAt: string; version?: number; competitorBrand?: string; competitorSku?: string; wyrestormSku?: string; summary?: string; evidence?: string[]; warnings?: string[] }>,
    recommendationEvidence: {
      productDirection: "Presentation / UC",
      systemShape: "Meeting room presentation system",
      quoteSafetyStatus: "do-not-quote",
      quoteSafetyMessage: "Confirm the USB path.",
      nextBestQuestion: "Who owns the USB host?",
      missingInformation: ["USB host ownership"],
      productFamilyScores: [],
      evidenceUsed: [],
      requiredDependencies: [],
    },
  },
}));

vi.mock("../features/projects", () => ({
  setActiveProjectId: vi.fn(),
  saveProjectRequirementsToProject: vi.fn(),
  updateStoredProject: (...args: unknown[]) => updateStoredProject(...args),
  projectLaneLabel: (lane: string) => (lane === "proposal" ? "Proposal" : lane === "requirements" ? "Requirements" : lane),
  useProjectStore: () => ({
    projects: [storedProject],
    syncStatus: { state: "local", message: "Saved in this browser." },
    deleteProject,
  }),
}));

import { ProjectDetailPage } from "./ProjectDetailPage";
import { ProjectRequirementList } from "./project/ProjectRequirementList";
import { deleteCustomRoomTemplate, getCustomRoomTemplates } from "../lib/customRoomTemplates";

/** The address the page is on, so a test can see what the reader is offered. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

/**
 * The room model a surveyed HDBaseT room saves. The wall panels are seeded the
 * same way as they are read: a panel with nothing to show is a panel the page
 * does not render, so a test that walks the anchor registry has to give the
 * record the fact its panel reads.
 */
function seedDisplayRun() {
  storedProject.discoveryBrief = {
    savedAt: "2026-10-26T09:00:00.000Z",
    roomModel: { cableRun: "28 m", longestRun: "28 m" },
  };
}

/**
 * The saved response a room leaves behind while a dependency question is open:
 * the prompt in the document's dependency list, and the placeholder row it
 * leaves in the quotation. The dependency panel reads both, so a test walking
 * the anchor registry has to give the response one.
 */
function seedDependencyPrompts() {
  storedProject.proposal = {
    title: "Meeting Room Refresh",
    summary: "Present and join calls",
    sections: [],
    products: [],
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
        trigger: "Distance or extender language detected.",
        evidence: "Longest run basis: 28 m.",
        validationQuestion: "Which transmitter and receiver are paired?",
        customerSafeNote: "TX/RX compatibility must be confirmed.",
      },
    ],
    bomRows: [
      { item: 1, sku: "TBC-HDBASET-PAIR", description: "TX/RX pairing", role: "Signal extension pair", qty: 1, type: "Validate", status: "validate", evidence: "Longest run basis: 28 m.", notes: "" },
    ],
  };
}

function renderPage(query = "") {
  return render(
    <MemoryRouter initialEntries={[`/wingman/projects/project-1${query}`]}>
      <Routes>
        <Route path="/wingman/projects/:projectId" element={<><ProjectDetailPage /><LocationProbe /></>} />
        <Route path="/wingman/discovery" element={<div>Standard Discovery</div>} />
        <Route path="/wingman/videowall" element={<LocationProbe />} />
        <Route path="/wingman/projects" element={<div>Projects list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Project Detail review controls", () => {
  beforeEach(() => {
    deleteProject.mockClear();
    updateStoredProject.mockClear();
    delete storedProject.syncConflict;
    storedProject.videowall = undefined;
    storedProject.discoveryBrief = undefined;
    storedProject.proposal = undefined;
    storedProject.compareRuns = [];
    storedProject.auditTrail = [];
    storedProject.requirements = [];
    // A test that seeds this browser's wall draft or the boot sweep's dropped
    // sends cleans it up here, so one case's note cannot leak into the next.
    window.localStorage.removeItem(VIDEO_WALL_DRAFT_KEY);
    window.localStorage.removeItem(CRM_WEBHOOK_DROPS_KEY);
  });

  it("opens the detail editor from the landing page edit action", () => {
    renderPage("?view=confirm&edit=true");
    expect(screen.getByLabelText("Project name")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Requirements" }).getAttribute("aria-current")).toBe("page");
  });

  it("warns with the changed lanes when a team member edited the project since our last sync", () => {
    storedProject.syncConflict = { fields: ["proposal", "requirements"], detectedAt: "2026-08-04T10:00:00.000Z" };
    renderPage();

    const banner = screen.getByRole("region", { name: "Team member changes" });
    expect(banner.textContent).toContain("A team member changed Proposal, Requirements since your last sync.");
    expect(banner.textContent).toContain("Reload the page");
  });

  it("says the walk is unpositioned when Discovery's lead-in never recorded a market", () => {
    renderPage();

    const note = screen.getByTestId("project-positioning");
    expect(note.getAttribute("data-project-positioning-missing")).toBe("market,environment");
    expect(note.textContent).toContain("No market or environment recorded.");
    expect(note.textContent).toContain("Market: not recorded · Environment: not recorded");

    // Discovery's lead-in is the screen a rep lands on while the space is still
    // missing, so the note opens the walk on this room rather than naming a
    // question that cannot record either label.
    const link = within(note).getByRole("link", { name: "Set market and environment in Discovery" });
    expect(link.getAttribute("href")).toContain("/wingman/discovery?");
    expect(link.getAttribute("href")).toContain("projectId=project-1");
  });

  it("names the half of the lead-in the room does have", () => {
    storedProject.discoveryBrief = {
      savedAt: "2026-10-26T09:00:00.000Z",
      roomModel: { market: "Corporate" },
    };
    renderPage();

    // A template preset names the market and leaves the space, so the note has to
    // say which half is saved: "no environment" alone sends a rep back into the
    // brief to find out what the market was. The line says it in the same two
    // slots the positioned record uses.
    const note = screen.getByTestId("project-positioning");
    expect(note.textContent).toContain("No environment recorded.");
    expect(note.textContent).toContain("Market: Corporate · Environment: not recorded");
    expect(within(note).getByRole("link", { name: "Set the environment in Discovery" })).toBeTruthy();
  });

  it("reads where the room sits once the lead-in has recorded both", () => {
    storedProject.discoveryBrief = {
      savedAt: "2026-10-26T09:00:00.000Z",
      roomModel: { market: "Corporate", environment: "Meeting room" },
    };
    renderPage();

    // Where the room sits is a record-level fact, so a positioned room prints the
    // same line the note prints — and the note itself, with its alarm and its link
    // back into Discovery, is what a missing half adds to that line.
    const line = screen.getByTestId("project-positioning");
    expect(line.getAttribute("data-project-positioning-missing")).toBe("");
    expect(line.textContent).toBe("Market: Corporate · Environment: Meeting room");
    expect(screen.queryByRole("region", { name: "Market and environment" })).toBeNull();
  });

  it("routes project editing into standard Discovery", () => {
    renderPage();
    fireEvent.click(screen.getByText("Project actions"));
    fireEvent.click(screen.getByRole("button", { name: "Edit project" }));
    expect(screen.getByText("Standard Discovery")).toBeTruthy();
  });

  it("switches from the short overview into focused review stages", () => {
    renderPage();

    expect(screen.queryByText("Requirements")).not.toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Requirements" }));
    expect(screen.getAllByText("Reopen the saved Discovery answers to review customer requirements.").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Requirements" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("link", { name: "Handoff" }));
    expect(screen.getAllByText("Move from a validated project record to a customer response, visual, or CRM handoff.").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open response" }).getAttribute("href")).toBe("/wingman/responses?projectId=project-1");
    expect(screen.getByText("Share to CRM")).not.toBeNull();
  });

  it("lists the saved requirement rows with their statuses, read-only", () => {
    const savedAt = "2026-10-26T09:00:00.000Z";
    storedProject.requirements = [
      {
        id: "room-size", label: "Room or venue size", value: "12 m × 8 m",
        category: "Application", source: "Discovery", status: "confirmed",
        whyItMatters: "Room scale influences transport and complexity.", updatedAt: savedAt,
      },
      {
        id: "source-count", label: "Source count", value: "4 laptops",
        category: "Sources", source: "Discovery", status: "review",
        whyItMatters: "Source count drives the switcher and encoder count.", updatedAt: savedAt,
      },
      {
        id: "usb-transport", label: "USB / conferencing transport", value: "Unknown",
        category: "USB", source: "Discovery", status: "unknown",
        whyItMatters: "USB direction changes the correct product family.", updatedAt: savedAt,
      },
    ];

    renderPage("?view=confirm");

    const list = screen.getByTestId("project-requirement-list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.getAttribute("data-requirement-status")))
      .toEqual(["confirmed", "review", "unknown"]);

    // The answer is what the saved question recorded, and the chip says whether
    // a response can rely on it.
    expect(rows[0].textContent).toContain("Room or venue size");
    expect(rows[0].textContent).toContain("12 m × 8 m");
    expect(within(rows[0]).getByText("Confirmed")).toBeTruthy();
    expect(within(rows[1]).getByText("Needs review")).toBeTruthy();
    expect(within(rows[2]).getByText("Not confirmed")).toBeTruthy();
    expect(screen.getByTestId("project-requirement-summary").textContent)
      .toBe("3 requirements: 1 confirmed · 1 needs review · 1 not confirmed.");

    // Read-only: the panel names the route that can change an answer instead of
    // offering an editor the questions do not know about. The one thing to act on
    // in the list is a row's link to the question that records it.
    expect(within(list).queryByRole("textbox")).toBeNull();
    expect(within(list).queryByRole("combobox")).toBeNull();
    expect(within(list).queryByRole("button")).toBeNull();
    expect(within(rows[0]).queryByRole("link")).toBeNull();
    const questionLinks = within(list).getAllByRole("link");
    expect(questionLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/wingman/discovery?edit=sources&projectId=project-1",
      "/wingman/discovery?edit=usb&projectId=project-1",
    ]);
    expect(questionLinks.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Edit Source count in Discovery",
      "Edit USB / conferencing transport in Discovery",
    ]);
    const editLink = screen.getByRole("link", { name: "Edit in Discovery" });
    expect(editLink.getAttribute("href")).toContain("/wingman/discovery?");
    expect(editLink.getAttribute("href")).toContain("projectId=project-1");
  });

  it("links only the unconfirmed rows a Discovery question owns", () => {
    const savedAt = "2026-10-26T09:00:00.000Z";
    const requirement = (
      id: string,
      label: string,
      value: string,
      status: "confirmed" | "review" | "unknown",
    ) => ({ id, label, value, category: "Application", source: "Discovery", status, whyItMatters: `${label} drives the design.`, updatedAt: savedAt });
    storedProject.requirements = [
      requirement("application", "Application / room type", "Boardroom", "confirmed"),
      requirement("architecture", "Inferred architecture", "Networked switching", "review"),
      requirement("source-count", "Source count", "4 laptops", "review"),
      requirement("document-unknown-1", "Document unknown 1", "Ceiling height", "unknown"),
    ];

    renderPage("?view=confirm");

    const list = screen.getByTestId("project-requirement-list");
    const links = within(list).getAllByRole("link");
    // One row a question owns, and it needs a check: the inferred architecture is
    // Wingman's own reading and the imported row came from Document Ingest, so
    // neither has a question to open, and a settled answer has nothing to reopen.
    expect(links.map((link) => link.getAttribute("href")))
      .toEqual(["/wingman/discovery?edit=sources&projectId=project-1"]);
    expect(links[0].getAttribute("aria-label")).toBe("Edit Source count in Discovery");

    const rows = within(list).getAllByRole("listitem");
    expect(within(rows[2]).getByTestId("project-requirement-question-source-count")).toBeTruthy();
    for (const row of [rows[0], rows[1], rows[3]]) {
      expect(within(row).queryByTestId(/^project-requirement-question-/)).toBeNull();
    }
  });

  it("filters the requirement rows to the ones that still need a rep", () => {
    const savedAt = "2026-10-26T09:00:00.000Z";
    const requirement = (
      id: string,
      label: string,
      value: string,
      status: "confirmed" | "review" | "unknown",
    ) => ({ id, label, value, category: "Application", source: "Discovery", status, whyItMatters: `${label} drives the design.`, updatedAt: savedAt });
    storedProject.requirements = [
      requirement("application", "Application / room type", "Boardroom", "confirmed"),
      requirement("room-size", "Room or venue size", "12 m × 8 m", "confirmed"),
      requirement("source-count", "Source count", "4 laptops", "review"),
      requirement("usb-transport", "USB / conferencing transport", "Unknown", "unknown"),
    ];

    renderPage("?view=confirm");

    const filter = screen.getByTestId("project-requirement-filter");
    expect(within(filter).getByRole("button", { name: "All 4" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(filter).getByRole("button", { name: "Needs attention 2" }).getAttribute("aria-pressed")).toBe("false");

    const list = screen.getByTestId("project-requirement-list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);

    fireEvent.click(within(filter).getByRole("button", { name: "Needs attention 2" }));

    // Two settled answers no longer bury the two rows a response cannot rely on.
    const shortfall = within(list).getAllByRole("listitem");
    expect(shortfall.map((row) => row.getAttribute("data-requirement-status"))).toEqual(["review", "unknown"]);
    expect(within(list).getByRole("list", { name: "Saved requirements needing attention" })).toBeTruthy();
    // The summary stays the whole list's count, so the filtered reading says how
    // much of it is on screen rather than leaving two numbers to disagree.
    expect(within(list).getByTestId("project-requirement-summary").textContent)
      .toBe("4 requirements: 2 confirmed · 1 needs review · 1 not confirmed.");
    expect(within(list).getByTestId("project-requirement-filter-note").textContent)
      .toContain("Showing the 2 that still need an answer or a check.");
    expect(within(filter).getByRole("button", { name: "Needs attention 2" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(filter).getByRole("button", { name: "All 4" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).queryByTestId("project-requirement-filter-note")).toBeNull();
  });

  it("offers no filter to a room whose answers are all settled", () => {
    storedProject.requirements = [
      {
        id: "application", label: "Application / room type", value: "Boardroom", category: "Application",
        source: "Discovery", status: "confirmed", whyItMatters: "Application narrows the architecture.",
        updatedAt: "2026-10-26T09:00:00.000Z",
      },
      {
        id: "room-size", label: "Room or venue size", value: "12 m × 8 m", category: "Application",
        source: "Discovery", status: "confirmed", whyItMatters: "Room scale influences transport.",
        updatedAt: "2026-10-26T09:00:00.000Z",
      },
    ];

    renderPage("?view=confirm");

    // A control whose two readings show the same rows is noise.
    expect(screen.queryByTestId("project-requirement-filter")).toBeNull();
    expect(screen.getByTestId("project-requirement-summary").textContent).toBe("2 requirements: 2 confirmed.");
  });

  it("keeps the plain list when every answer needs a rep", () => {
    const savedAt = "2026-10-26T09:00:00.000Z";
    const requirement = (
      id: string,
      label: string,
      status: "review" | "unknown",
    ) => ({ id, label, value: "Recorded", category: "Application", source: "Discovery", status, whyItMatters: `${label} drives the design.`, updatedAt: savedAt });
    storedProject.requirements = [
      requirement("source-count", "Source count", "review"),
      requirement("usb-transport", "USB / conferencing transport", "unknown"),
      requirement("architecture", "Inferred architecture", "review"),
    ];

    renderPage("?view=confirm");

    // Every row is the shortfall, so `All 3` and `Needs attention 3` would be the
    // same reading: the panel offers the rows rather than a choice between them.
    expect(screen.queryByTestId("project-requirement-filter")).toBeNull();
    const list = screen.getByTestId("project-requirement-list");
    expect(within(list).getByRole("list", { name: "Saved requirements" })).toBeTruthy();
    expect(within(list).getAllByRole("listitem").map((row) => row.getAttribute("data-requirement-status")))
      .toEqual(["review", "unknown", "review"]);
    expect(within(list).queryByTestId("project-requirement-filter-note")).toBeNull();
  });

  it("falls back to the whole list when the shortfall reading loses its last row", () => {
    const savedAt = "2026-10-26T09:00:00.000Z";
    const requirement = (
      id: string,
      label: string,
      status: "confirmed" | "review",
    ) => ({ id, label, value: "Recorded", category: "Application", source: "Discovery", status, whyItMatters: `${label} drives the design.`, updatedAt: savedAt });
    const rows = (outstanding: boolean) => [
      requirement("application", "Application / room type", "confirmed"),
      requirement("room-size", "Room or venue size", "confirmed"),
      requirement("source-count", "Source count", outstanding ? "review" : "confirmed"),
    ];
    const panel = (requirements: ReturnType<typeof rows>) => (
      <MemoryRouter>
        <ProjectRequirementList requirements={requirements} projectId="project-1" />
      </MemoryRouter>
    );

    // The page keeps its rows in state, so answering the last outstanding one in
    // its own Next Step panel re-renders this list rather than remounting it —
    // the rep is still on the reading they chose when it changes underneath them.
    const view = render(panel(rows(true)));
    fireEvent.click(screen.getByTestId("project-requirement-filter-attention"));
    expect(screen.getByTestId("project-requirement-list").querySelectorAll("li")).toHaveLength(1);

    view.rerender(panel(rows(false)));

    // The reading had nothing left to hide, so it returns to the whole list: no
    // filter, no note about zero rows, and no empty list to be stranded on.
    expect(screen.queryByTestId("project-requirement-filter")).toBeNull();
    const list = screen.getByTestId("project-requirement-list");
    expect(within(list).queryByTestId("project-requirement-filter-note")).toBeNull();
    expect(within(list).getByRole("list", { name: "Saved requirements" })).toBeTruthy();
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list).getByTestId("project-requirement-summary").textContent).toBe("3 requirements: 3 confirmed.");
  });

  it("offers every record section as a link, so one can open in another tab", () => {
    renderPage();

    const equipment = screen.getByRole("link", { name: "Equipment" });
    // A real destination: the section in the query, the panel it opens on in the
    // hash — which is what makes "open in a new tab" mean the same screen.
    expect(equipment.getAttribute("href")).toBe("/wingman/projects/project-1?view=products#project-equipment");
    expect(equipment.getAttribute("aria-current")).toBeNull();

    // The whole registry is offered the same way, and every chip carries its own
    // address as well as its link.
    const pages = screen.getByRole("navigation", { name: "Project pages" });
    expect(pages.querySelectorAll("a")).toHaveLength(projectDetailSections.length);
    expect(pages.querySelectorAll("button")).toHaveLength(projectDetailSections.length);

    // Following one here still works, and names the panel it landed on.
    fireEvent.click(equipment);
    expect(screen.getByRole("link", { name: "Equipment" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("location").textContent).toBe("/wingman/projects/project-1?view=products#project-equipment");
    expect(document.activeElement?.id).toBe("project-equipment");
  });

  it("lists exactly the anchor registry's sections in the project pages navigator", () => {
    renderPage();

    const pages = screen.getByRole("navigation", { name: "Project pages" });
    const links = Array.from(pages.querySelectorAll("a"));

    // One link per section the page carries, in the navigator's order and
    // labelled the same way. The navigator reads `projectDetailSections`
    // itself, and that list is derived from `projectAnchors`, so this compares
    // what a rep sees with the registry rather than with a second list that
    // could be kept in step by hand.
    expect(links.map((link) => link.textContent)).toEqual(projectDetailSections.map((section) => section.label));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      projectDetailSections.map((section) => projectSectionHref("project-1", section.id)),
    );

    // The other direction: a panel registered in a section the page does not
    // list would leave that section unreachable, so the sections the registry
    // names and the sections on screen have to be the same set.
    const renderedSections = links.map((link) => {
      const href = link.getAttribute("href") ?? "";
      return href.split("?view=")[1]?.split("#")[0] ?? "";
    });
    const registrySections = projectAnchors.map((anchor) => anchor.section);
    expect(new Set(renderedSections)).toEqual(new Set(registrySections));
  });

  it("copies a section chip's full address without leaving the reading", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderPage("?view=overview");

    fireEvent.click(screen.getByRole("button", { name: "Copy link to the Saved work section" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    // The full address of the section, not a bare path: the paste target is
    // usually chat or email, where a relative address points nowhere.
    expect(writeText.mock.calls[0][0]).toBe(
      `${window.location.origin}/wingman/projects/project-1?view=history#project-saved-work`,
    );
    // Sharing a section is not reading it: the rep stays on the screen they were on.
    expect(screen.getByTestId("location").textContent).toBe("/wingman/projects/project-1?view=overview");
    await waitFor(() => expect(screen.getByRole("button", { name: "Link to the Saved work section copied" })).toBeTruthy());
  });

  it("copies the address of the panel the rep is reading", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderPage("?view=products");

    fireEvent.click(screen.getByRole("button", { name: "Copy link to Equipment" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    // Absolute, because the paste target is usually chat or email — and the
    // section is in it, so opening the link lands on the same panel.
    expect(writeText.mock.calls[0][0]).toBe(
      `${window.location.origin}/wingman/projects/project-1?view=products#project-equipment`,
    );
    // The outcome is the control's own name: a second status region would make
    // the page's save confirmation ambiguous.
    await waitFor(() => expect(screen.getByRole("button", { name: "Link to Equipment copied" })).toBeTruthy());
  });

  it("offers every registered panel's own address", () => {
    seedDisplayRun();
    seedDependencyPrompts();
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          application: "lcd-direct",
          columns: 2,
          rows: 1,
          sources: 1,
          sourceLocation: "local",
          sourceResolution: "4k60",
          surveyReview: {
            reviewedAt: "2026-10-20T14:12:00.000Z",
            photoCount: 1,
            confidence: 0.9,
            rows: [{ id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" }],
          },
        },
      },
    };

    for (const anchor of projectAnchors) {
      const { unmount } = renderPage(`?view=${anchor.section}`);
      // A panel on the page is a panel a rep can send; the action is named for
      // the panel so several panels in one section stay distinguishable.
      expect(screen.getByRole("button", { name: `Copy link to ${anchor.label}` }), anchor.id).toBeTruthy();
      unmount();
    }
  });

  it("offers no copy action for a panel the page does not render", () => {
    renderPage("?view=confirm");

    expect(screen.queryByRole("button", { name: "Copy link to Site survey photo review" })).toBeNull();
  });

  it("says so when the browser refuses the clipboard", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderPage("?view=audit");

    fireEvent.click(screen.getByRole("button", { name: "Copy link to Audit log" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Could not copy the link to Audit log" })).toBeTruthy(),
    );
  });

  it("shows which worksheet photo rows were cleared before a run reaches the project", () => {
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          application: "lcd-direct",
          surveyReview: {
            reviewedAt: "2026-10-20T14:12:00.000Z",
            photoCount: 1,
            confidence: 0.63,
            rows: [
              { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
              { id: "display-1", label: "Panel 1", metres: 9, confidence: 0.41, decision: "rejected" },
            ],
          },
        },
      },
    };
    renderPage("?view=confirm");

    expect(screen.getByText("Site survey photo review")).not.toBeNull();
    const cleared = document.querySelector('[data-survey-review-row="display-1"]');
    // The cleared row is named with the run it was read at, so a reviewer can
    // see the number the rep decided not to trust.
    expect(cleared?.textContent).toContain("Panel 1");
    expect(cleared?.textContent).toContain("9 m");
    expect(cleared?.textContent).toContain("Cleared");
    expect(cleared?.getAttribute("data-decision")).toBe("rejected");
  });

  it("lands a project-list flag on the photo review panel it links to", () => {
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt: "2026-10-20T14:12:00.000Z",
            photoCount: 1,
            confidence: 0.63,
            rows: [
              { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
              { id: "display-1", label: "Panel 1", metres: 9, confidence: 0.41, decision: "rejected" },
            ],
          },
        },
      },
    };
    // The shape the survey-cleared flag links with: the section in the query,
    // the panel in the hash.
    renderPage("?view=confirm#wall-survey-review");

    expect(screen.getByRole("link", { name: "Requirements" }).getAttribute("aria-current")).toBe("page");
    expect(document.getElementById("wall-survey-review-row-display-1")).not.toBeNull();
    // The address names the panel, so the reader arrives on it rather than at the
    // top of the Requirements section.
    expect(document.activeElement?.id).toBe("wall-survey-review");
  });

  it("lands any section anchor on the panel it names", () => {
    // The same address shape the survey flag uses, for a panel that has nothing
    // to do with the wall: the section in the query, the panel in the hash.
    renderPage("?view=audit#project-discovery-conversation");

    expect(screen.getByRole("link", { name: "Answers" }).getAttribute("aria-current")).toBe("page");
    expect(document.activeElement?.id).toBe("project-discovery-conversation");
  });

  it("says on the activity log what the boot sweep dropped, and settles it from there", () => {
    // The count is written by the boot sweep, before any page renders, and it
    // covers every room in this browser: a rep who never opens the CRM panel
    // still has to be able to learn that sends went. The activity log is where
    // that rep reads what happened to their room.
    window.localStorage.setItem(CRM_WEBHOOK_DROPS_KEY, JSON.stringify({ droppedRows: 3 }));
    renderPage("?view=audit");

    const note = screen.getByTestId("crm-webhook-history-drops");
    expect(note.textContent).toContain("dropped 3 older sends from its CRM send history");
    // One note, one dismissal: the CRM panel prints the same sentence from the
    // same key, so reading it here is not told again there.
    fireEvent.click(screen.getByTestId("crm-webhook-history-drops-dismiss"));
    expect(screen.queryByTestId("crm-webhook-history-drops")).toBeNull();
    expect(window.localStorage.getItem(CRM_WEBHOOK_DROPS_KEY)).toBeNull();
  });

  it("opens the section an anchor names when the address names none", () => {
    renderPage("#project-evidence");

    expect(screen.getByRole("link", { name: "Evidence" }).getAttribute("aria-current")).toBe("page");
    expect(document.activeElement?.id).toBe("project-evidence");
  });

  it("opens the first section when the address names one this page does not have", () => {
    renderPage("?view=not-a-section");

    // The section id is typed to the registry now, so no code can write this
    // value — but a hand-edited address still can. It names no panel, so the
    // page falls back to the section it opens on instead of rendering nothing.
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("location").textContent).toBe("/wingman/projects/project-1?view=not-a-section");
  });

  it("leaves a hash this page does not render alone", () => {
    renderPage("#somewhere-else");

    // No panel is adopted by name: the reader stays on the page they asked for.
    expect(screen.getByRole("link", { name: "Overview" }).getAttribute("aria-current")).toBe("page");
    expect(document.activeElement?.id ?? "").toBe("");
  });

  it("takes the panel out of the address once the reader moves to another section", () => {
    renderPage("?view=audit#project-handoff");
    expect(screen.getByRole("link", { name: "Handoff" }).getAttribute("aria-current")).toBe("page");
    // The address still names the panel while it is the one on screen.
    expect(screen.getByTestId("location").textContent).toContain("#project-handoff");

    fireEvent.click(screen.getByRole("link", { name: "Activity" }));

    expect(screen.getByRole("link", { name: "Activity" }).getAttribute("aria-current")).toBe("page");
    // The link names the panel Activity opens on. A stale hash would promise a
    // panel the reader can no longer see, and pull them back to it on reload.
    expect(screen.getByTestId("location").textContent).toBe("/wingman/projects/project-1?view=audit#project-activity");
    expect(document.activeElement?.id).toBe("project-activity");
  });

  it("renders every registered panel in the section that owns it", () => {
    seedDisplayRun();
    seedDependencyPrompts();
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          application: "lcd-direct",
          columns: 2,
          rows: 1,
          sources: 1,
          sourceLocation: "local",
          sourceResolution: "4k60",
          surveyReview: {
            reviewedAt: "2026-10-20T14:12:00.000Z",
            photoCount: 1,
            confidence: 0.9,
            rows: [{ id: "display-1", label: "Panel 1", metres: 4, confidence: 0.9, decision: "accepted" }],
          },
        },
      },
    };

    for (const anchor of projectAnchors) {
      const { unmount } = renderPage(`?view=${anchor.section}`);
      const panel = document.getElementById(anchor.id);
      expect(panel, `${anchor.id} in ${anchor.section}`).not.toBeNull();
      // Only a panel that opts into taking focus can be landed on.
      expect(panel?.getAttribute("tabindex"), anchor.id).toBe("-1");
      unmount();
    }
  });

  it("takes the Activity entry straight to the rows its review cleared", () => {
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt: "2026-10-20T14:12:00.000Z",
            photoCount: 1,
            confidence: 0.63,
            rows: [
              { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.82, decision: "accepted" },
              { id: "display-1", label: "Panel 1", metres: 9, confidence: 0.41, decision: "rejected" },
            ],
          },
        },
      },
    };
    // The trail is newest first, the way the commands write it.
    storedProject.auditTrail = [
      { id: "audit-review-2", action: "wall-survey-review", detail: "Worksheet photo review — 1 row accepted, 1 rejected, 1 photo, 63% confidence; recorded 20 Oct 2026, 14:12", scope: "videowall", severity: "info", actorName: "Wingman user", createdAt: "2026-10-20T14:12:00.000Z" },
      { id: "audit-review-1", action: "wall-survey-review", detail: "Worksheet photo review — 3 rows accepted, none rejected, 1 photo, 88% confidence; recorded 18 Oct 2026, 09:05", scope: "videowall", severity: "info", actorName: "Wingman user", createdAt: "2026-10-18T09:05:00.000Z" },
    ];
    renderPage("?view=audit");

    // The project keeps one review, so only its newest entry has rows to open.
    const links = screen.getAllByTestId("audit-survey-cleared-link");
    expect(links).toHaveLength(1);
    expect(links[0].textContent).toBe("See the 1 cleared row");

    fireEvent.click(links[0]);

    expect(screen.getByRole("link", { name: "Requirements" }).getAttribute("aria-current")).toBe("page");
    expect(document.getElementById("wall-survey-review-row-display-1")).not.toBeNull();
    // The reader lands on the panel, not on the top of the section.
    expect(document.activeElement?.id).toBe("wall-survey-review");
  });

  it("lets a flagged run on the trail open the review row that decided it", () => {
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt: "2026-10-20T14:12:00.000Z",
            photoCount: 1,
            confidence: 0.63,
            rows: [{ id: "display-1", label: "Panel 1", metres: 7, confidence: 0, typed: true, decision: "accepted" }],
            flags: [{ id: "display-1", label: "Panel 1", metres: 7, allowanceMetres: 2 }],
          },
        },
      },
    };
    storedProject.auditTrail = [
      {
        id: "audit-review-3",
        action: "wall-survey-review",
        detail:
          "Worksheet photo review — 1 row accepted (1 typed), none rejected, 1 photo, 63% confidence, 1 typed run outside the printed allowance (Panel 1: 7 m against ≈2 m); recorded 20 Oct 2026, 14:12",
        scope: "videowall",
        severity: "info",
        actorName: "Wingman user",
        createdAt: "2026-10-20T14:12:00.000Z",
      },
    ];
    renderPage("?view=audit");

    // The clause the trail prints is the way into the row it was read from.
    const link = screen.getByTestId("audit-survey-flag-link");
    expect(link.textContent).toBe("Panel 1: 7 m against ≈2 m");

    fireEvent.click(link);

    expect(screen.getByRole("link", { name: "Requirements" }).getAttribute("aria-current")).toBe("page");
    expect(document.getElementById("wall-survey-review-row-display-1")).not.toBeNull();
    // The reader lands on the panel, where the recorded decision sits.
    expect(document.activeElement?.id).toBe("wall-survey-review");
  });

  it("takes the Activity entry to the transport row its sheet imported", () => {
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          application: "lcd-direct",
          columns: 2,
          rows: 1,
          sources: 1,
          sourceLocation: "local",
          sourceResolution: "4k60",
          measuredRuns: { "display-1": 4 },
        },
      },
    };
    storedProject.auditTrail = [
      {
        id: "audit-sheet-1",
        action: "wall-survey-sheet",
        detail: "Survey sheet imported — 1 run (Panel 1: 4 m); recorded 21 Oct 2026, 20:30",
        scope: "videowall",
        severity: "info",
        actorName: "Wingman user",
        createdAt: "2026-10-21T20:30:00.000Z",
      },
    ];
    renderPage("?view=audit");

    // The entry names the run it imported, so the way in is the row that holds
    // it, labelled with the same clause the entry prints.
    const link = screen.getByTestId("audit-wall-transport-link");
    expect(link.textContent).toBe("Panel 1: 4 m");

    fireEvent.click(link);

    expect(screen.getByRole("link", { name: "Requirements" }).getAttribute("aria-current")).toBe("page");
    expect(document.getElementById("wall-transport-review-row-display-1")).not.toBeNull();
    // The reader lands on the transport panel, where the allowance and limit
    // that run was checked against sit beside it.
    expect(document.activeElement?.id).toBe("wall-transport-review");
  });

  it("says the builder holds newer work and follows its offer into this project's wall", () => {
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          application: "lcd-direct",
          columns: 2,
          rows: 1,
          sources: 1,
          sourceLocation: "local",
          sourceResolution: "4k60",
          measuredRuns: { "display-1": 4 },
        },
      },
    };
    // This project's wall was edited after it was saved, so the record is behind
    // the copy the builder would reopen.
    window.localStorage.setItem(VIDEO_WALL_DRAFT_KEY, JSON.stringify({
      version: 2,
      requirements: { application: "lcd-direct", columns: 2, rows: 1, sources: 1, measuredRuns: { "display-1": 9 } },
      selectedId: "",
      projectId: "project-1",
      updatedAt: "2026-10-20T16:00:00.000Z",
    }));
    renderPage("?view=confirm");

    const note = screen.getByTestId("wall-transport-draft-status");
    expect(note.getAttribute("data-draft-status")).toBe("draft-ahead");
    expect(note.textContent).toContain("the project copy is behind");

    // Following the offer lands on the builder with the project named, so the
    // wall the rep resumes is this one — not whichever draft in this browser was
    // edited last.
    fireEvent.click(screen.getByRole("link", { name: `Continue in ${WALL_ENTRY_SENTENCE_NAME}` }));

    expect(screen.getByTestId("location").textContent).toBe("/wingman/videowall?project=project-1");
  });

  it("shows an imported sheet's runs beside the photo review, without opening Activity", () => {
    storedProject.videowall = {
      savedAt: "2026-10-21T20:30:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          application: "lcd-direct",
          columns: 2,
          rows: 1,
          sources: 1,
          sourceLocation: "local",
          sourceResolution: "4k60",
          surveyReview: {
            reviewedAt: "2026-10-21T20:30:00.000Z",
            photoCount: 1,
            confidence: 0.9,
            rows: [
              { id: "source-1", label: "Source 1", metres: 3, confidence: 0.9, decision: "accepted" },
            ],
          },
        },
      },
    };
    storedProject.auditTrail = [
      {
        id: "audit-sheet-1",
        action: "wall-survey-sheet",
        detail: "Survey sheet imported — 2 runs (Source 1: 3 m; Panel 1: 4.5 m); recorded 21 Oct 2026, 20:30",
        scope: "videowall",
        severity: "info",
        actorName: "Wingman user",
        createdAt: "2026-10-21T20:30:00.000Z",
      },
    ];
    renderPage("?view=confirm");

    const imported = screen.getByTestId("wall-survey-sheet-imports");
    expect(imported.textContent).toContain("Source 1: 3 m");
    expect(imported.textContent).toContain("Panel 1: 4.5 m");
    // It sits beside the photo review, so the two ways a run reached the design
    // read together on the record rather than one hiding in Activity.
    const review = screen.getByTestId("wall-survey-photo-review");
    expect(review.compareDocumentPosition(imported) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves a review entry unlinked when that review kept every row", () => {
    storedProject.videowall = {
      savedAt: "2026-10-20T14:12:00.000Z",
      wallType: "lcd",
      summary: {
        version: 2,
        requirements: {
          surveyReview: {
            reviewedAt: "2026-10-20T14:12:00.000Z",
            photoCount: 1,
            confidence: 0.9,
            rows: [
              { id: "source-1", label: "Source 1", metres: 4.5, confidence: 0.91, decision: "accepted" },
            ],
          },
        },
      },
    };
    storedProject.auditTrail = [
      { id: "audit-review-3", action: "wall-survey-review", detail: "Worksheet photo review — 1 row accepted, none rejected, 1 photo, 90% confidence; recorded 20 Oct 2026, 14:12", scope: "videowall", severity: "info", actorName: "Wingman user", createdAt: "2026-10-20T14:12:00.000Z" },
    ];
    renderPage("?view=audit");

    expect(screen.getByText(/1 row accepted, none rejected/)).toBeTruthy();
    expect(screen.queryByTestId("audit-survey-cleared-link")).toBeNull();
  });

  it("leaves the photo review off a project the survey never touched", () => {
    renderPage("?view=confirm");

    expect(screen.queryByTestId("wall-survey-photo-review")).toBeNull();
  });

  it("keeps saved comparison decisions with the project and links to a current fit check", () => {
    storedProject.compareRuns = [{
      id: "run-1",
      createdAt: "2026-08-04T09:00:00.000Z",
      version: 2,
      competitorBrand: "Extron",
      competitorSku: "DTP2",
      wyrestormSku: "MX-0402-MST",
      summary: "Partial fit after review.",
      evidence: ["HDMI output confirmed"],
      warnings: ["Confirm USB routing"],
    }];
    renderPage();

    fireEvent.click(screen.getByRole("link", { name: "Saved work" }));
    expect(screen.getByText("Snapshot v2", { exact: false })).not.toBeNull();
    expect(screen.getAllByText("Partial fit after review.").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Check current fit" }).getAttribute("href")).toContain("projectId=project-1");
  });

  it("requires confirmation before deleting and returns to Projects", () => {
    renderPage();

    fireEvent.click(screen.getByText("Project actions"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteProject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(deleteProject).toHaveBeenCalledWith("project-1");
    expect(screen.getByText("Projects list")).not.toBeNull();
  });

  it("says a first save made a template and a second one updated it, and opens it", () => {
    renderPage();
    const save = screen.getByRole("button", { name: "Save as template" });

    fireEvent.click(save);

    // Nothing was there before the click, so the confirmation claims a new one.
    expect(screen.getByTestId("project-detail-message").textContent).toContain(
      "Saved a new custom room template for this room.",
    );
    const [saved] = getCustomRoomTemplates();
    expect(saved.sourceProjectId).toBe("project-1");
    // The confirmation is also the way in: it links to the record it just wrote,
    // under the wording every other surface prints for the action. Scoped to the
    // notice, because the record's own lineage panel lists the same template
    // under the same accessible name.
    const notice = screen.getByTestId("project-detail-message");
    expect(
      within(notice).getByRole("link", { name: `Open template: ${saved.name}` }).getAttribute("href"),
    ).toBe(`/wingman/templates/${saved.id}`);

    // A room has one template: the second click republishes that record, and the
    // confirmation says so rather than claiming another save.
    fireEvent.click(screen.getByRole("button", { name: "Save as template" }));
    expect(screen.getByTestId("project-detail-message").textContent).toContain(
      `Updated this room's existing template: ${saved.name}.`,
    );
    // Same record, so the link did not move to a second design.
    expect(
      within(screen.getByTestId("project-detail-message"))
        .getByRole("link", { name: `Open template: ${saved.name}` })
        .getAttribute("href"),
    ).toBe(`/wingman/templates/${saved.id}`);
    expect(getCustomRoomTemplates().filter((template) => template.sourceProjectId === "project-1")).toHaveLength(1);

    // Leave the library as this case found it: the record's lineage panel reads
    // the same store, and a later case should not inherit this room's template.
    deleteCustomRoomTemplate(saved.id);
  });

  it("drops the template link when the next confirmation is about something else", () => {
    renderPage("?view=confirm&edit=true");

    fireEvent.click(screen.getByRole("button", { name: "Save as template" }));
    const [saved] = getCustomRoomTemplates();
    expect(
      within(screen.getByTestId("project-detail-message")).getByRole("link", {
        name: `Open template: ${saved.name}`,
      }),
    ).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save project" }));

    // Saving the room's details is not about the template, so the notice does
    // not keep offering it as though it were part of that save.
    expect(screen.getByTestId("project-detail-message").textContent).toContain("Project details saved.");
    expect(screen.queryByTestId("project-detail-message-template")).toBeNull();

    deleteCustomRoomTemplate(saved.id);
  });

  it("guides the salesperson through proposal blockers before routing to the fixing workflow", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Resolve .* open question/ }));

    expect(screen.getByRole("region", { name: "Response blocker walkthrough" })).not.toBeNull();
    expect(screen.getByText(/Blocker 1 of/)).not.toBeNull();
    expect(screen.getAllByText("USB host ownership").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open full Discovery" }).getAttribute("href")).toBe(
      "/wingman/discovery?resume=project",
    );
  });
});
