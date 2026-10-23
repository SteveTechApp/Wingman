import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  readProjectStore,
  setActiveProjectId,
  upsertStoredProject,
  type StoredDiscoveryBrief,
} from "../data/projectStore";
import { ProposalCompletionWizard } from "./ProposalCompletionWizard";
import { createProposalWizardDefaults, PROPOSAL_PRICING_GAP, saveProposalWizardDraft } from "../lib/proposalWizard";
import { setInstallChecked } from "../lib/siteSurveyStorage";
import { defaultWallRequirements } from "../lib/videowallOptions";

// The card lives on the signed-in rep's workspace now. These tests are about
// how the wizard uses the card, so the store is the seam: it answers with a
// card this test seeds and merges a save the way the workspace route does.
const rateCardStore = vi.hoisted(() => {
  type Card = { updatedAt: string; currency: string; rates: Record<string, string> };
  let card: Card = { updatedAt: "", currency: "GBP", rates: {} };
  const state = () => ({ card, status: "ready" as const, error: "" });
  return {
    get: () => card,
    seed: (next: Card) => { card = next; },
    reset: () => { card = { updatedAt: "", currency: "GBP", rates: {} }; },
    useInstallationRateCard: () => state(),
    saveInstallationRateCard: async (rates: Record<string, string>, currency: string) => {
      const usable = Object.fromEntries(Object.entries(rates).filter(([, value]) => String(value).trim() !== ""));
      card = { updatedAt: new Date().toISOString(), currency, rates: { ...card.rates, ...usable } };
      return state();
    },
  };
});

vi.mock("../data/installationRateCard", async () => {
  const React = await import("react");
  return {
    useInstallationRateCard: rateCardStore.useInstallationRateCard,
    saveInstallationRateCard: rateCardStore.saveInstallationRateCard,
    // The real hook seeds once per card revision; the fake keeps that rule so a
    // save made from this page is not re-applied over the rep's own edit.
    useInstallationRateCardSeed: (apply: (card: { updatedAt: string; currency: string; rates: Record<string, string> }) => void) => {
      const card = rateCardStore.get();
      const applied = React.useRef("");
      React.useEffect(() => {
        if (!card.updatedAt || applied.current === card.updatedAt) return;
        applied.current = card.updatedAt;
        apply(card);
      }, [card, apply]);
    },
  };
});

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
    rateCardStore.reset();
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

  it("prices the survey's install scope beside the equipment, one line per item", () => {
    seedExportReadyProject({ "display-1": 3, "display-2": 3 }, {
      linkDetails: {
        "display-1": { enclosure: "Back box", entry: "Ceiling void", termination: "Cat6A outlet" },
        "display-2": { enclosure: "Back box", entry: "Ceiling void", termination: "Cat6A outlet" },
      },
      displayMounts: { "display-2": "Tilt bracket" },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));

    // The survey's cells become scope, not prose: the same back box on both
    // panels is one line priced once at a quantity of two.
    const scope = document.querySelector("[data-proposal-installation]");
    expect(scope?.textContent).toContain("Installation scope from the site survey: 2 display housings, 1 mount, 2 terminations, 2 run entries across 4 wall links.");
    const backBox = document.querySelector('[data-installation-line="install-enclosure-back-box"]');
    expect(backBox?.textContent).toContain("Panel 1, Panel 2");
    const mount = document.querySelector('[data-installation-line="install-mount-tilt-bracket"]');
    expect(mount?.textContent).toContain("Panel 2");

    // The rep types the rate; nothing here invents one.
    const rate = screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" });
    expect((rate as HTMLInputElement).value).toBe("");
    fireEvent.change(rate, { target: { value: "120" } });
    expect((rate as HTMLInputElement).value).toBe("120");

    // An unpriced line holds the commercial section the way an unpriced
    // equipment row does: the readiness list names it instead of exporting.
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));
    expect(screen.getByText(/Enter a unit price for every included equipment and installation line/)).not.toBeNull();
  });

  it("starts installation rates from the workspace rate card and keeps overrides local", async () => {
    rateCardStore.seed({
      updatedAt: "2026-10-20T14:12:00.000Z",
      currency: "GBP",
      rates: { "install-enclosure-back-box": "120", "install-termination-cat6a-outlet": "35" },
    });
    seedExportReadyProject({ "display-1": 3, "display-2": 3 }, {
      linkDetails: {
        "display-1": { enclosure: "Back box", entry: "Ceiling void", termination: "Cat6A outlet" },
        "display-2": { enclosure: "Back box", entry: "Ceiling void", termination: "Cat6A outlet" },
      },
      displayMounts: { "display-2": "Tilt bracket" },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));

    // The card fills the lines this proposal has not priced...
    const backBox = screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    await waitFor(() => expect(backBox.value).toBe("120"));
    expect((screen.getByRole("spinbutton", { name: "Unit rate for Termination — Cat6A outlet" }) as HTMLInputElement).value).toBe("35");
    // ...and a line it does not know stays for the rep to price here.
    expect((screen.getByRole("spinbutton", { name: "Unit rate for Mount — Tilt bracket" }) as HTMLInputElement).value).toBe("");

    // An exception is typed on this proposal; the card keeps the baseline.
    fireEvent.change(backBox, { target: { value: "150" } });
    expect(backBox.value).toBe("150");
    expect(rateCardStore.get().rates["install-enclosure-back-box"]).toBe("120");

    // Saving merges this proposal's rates back over the card for the next one.
    fireEvent.click(screen.getByRole("button", { name: "Save as rate card" }));
    await waitFor(() => expect(rateCardStore.get().rates["install-enclosure-back-box"]).toBe("150"));
    expect(rateCardStore.get().rates["install-termination-cat6a-outlet"]).toBe("35");
  });

  it("refills every cleared installation line from the card in one tap, leaving typed lines alone", async () => {
    rateCardStore.seed({
      updatedAt: "2026-10-20T14:12:00.000Z",
      currency: "GBP",
      rates: { "install-enclosure-back-box": "120", "install-termination-cat6a-outlet": "35" },
    });
    seedExportReadyProject({ "display-1": 3, "display-2": 3 }, {
      linkDetails: {
        "display-1": { enclosure: "Back box", entry: "Ceiling void", termination: "Cat6A outlet" },
        "display-2": { enclosure: "Back box", entry: "Ceiling void", termination: "Cat6A outlet" },
      },
      displayMounts: { "display-2": "Tilt bracket" },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));

    const rate = (label: string) => screen.getByRole("spinbutton", { name: `Unit rate for ${label}` }) as HTMLInputElement;
    const backBox = rate("Display housing — Back box");
    const outlet = rate("Termination — Cat6A outlet");
    const mount = rate("Mount — Tilt bracket");
    await waitFor(() => expect(backBox.value).toBe("120"));
    expect(outlet.value).toBe("35");

    // This quote prices neither card line, and the mount is its own number.
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Display housing — Back box" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Termination — Cat6A outlet" }));
    fireEvent.change(mount, { target: { value: "40" } });
    expect(backBox.value).toBe("");
    expect(outlet.value).toBe("");

    // One action fills both cleared cells from the card and leaves the typed
    // rate exactly as the rep entered it.
    fireEvent.click(screen.getByRole("button", { name: "Restore 2 card rates" }));

    expect(backBox.value).toBe("120");
    expect(outlet.value).toBe("35");
    expect(mount.value).toBe("40");
    // Nothing is left to restore, so the action is gone rather than offered twice.
    expect(screen.queryByRole("button", { name: /Restore \d+ card rate/ })).toBeNull();
  });

  it("offers the card's one-tap restore on the readiness item that reports the gap", async () => {
    rateCardStore.seed({
      updatedAt: "2026-10-20T14:12:00.000Z",
      currency: "GBP",
      rates: { "install-enclosure-back-box": "120", "install-termination-cat6a-outlet": "35" },
    });
    seedExportReadyProject({ "display-1": 3, "display-2": 3 }, {
      linkDetails: {
        "display-1": { enclosure: "Back box", termination: "Cat6A outlet" },
        "display-2": { enclosure: "Back box", mount: "Tilt bracket", termination: "Cat6A outlet" },
      },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));

    const rate = (label: string) => screen.getByRole("spinbutton", { name: `Unit rate for ${label}` }) as HTMLInputElement;
    const backBox = rate("Display housing — Back box");
    const outlet = rate("Termination — Cat6A outlet");
    await waitFor(() => expect(backBox.value).toBe("120"));

    // The equipment and the mount are priced here, and both card lines are
    // cleared, so the only commercial gap left is what the card can fill.
    fireEvent.change(screen.getByRole("spinbutton", { name: "Unit price for MX-0402-MST" }), { target: { value: "900" } });
    fireEvent.change(rate("Mount — Tilt bracket"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Display housing — Back box" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Termination — Cat6A outlet" }));

    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    // The checklist names the unpriced lines, and the fix sits on that item
    // rather than a step away.
    expect(screen.getByText(PROPOSAL_PRICING_GAP)).not.toBeNull();
    const item = document.querySelector('[data-readiness-item="pricing"]');
    expect(item?.textContent).toContain(PROPOSAL_PRICING_GAP);
    const restore = screen.getByRole("button", { name: "Restore 2 rates from the GBP card" });
    expect(restore.getAttribute("title")).toContain("Equipment prices stay as entered");
    // The gap says how much one tap would clear, and that the cleared cells were
    // a decision rather than work left undone.
    expect(item?.textContent).toContain("Your GBP rate card fills 2 of these lines in one tap.");
    expect(document.querySelector('[data-readiness-exception="deliberately-unpriced"]')?.textContent)
      .toContain("2 lines were deliberately left unpriced");

    fireEvent.click(restore);

    // Filling both lines clears the item and retires the action.
    expect(screen.queryByText(PROPOSAL_PRICING_GAP)).toBeNull();
    expect(screen.queryByTestId("proposal-readiness-restore-card-rates")).toBeNull();
    expect(document.querySelector('[data-readiness-exception="deliberately-unpriced"]')).toBeNull();

    // It wrote the card's rates into the same draft the document prints.
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));
    expect(rate("Display housing — Back box").value).toBe("120");
    expect(rate("Termination — Cat6A outlet").value).toBe("35");
  });

  it("flags a card rate quoted in another currency before the document leaves", async () => {
    rateCardStore.seed({
      updatedAt: "2026-10-20T14:12:00.000Z",
      currency: "GBP",
      rates: { "install-enclosure-back-box": "120" },
    });
    const detail = { enclosure: "Back box", termination: "Cat6A outlet" };
    seedExportReadyProject({ "display-1": 3, "display-2": 3 }, {
      linkDetails: { "source-1": detail, "source-2": detail, "display-1": detail, "display-2": detail },
    });

    renderWizard();
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));

    const backBox = () => screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    await waitFor(() => expect(backBox().value).toBe("120"));

    // The quote is issued in USD while the cell holds the card's GBP number.
    fireEvent.click(screen.getByRole("button", { name: /Commercial and delivery/ }));
    fireEvent.change(screen.getByLabelText("Proposal currency"), { target: { value: "USD" } });

    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));

    const warning = [...document.querySelectorAll(".wm-proposal-validation-item--warning")]
      .find((entry) => entry.textContent?.includes("rate card"));
    expect(warning?.textContent).toContain("currency");
    expect(warning?.textContent).toContain("1 installation line still holds your GBP rate card's number on a USD proposal");
    expect(warning?.textContent).toContain("Display housing — Back box");
    expect(warning?.textContent).toContain("Fix: Type that rate in USD");
    // A warning, not a blocker: it is named before the document leaves.
    expect(screen.getByRole("button", { name: /Export formatted DOCX/ }).hasAttribute("disabled")).toBe(false);

    // Pricing this line at this job's own number clears it.
    fireEvent.click(screen.getByRole("button", { name: /Proposed solution/ }));
    fireEvent.change(backBox(), { target: { value: "155" } });
    fireEvent.click(screen.getByRole("button", { name: "Go to export" }));

    expect(screen.queryByText(/rate card's number on a USD proposal/)).toBeNull();
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

  it.each(["draft", "pending", "rejected"] as const)("allows an unpriced response with incomplete discovery and %s team review", (approvalStatus) => {
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
