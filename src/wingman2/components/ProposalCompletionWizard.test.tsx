import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  readProjectStore,
  setActiveProjectId,
  upsertStoredProject,
  type StoredDiscoveryBrief,
} from "../data/projectStore";
import { ProposalCompletionWizard } from "./ProposalCompletionWizard";
import { createProposalWizardDefaults, saveProposalWizardDraft } from "../lib/proposalWizard";
import { setInstallChecked } from "../lib/siteSurveyStorage";
import { defaultWallRequirements } from "../lib/videowallOptions";

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

    expect(screen.getByText("Open a project before building a response")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Open projects" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Start Discovery" })).not.toBeNull();
  });

  it("renders the completion wizard for the active project", () => {
    seedActiveProject();
    renderWizard();

    expect(screen.getByText("Make the proposal yours.")).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Response completion steps" })).not.toBeNull();
    expect(screen.getByText(/% of supporting details captured/)).not.toBeNull();
  });

  it("blocks export when the project has no requirements or system design", () => {
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

  it("keeps the discovery brief export available before the wizard is complete", () => {
    // Without a discovery conversation there is nothing to hand off, so the
    // button stays disabled even though the brief export is not gated on
    // wizard readiness.
    seedActiveProject();
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));
    expect(screen.getByRole("button", { name: /Export discovery brief/i }).hasAttribute("disabled")).toBe(true);
  });

  it("enables the discovery brief export once a conversation exists, ahead of full readiness", () => {
    seedActiveProject();
    const currentProject = readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!;
    upsertStoredProject({
      ...currentProject,
      discoveryBrief: {
        capturedPercent: 88,
        roomModel: { application: "Meeting room / boardroom" },
        discoveryConversation: [
          {
            stepId: "opportunity",
            question: "What type of opportunity is this?",
            answer: "Meeting room / boardroom",
            note: "",
            confirmed: true,
          },
        ],
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    const briefButton = screen.getByRole("button", { name: /Export discovery brief/i });
    expect(briefButton.hasAttribute("disabled")).toBe(false);
    // The formal exports are still gated on readiness — the brief is not.
    expect(screen.getByRole("button", { name: /Export formatted DOCX/ }).hasAttribute("disabled")).toBe(true);
  });

  it("flags a wall cable run that exceeds its transport limit before export", () => {
    seedActiveProject();
    const currentProject = readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!;
    upsertStoredProject({
      ...currentProject,
      videowall: {
        savedAt: new Date().toISOString(),
        wallType: "lcd",
        summary: {
          version: 2,
          // A measured 10 m panel-to-panel hop is past the 5 m passive HDMI limit
          // at 4K60, so the rep has to see it before the proposal is issued.
          requirements: { ...defaultWallRequirements, application: "lcd-loop", columns: 2, rows: 2, windows: 1, sources: 1, measuredRuns: { "display-2": 10 } },
        },
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    const panel = document.querySelector("[data-wall-transport]");
    expect(panel?.getAttribute("data-wall-transport")).toBe("over-limit");
    expect(screen.getByText(/exceeds a transport limit/)).not.toBeNull();
    const breached = document.querySelector('[data-wall-transport-link="display-2"]');
    expect(breached?.textContent).toContain("Over limit");
    expect(breached?.textContent).toContain("10 m measured per hop");
  });

  it("states that every wall run fits when nothing breaches a limit", () => {
    seedActiveProject();
    const currentProject = readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!;
    upsertStoredProject({
      ...currentProject,
      videowall: {
        savedAt: new Date().toISOString(),
        wallType: "lcd",
        summary: {
          version: 2,
          requirements: { ...defaultWallRequirements, application: "lcd-loop", columns: 2, rows: 1, windows: 1, sources: 1 },
        },
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    expect(document.querySelector("[data-wall-transport]")?.getAttribute("data-wall-transport")).toBe("within-limit");
    expect(screen.getByText("Every run fits its transport at the designed length.")).not.toBeNull();
    expect(document.querySelector("[data-wall-transport-link]")).toBeNull();
  });

  function seedExportReadyProject(measuredRuns: Record<string, number>, extra: Partial<typeof defaultWallRequirements> = {}) {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: { capturedPercent: 40, roomModel: {}, discoveryConversation: [{ stepId: "opportunity", question: "Room purpose", answer: "Presentation", note: "Share slides", confirmed: false }] },
      proposal: {
        title: "Presentation room", summary: "Share slides", sections: [], assumptions: ["Cable routes to measure"],
        updatedAt: new Date().toISOString(), approvalStatus: "draft" as const,
        products: [{ sku: "MX-0402-MST", title: "Presentation matrix", quantity: 1 }],
        bomRows: [{ item: 1, sku: "MX-0402-MST", description: "Presentation matrix", role: "Source input, switching processing, HDMI cable transport and display output", qty: 1, type: "Required", status: "included", evidence: "Customer brief", notes: "" }],
      },
      videowall: {
        savedAt: new Date().toISOString(),
        wallType: "lcd",
        summary: {
          version: 2,
          requirements: {
            ...defaultWallRequirements,
            application: "lcd-direct" as const,
            layout: "independent" as const,
            columns: 2,
            rows: 1,
            sources: 2,
            windows: 2,
            measuredRuns,
            ...extra,
          },
        },
      },
    });
  }

  /**
   * A room whose survey measured a 130 m display run: the schedule quotes
   * RX-700, so the export gate holds the document until the link is carried in
   * spans. Seeded with the products the wizard builds its BOM from, because a
   * receiver the schedule does not quote is a run with nothing to measure.
   */
  function seedDisplayRunProject(roomModelPatch: Record<string, unknown> = {}) {
    seedActiveProject();
    const receiver = { sku: "RX-700", title: "HDBaseT receiver", category: "Display receiver", quantity: 1, status: "recommended" as const, evidence: ["Survey measured 130 m"] };
    const matrix = { sku: "MX-0402-MST", title: "Presentation matrix", category: "Switching", quantity: 1, status: "recommended" as const, evidence: ["Customer brief"] };
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: {
        capturedPercent: 40,
        roomModel: { cableRun: "130 m", longestRun: "130 m", ...roomModelPatch },
        discoveryConversation: [{ stepId: "opportunity", question: "Room purpose", answer: "Presentation", note: "Share slides", confirmed: false }],
      },
      productSelections: [matrix, receiver],
      proposal: {
        title: "Presentation room", summary: "Share slides", sections: [], assumptions: ["Cable routes to measure"],
        updatedAt: new Date().toISOString(), approvalStatus: "draft" as const,
        products: [matrix, receiver],
        bomRows: [
          { item: 1, sku: matrix.sku, description: matrix.title, role: matrix.category, qty: 1, type: "Required", status: "included", evidence: "Customer brief", notes: "" },
          { item: 2, sku: receiver.sku, description: receiver.title, role: receiver.category, qty: 1, type: "Required", status: "included", evidence: "Survey measured 130 m", notes: "" },
        ],
        validationNotes: ["Display receiver: The survey records a 130 m display run, beyond the 100 m rating of RX-700, so the receiver alone cannot carry the link: allow a mid-span repeater or a fibre link at survey before issue."],
      },
    });
  }

  it("clears a display run past the receiver's rating from the export gate", () => {
    seedDisplayRunProject();
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    // The block names the run, and the action under it names the spans it will
    // create — without the rep opening the details toggle first.
    expect(screen.getByText(/beyond the 100 m rating of the longest HDBaseT receiver/)).not.toBeNull();
    expect(screen.getByText(/2 spans of 65 m/)).not.toBeNull();
    // The selected matrix and receiver do not invent generic system
    // dependencies; the measured run is the only blocker in this room.
    expect(screen.getByText(/1 blocker\(s\) must be resolved/)).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Schedule the mid-span repeater" }));

    // The room records the span, and its own schedule now quotes the set.
    const saved = readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!;
    expect(saved.discoveryBrief?.roomModel).toMatchObject({ cableRun: "130 m", servedRun: "65 m" });
    expect((saved.productSelections ?? []).some((product) => product.sku === "EX3-100-EARC")).toBe(true);
    // The run's blocker is gone, and with it the offer: this page asked the
    // receiver to serve the span it now carries.
    expect(screen.queryByText(/beyond the 100 m rating of the longest HDBaseT receiver/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Schedule the mid-span repeater" })).toBeNull();
  });

  it("records an explicitly required dependency prompt from the export gate", () => {
    seedDisplayRunProject({ controlNeeds: ["Touch panel control programming required"] });
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    // The control requirement is an explicit room need, so it is offered where
    // the block is read and can be recorded without leaving the page.
    const rows = [...document.querySelectorAll("[data-dependency-scope-row]")];
    expect(rows.length).toBe(1);
    const sku = rows[0].getAttribute("data-dependency-scope-row")!;
    const label = rows[0].querySelector("span")?.textContent ?? "";
    expect(screen.getByText(/BOM row\(s\) are still placeholders/).textContent).toContain("1 BOM row(s)");

    fireEvent.click(screen.getByRole("button", { name: `Record ${label} as a documented dependency` }));

    // The decision is stored on the project, so a later visit and the document
    // build both honour it.
    const saved = readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!;
    expect(saved.unquotedDependencySkus).toContain(sku);
    // The gate counts the prompt it still holds, and the one just answered is
    // no longer offered as a decision to take.
    expect(screen.queryByText(/BOM row\(s\) are still placeholders/)).toBeNull();
    expect(document.querySelector(`[data-dependency-scope-row="${sku}"]`)).toBeNull();
  });

  it("warns that the wall survey is short of install detail without blocking the export", () => {
    seedExportReadyProject({ "display-1": 3, "display-2": 3 });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    const panel = document.querySelector("[data-wall-survey]");
    expect(panel?.getAttribute("data-wall-survey")).toBe("incomplete");
    expect(panel?.textContent).toContain("Survey incomplete: 2 of 2 links are missing a display housing, a run entry or a termination");
    // Each short link is named with the cell it is missing.
    const gap = document.querySelector('[data-wall-survey-gap="display-1"]');
    expect(gap?.textContent).toContain("Panel 1 — display housing and run entry and termination not recorded");
    // The document can still be issued: the schedule prints the links it has.
    expect(screen.getByRole("button", { name: /Export formatted DOCX/ }).hasAttribute("disabled")).toBe(false);

    // The same shortfall is a warning in the export validation list, so the
    // readiness summary counts it rather than hiding it behind the wall panel.
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    const warning = [...document.querySelectorAll(".wm-proposal-validation-item--warning")]
      .find((entry) => entry.textContent?.includes("Survey incomplete"));
    expect(warning?.textContent).toContain("survey");
    expect(warning?.textContent).toContain("Fix: Record the display housing, run entry and termination");
  });

  it("records a missing survey cell from the proposal and clears the warning there", () => {
    const detail = { enclosure: "Back box", entry: "Ceiling void", termination: "HDMI faceplate" };
    seedExportReadyProject({ "display-1": 3, "display-2": 3 }, {
      linkDetails: { "display-1": { enclosure: "Back box", entry: "Ceiling void" }, "display-2": detail },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    // Only Panel 1's termination is short, so that is the only cell offered.
    expect(screen.getByLabelText("Termination for Panel 1")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Termination for Panel 1"), { target: { value: "HDMI faceplate" } });
    fireEvent.click(screen.getByRole("button", { name: "Record on the wall" }));

    // The saved wall carries the cell, so the proposal's own panel and the
    // export warnings agree that the survey is complete.
    const saved = readProjectStore().projects.find((entry) => entry.id === "acme-hq-boardroom");
    const wall = saved?.videowall;
    expect((wall?.summary.requirements as { linkDetails?: Record<string, { termination?: string }> }).linkDetails?.["display-1"]?.termination).toBe("HDMI faceplate");
    // The cell is a change to the design, so the trail names the link it filled
    // rather than the proposal quietly rewriting the wall.
    expect(saved?.auditTrail?.[0]).toMatchObject({ action: "wall-survey-detail", scope: "videowall" });
    expect(saved?.auditTrail?.[0]?.detail).toContain("1 link (Panel 1)");
    expect(document.querySelector("[data-wall-survey]")).toBeNull();
    expect(document.querySelector("[data-wall-survey-fix]")).toBeNull();
  });

  it("drops the survey warning once every link carries enclosure and termination", () => {
    const detail = { enclosure: "Back box", entry: "Ceiling void", termination: "HDMI faceplate" };
    seedExportReadyProject({ "display-1": 3, "display-2": 3 }, {
      linkDetails: { "display-1": detail, "display-2": detail },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    expect(document.querySelector("[data-wall-survey]")).toBeNull();
    expect(screen.getByRole("button", { name: /Export formatted DOCX/ }).hasAttribute("disabled")).toBe(false);
  });

  it("blocks the proposal exports and names the over-limit run with its fix", () => {
    seedExportReadyProject({ "display-1": 3, "display-2": 40 });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    // The document would print its own over-limit link, so it cannot be issued.
    for (const name of [/Export formatted DOCX/, /Export PDF/, /Export HTML/]) {
      expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
    }
    expect(document.querySelector("[data-wall-transport-blocked]")?.textContent).toContain("blocked until each over-limit run is fixed");

    // The named blocker carries the panel, the measured run and the fix that clears it.
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    // The wall panel lists the link; the Export Validation list names the
    // blocker and carries the fix, so match the entry that has both.
    const item = [...document.querySelectorAll(".wm-proposal-validation-item--blocker")]
      .find((entry) => entry.textContent?.includes("Panel 2") && entry.textContent?.includes("Fix:"));
    expect(item?.textContent).toContain("measured 40 m run");
    expect(item?.textContent).toContain("5 m limit");
    expect(item?.textContent).toContain("Fix: Use an active or fibre HDMI cable");
  });

  it("keeps the exports available when the wall's measured runs fit", () => {
    seedExportReadyProject({ "display-1": 3, "display-2": 3 });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    expect(screen.getByRole("button", { name: /Export formatted DOCX/ }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: /Export HTML/ }).hasAttribute("disabled")).toBe(false);
    expect(document.querySelector("[data-wall-transport-blocked]")).toBeNull();
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

  it("offers direct export access and keeps team review optional without sign-off checkboxes", () => {
    seedActiveProject();
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));
    expect(screen.getByText("Optional team review")).not.toBeNull();
    expect(screen.queryByLabelText(/I have reviewed/)).toBeNull();
    expect(screen.queryByText("Final approval")).toBeNull();
  });

  it.each(["draft", "pending", "rejected"] as const)("allows a proposal with incomplete discovery and %s team review status when technical checks pass", (approvalStatus) => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find(project => project.id === "acme-hq-boardroom")!,
      discoveryBrief: { capturedPercent: 40, roomModel: {}, discoveryConversation: [{ stepId: "opportunity", question: "Room purpose", answer: "Presentation", note: "Share slides", confirmed: false }] },
      proposal: { title: "Presentation room", summary: "Share slides", sections: [], assumptions: ["Cable routes to measure"], updatedAt: new Date().toISOString(), approvalStatus,
        products: [{ sku: "MX-0402-MST", title: "Presentation matrix", quantity: 1 }],
        bomRows: [{ item: 1, sku: "MX-0402-MST", description: "Presentation matrix", role: "Source input, switching processing, HDMI cable transport and display output", qty: 1, type: "Required", status: "included", evidence: "Customer brief", notes: "" }],
      },
    });
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));
    expect(screen.getByRole("button", { name: /Export formatted DOCX/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Export HTML/ })).not.toBeDisabled();
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

  it("shows the Discovery Conversation Q&A trail on the requirements review step", () => {
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
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));

    // The trail renders the governed answer AND the customer's own wording.
    expect(screen.getByText("Discovery Conversation")).toBeTruthy();
    expect(screen.getByText("The exec boardroom on the top floor.")).toBeTruthy();
    // "Single large room" also appears in the requirements grid above, so the
    // conversation trail assertion is scoped to the review section.
    const review = screen.getByTestId("discovery-conversation-review-section");
    expect(review.textContent).toContain("Single large room");
    // Confirmed rows show the settled tone; open rows keep "to be confirmed".
    expect(review.textContent).toContain("Confirmed with customer");
    expect(review.textContent).toContain("Single large room — to be confirmed");

    // Each row routes back to the exact discovery question that produced it.
    expect(
      screen.getByRole("link", { name: 'Edit "What type of opportunity is this?" in Discovery' })
        .getAttribute("href"),
    ).toBe("/wingman/discovery?edit=opportunity");
    expect(
      screen.getByRole("link", { name: 'Edit "What is the approximate room or system scale?" in Discovery' })
        .getAttribute("href"),
    ).toBe("/wingman/discovery?edit=scale");
  });

  it("surfaces the verify-before-quote responsibility on the review and export step", () => {
    seedActiveProject();
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    const note = document.querySelector("[data-wingman-verify-before-quote]");
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain("best-efforts");
    expect(note?.textContent).toContain("Verify specifications");
    expect(note?.querySelector("a")?.getAttribute("href")).toBe("/wingman/terms");
  });

  it("keeps typed customer details while the draft autosaves to the project", async () => {
    seedActiveProject();
    renderWizard();

    const customerInput = screen.getByLabelText(/Customer \/ organisation/) as HTMLInputElement;
    fireEvent.change(customerInput, { target: { value: "Acme Global PLC" } });
    expect(customerInput.value).toBe("Acme Global PLC");

    // The 250 ms proposal autosave round-trips through the project store,
    // which re-creates the discovery defaults object. The typed Step-1 value
    // must survive that cycle instead of being reset to the discovery default.
    await waitFor(() => {
      expect(
        (screen.getByLabelText(/Customer \/ organisation/) as HTMLInputElement).value,
      ).toBe("Acme Global PLC");
    });

    // Give the autosave loop another pass to confirm the value is stable.
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    expect(
      (screen.getByLabelText(/Customer \/ organisation/) as HTMLInputElement).value,
    ).toBe("Acme Global PLC");
  });

  it("shows a needs-site-survey flag when topology routes are band-estimated", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: {
        capturedPercent: 88,
        roomModel: {
          application: "Meeting room / boardroom",
          scale: "Single large room",
          longestRun: "Across a large room",
        },
        topology: {
          schemaVersion: 1,
          mode: "simple",
          locations: [
            { id: "planning-equipment-position", name: "Equipment", type: "room-rack", notes: "wingman-route-planner:{\"equipmentPosition\":\"room-rack\",\"videoDistance\":\"typical-room\",\"routeType\":\"ceiling-perimeter\",\"usbDistance\":\"across-room\",\"exceptionMode\":\"none\"}" },
            { id: "loc-disp", name: "Display", type: "display-wall" },
          ],
          devices: [
            { id: "dev-src", name: "Source", category: "source", locationId: "planning-equipment-position", quantity: 1, thirdParty: true, status: "assumed" },
            { id: "dev-disp", name: "Display", category: "display", locationId: "loc-disp", quantity: 1, thirdParty: true, status: "assumed" },
          ],
          connections: [
            {
              id: "planning-video-path",
              fromDeviceId: "dev-src",
              toDeviceId: "dev-disp",
              services: ["video", "embedded-audio"],
              transport: "hdbaset-3",
              lengthMode: "estimated",
              lengthMetres: 50,
              estimateReason: "Across a typical room via Ceiling / room perimeter; planning allowance 50 m",
              status: "assumed",
            },
            {
              id: "planning-usb-path",
              fromDeviceId: "dev-src",
              toDeviceId: "dev-disp",
              services: ["usb-2"],
              transport: "usb-extender",
              lengthMode: "estimated",
              lengthMetres: 15,
              estimateReason: "USB host-to-device planning distance 15 m",
              status: "assumed",
            },
          ],
          generatedFromDiscovery: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));

    const flag = document.querySelector("[data-wingman-needs-site-survey]");
    expect(flag).not.toBeNull();
    expect(flag?.textContent).toContain("Needs site survey");
    expect(flag?.textContent).toContain("band-estimated");
    expect(flag?.querySelector("a")?.getAttribute("href"))
      .toContain("/wingman/discovery?edit=locations-connections");
  });

// The 5 installation-detail items generated for the exact-figures topology
// (room-rack present, no projector, no network-dependent route).
const INSTALL_ITEM_IDS = [
  "display-mount-height",
  "cable-containment",
  "power-at-position",
  "mounting-hardware",
  "rack-position",
];

function exactFiguresBrief(): StoredDiscoveryBrief {
  return {
    capturedPercent: 88,
    roomModel: {
      application: "Meeting room / boardroom",
      scale: "Single large room",
      longestRun: "Across a large room",
    },
    topology: {
      schemaVersion: 1,
      mode: "simple",
      locations: [
        { id: "planning-equipment-position", name: "Equipment", type: "room-rack", notes: "wingman-route-planner:{\"equipmentPosition\":\"room-rack\",\"videoDistance\":\"typical-room\",\"routeType\":\"ceiling-perimeter\",\"usbDistance\":\"across-room\",\"exceptionMode\":\"none\",\"videoDistanceMetres\":42,\"usbDistanceMetres\":7}" },
        { id: "loc-disp", name: "Display", type: "display-wall" },
      ],
      devices: [
        { id: "dev-src", name: "Source", category: "source", locationId: "planning-equipment-position", quantity: 1, thirdParty: true, status: "assumed" },
        { id: "dev-disp", name: "Display", category: "display", locationId: "loc-disp", quantity: 1, thirdParty: true, status: "assumed" },
      ],
      connections: [
        {
          id: "planning-video-path",
          fromDeviceId: "dev-src",
          toDeviceId: "dev-disp",
          services: ["video", "embedded-audio"],
          transport: "hdbaset-3",
          lengthMode: "estimated",
          lengthMetres: 42,
          estimateReason: "Exact cable length entered during discovery: 42 m",
          status: "assumed",
        },
        {
          id: "planning-usb-path",
          fromDeviceId: "dev-src",
          toDeviceId: "dev-disp",
          services: ["usb-2"],
          transport: "usb-extender",
          lengthMode: "estimated",
          lengthMetres: 7,
          estimateReason: "USB host-to-device planning distance 7 m",
          status: "assumed",
        },
      ],
      generatedFromDiscovery: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

  it("hides the survey flag when routes are exact and installation details are confirmed", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: exactFiguresBrief(),
    });

    // Exact cable figures clear the route reasons; the flag then only stays
    // visible while the on-site Installation Details checkboxes are open.
    setInstallChecked("acme-hq-boardroom", INSTALL_ITEM_IDS);

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));

    expect(document.querySelector("[data-wingman-needs-site-survey]")).toBeNull();
  });

  it("keeps the survey flag when routes are exact but installation details are unconfirmed", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: exactFiguresBrief(),
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));

    const flag = document.querySelector("[data-wingman-needs-site-survey]");
    expect(flag).not.toBeNull();
    expect(flag?.textContent).toContain("Needs site survey");
    expect(flag?.textContent).toContain("Installation details");
  });

  it("clears the survey flag live once all installation details are confirmed", async () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: exactFiguresBrief(),
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));
    expect(document.querySelector("[data-wingman-needs-site-survey]")).not.toBeNull();

    // Confirming every on-site checkbox dispatches the shared survey-edited
    // event, which must re-evaluate the flag without a reload.
    setInstallChecked("acme-hq-boardroom", INSTALL_ITEM_IDS);

    await waitFor(() => {
      expect(document.querySelector("[data-wingman-needs-site-survey]")).toBeNull();
    });
  });

  it("shows unstructured discovery notes as advisory information", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: {
        capturedPercent: 50,
        roomModel: {},
        discoveryConversation: [
          {
            stepId: "scale",
            question: "What is the approximate room or system scale?",
            answer: "Captured note only",
            note: "The big exec room at the end of the corridor.",
          },
        ],
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    // The gate summary is visible immediately; expand to see the blocker detail.
    expect(
      screen.getByText(/1 warning\(s\)/),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show details/ }));

    // The note-only capture surfaces with the question named and the discovery
    // domain, so the rep knows which row to reopen.
    expect(
      screen.getByText(/captured as a note only and remains an open design detail/),
    ).not.toBeNull();
    expect(
      screen.getByText(/What is the approximate room or system scale\?/),
    ).not.toBeNull();
    expect(screen.getByText("discovery")).not.toBeNull();
  });

  it("shows install-detail confirmations in the on-site progress summary", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: exactFiguresBrief(),
    });
    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    // The exact-figures topology has a rack, so the checklist generates 5
    // installation-detail items — all still open at a glance.
    expect(screen.getByText("0/5 install details confirmed")).not.toBeNull();

    // Confirming one item updates the progress summary without a reload.
    fireEvent.click(screen.getByLabelText(/Display mounting height/));
    expect(screen.getByText("1/5 install details confirmed")).not.toBeNull();
  });

  it("highlights low-confidence discovery rows on the requirements review step", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: {
        capturedPercent: 50,
        roomModel: {},
        discoveryConversation: [
          {
            stepId: "scale",
            question: "What is the approximate room or system scale?",
            answer: "Single large room",
            note: "",
            confidence: "low",
          },
        ],
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));

    // The capture chip's low-confidence tier rides through to the in-app
    // review so the rep re-verifies the row before export.
    expect(screen.getByText("Low confidence — verify before quote")).not.toBeNull();
  });

  it("shows exact topology cable lengths in the Step 2 Infrastructure row", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      discoveryBrief: {
        capturedPercent: 88,
        roomModel: {
          application: "Meeting room / boardroom",
          scale: "Single large room",
          longestRun: "Across a large room",
        },
        topology: {
          schemaVersion: 1,
          mode: "simple",
          locations: [
            { id: "loc-eq", name: "Equipment", type: "room-rack" },
            { id: "loc-disp", name: "Display", type: "display-wall" },
          ],
          devices: [
            { id: "dev-src", name: "Source", category: "source", locationId: "loc-eq", quantity: 1, thirdParty: true, status: "assumed" },
            { id: "dev-disp", name: "Display", category: "display", locationId: "loc-disp", quantity: 1, thirdParty: true, status: "assumed" },
          ],
          connections: [
            {
              id: "conn-video",
              fromDeviceId: "dev-src",
              toDeviceId: "dev-disp",
              services: ["video", "embedded-audio"],
              transport: "hdbaset-3",
              lengthMode: "estimated",
              lengthMetres: 47,
              estimateReason: "Exact cable length entered during discovery: 47 m",
              status: "assumed",
            },
            {
              id: "conn-usb",
              fromDeviceId: "dev-src",
              toDeviceId: "dev-disp",
              services: ["usb-3"],
              transport: "usb-extender",
              lengthMode: "estimated",
              lengthMetres: 7,
              estimateReason: "USB host-to-device planning distance 7 m",
              status: "assumed",
            },
          ],
          generatedFromDiscovery: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Requirements review/ }));

    // The Infrastructure row should show the exact topology figures, not just the discovery band.
    const infraLink = screen.getByRole("link", { name: /Edit Infrastructure in Discovery/ });
    expect(infraLink.textContent).toContain("47 m video");
    expect(infraLink.textContent).toContain("7 m USB");
  });

  it("blocks export with a chain-specific message when a TX has no matching RX in the BOM", () => {
    seedActiveProject();
    upsertStoredProject({
      ...readProjectStore().projects.find((project) => project.id === "acme-hq-boardroom")!,
      productSelections: [
        {
          sku: "NHD-120-TX",
          title: "NetworkHD 120 transmitter",
          category: "AV-over-IP endpoint",
          quantity: 1,
        },
      ],
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Review and export/ }));

    // The chain blocker should appear as a hard blocker in the technical release gate.
    const gate = screen.getByText(/Technical release gate/).closest("section")!;
    expect(gate.textContent).toContain("cannot be exported");
    expect(gate.textContent).toContain("NHD-120-TX");
    expect(gate.textContent).toMatch(/transmitter with no receiver/i);

    // The export buttons must remain disabled.
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
});
