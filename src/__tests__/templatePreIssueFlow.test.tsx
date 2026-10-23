import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplateProposalPanel } from "../wingman2/components/TemplateProposalPanel";
import { EMPTY_INSTALLATION_RATE_CARD, type InstallationRateCard } from "../wingman2/lib/installationRateCard";
import { buildInstallationSchedule, type InstallationSchedule, type InstallationUnitPrices } from "../wingman2/lib/installationSchedule";
import { defaultWallRequirements } from "../wingman2/lib/videowallOptions";
import { completeProjectServiceRows } from "../wingman2/lib/projectScope";
import type { ExportValidationBlocker, ExportValidationResult } from "../wingman2/lib/proposalExportValidation";
import { roomTemplates, type RoomTemplate } from "../wingman2/lib/roomTemplates";
import { templatePreIssueStageStorageKey } from "../wingman2/lib/templatePreIssuePass";
import { templateBomRows } from "../wingman2/lib/templateReviewProposal";
import {
  EMPTY_TEMPLATE_PRICING,
  templatePricingSummary,
  type TemplateProposalPricing,
} from "../wingman2/lib/templateProposalPricing";

const baseTemplate = roomTemplates[0];
const bomRows = templateBomRows(baseTemplate, completeProjectServiceRows(baseTemplate.bom, baseTemplate.id));
const unpriced = templatePricingSummary(bomRows, null, EMPTY_TEMPLATE_PRICING);
const priced = templatePricingSummary(bomRows, null, {
  ...EMPTY_TEMPLATE_PRICING,
  bomUnitPrices: Object.fromEntries(bomRows.map((row) => [row.sku, "100"])),
} satisfies TemplateProposalPricing);

/** A saved wall, so the walk has survey lines to price and a card to fill them. */
const wallSchedule: InstallationSchedule = buildInstallationSchedule({
  ...defaultWallRequirements,
  application: "lcd-direct",
  layout: "independent",
  columns: 2,
  rows: 1,
  sources: 1,
  linkDetails: {
    "display-1": { enclosure: "Back box", termination: "HDMI faceplate" },
  },
})!;
const wallLineIds = wallSchedule.lines.map((line) => line.id);
const wallRates: InstallationUnitPrices = Object.fromEntries(wallLineIds.map((id) => [id, "120"]));
const wallCard: InstallationRateCard = {
  updatedAt: "2026-10-20T09:00:00.000Z",
  currency: "GBP",
  rates: wallRates,
};
const emptyWallPricing = { ...EMPTY_TEMPLATE_PRICING, installationUnitPrices: {} };
const wallSummary = templatePricingSummary(bomRows, wallSchedule, emptyWallPricing);

const allowed: ExportValidationResult = { allowed: true, blockers: [], warnings: [], summary: "OK" };
const blocked = (blocker: ExportValidationBlocker): ExportValidationResult => ({
  allowed: false,
  blockers: [blocker],
  warnings: [],
  summary: "1 blocker",
});

/** The address the walk is on, so a test can see what it would send. */
function AddressProbe() {
  const location = useLocation();
  return <output data-testid="address">{`${location.pathname}${location.search}`}</output>;
}

/** A clipboard that records what the share action would paste. */
function stubClipboard(result: "resolve" | "reject" = "resolve") {
  const writeText = vi.fn(() =>
    result === "resolve" ? Promise.resolve() : Promise.reject(new Error("denied")),
  );
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  return writeText;
}

function panel({
  template = baseTemplate,
  validation = allowed,
  pricingSummary = unpriced,
  entry = "/wingman/templates/template-1",
  installation = null,
  pricing = EMPTY_TEMPLATE_PRICING,
  rateCard = EMPTY_INSTALLATION_RATE_CARD,
  onRestoreInstallationRates = vi.fn(),
}: {
  template?: RoomTemplate;
  validation?: ExportValidationResult;
  pricingSummary?: typeof unpriced;
  entry?: string;
  installation?: InstallationSchedule | null;
  pricing?: TemplateProposalPricing;
  rateCard?: InstallationRateCard;
  onRestoreInstallationRates?: (rates: InstallationUnitPrices) => void;
} = {}) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <TemplateProposalPanel
      template={template}
      validation={validation}
      readinessScore={72}
      pricingSummary={pricingSummary}
      surveyGaps={[]}
      onRecordSurveyDetail={null}
      pricing={pricing}
      bomRows={bomRows}
      installation={installation}
      rateCard={rateCard}
      rateCardError=""
      onCurrency={vi.fn()}
      onUnitPrice={vi.fn()}
      onInstallationRate={vi.fn()}
      onRestoreInstallationRates={onRestoreInstallationRates}
      onSaveRateCard={vi.fn()}
      onCreateProposal={vi.fn()}
      onExportProposal={vi.fn()}
      onExportSchedule={vi.fn()}
      onSaveProject={vi.fn()}
      onSaveTemplate={vi.fn()}
      />
      <AddressProbe />
    </MemoryRouter>
  );
}

function visible(testId: string) {
  return !screen.getByTestId(testId).hasAttribute("hidden");
}

describe("template pre-issue walk", () => {
  beforeEach(() => {
    // The stage is remembered per template, so one case must not hand its
    // reading to the next.
    window.localStorage.clear();
  });

  it("opens on the stage that has work and says what each stage holds", () => {
    const template = { ...baseTemplate, validationItems: ["Confirm lift access", "Confirm screen size"] };
    render(panel({ template }));

    // Money is the first job, so the walk opens on the lines that print TBC.
    expect(visible("template-preissue-panel-pricing")).toBe(true);
    expect(visible("template-preissue-panel-blockers")).toBe(false);
    expect(screen.getByTestId("template-preissue-status").textContent).toContain(
      `${unpriced.unpricedLines.length} lines print as TBC`,
    );
    expect(screen.getByTestId("template-preissue-pricing").textContent).toContain(
      `${unpriced.unpricedLines.length} print TBC`,
    );
    expect(screen.getByTestId("template-preissue-assumptions").textContent).toContain("2 labelled");
    expect(screen.getByTestId("template-preissue-issue").textContent).toContain("Ready to issue");
  });

  it("opens on the blockers when the document cannot leave, and holds the actions", () => {
    render(panel({
      validation: blocked({
        id: "reach-1",
        domain: "reach",
        severity: "blocker",
        message: "The 4K run exceeds passive HDMI reach.",
        fix: "Specify an active cable or a fibre extender.",
      }),
    }));

    expect(visible("template-preissue-panel-blockers")).toBe(true);
    expect(screen.getByTestId("template-preissue-status").textContent).toBe(
      "1 blocker must clear before this can issue.",
    );
    expect(screen.getByTestId("template-preissue-blockers").textContent).toContain("1 to clear");
    expect(screen.getByTestId("template-preissue-issue").textContent).toContain("Blocked");
    const blockers = screen.getByTestId("template-preissue-panel-blockers").textContent ?? "";
    expect(blockers).toContain("The 4K run exceeds passive HDMI reach.");
    // The fix travels with the blocker, so the stage says what clears it.
    expect(blockers).toContain("Specify an active cable or a fibre extender.");

    // The action bar stays in reach, and says why the export is held.
    const exportButton = screen.getByRole("button", { name: "Export proposal" });
    expect(exportButton).toBeDisabled();
    expect(exportButton.getAttribute("title")).toContain("1 blocker(s) must be resolved first");
  });

  it("walks forward to the issue and back again", () => {
    const template = { ...baseTemplate, validationItems: ["Confirm lift access"] };
    render(panel({ template }));

    fireEvent.click(screen.getByRole("button", { name: /Continue to Assumptions/ }));
    expect(visible("template-preissue-panel-assumptions")).toBe(true);
    expect(screen.getByText("Confirm lift access")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Continue to Issue/ }));
    expect(visible("template-preissue-panel-issue")).toBe(true);
    // The issue stage repeats what the document would say, not the actions.
    expect(screen.getByTestId("template-preissue-issue-summary").textContent).toContain(
      `${unpriced.unpricedLines.length} line`,
    );

    fireEvent.click(screen.getByRole("button", { name: /Back to Assumptions/ }));
    expect(visible("template-preissue-panel-assumptions")).toBe(true);
  });

  it("copies the stage being read, so sending a reading needs no address bar", async () => {
    const writeText = stubClipboard();
    render(panel());

    fireEvent.click(screen.getByTestId("template-preissue-assumptions"));
    fireEvent.click(screen.getByRole("button", { name: /Copy link to the Assumptions stage/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = new URL(writeText.mock.calls[0][0] as string);
    // An absolute address, because the paste target is usually chat or email.
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe("/wingman/templates/template-1");
    expect(new URLSearchParams(url.search).get("stage")).toBe("assumptions");
    // The control reports the copy, so the rep knows the address is on it.
    expect(screen.getByRole("button", { name: /Link to the Assumptions stage copied/ })).toBeTruthy();
  });

  it("names the stage the walk opens on, before the address carries one", async () => {
    const writeText = stubClipboard();
    render(panel());

    // Opening the walk is not a choice, so it is not written into the address —
    // which is exactly why the share action composes the link itself.
    expect(screen.getByTestId("address").textContent).toBe("/wingman/templates/template-1");
    fireEvent.click(screen.getByRole("button", { name: /Copy link to the Unpriced lines stage/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const url = new URL(writeText.mock.calls[0][0] as string);
    expect(new URLSearchParams(url.search).get("stage")).toBe("pricing");
  });

  it("says so when the browser refuses the clipboard", async () => {
    stubClipboard("reject");
    render(panel());

    fireEvent.click(screen.getByRole("button", { name: /Copy link to the Unpriced lines stage/ }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Could not copy the link to the Unpriced lines stage/ })).toBeTruthy(),
    );
  });

  it("jumps straight to a stage from the rail", () => {
    render(panel());

    fireEvent.click(screen.getByTestId("template-preissue-assumptions"));

    expect(visible("template-preissue-panel-assumptions")).toBe(true);
    expect(visible("template-preissue-panel-pricing")).toBe(false);
    // The rail is also the way back to the reading a rep has finished with.
    fireEvent.click(screen.getByTestId("template-preissue-pricing"));
    expect(visible("template-preissue-panel-pricing")).toBe(true);
  });

  it("reopens the stage the rep left when the tab is opened again", () => {
    const first = render(panel());
    fireEvent.click(screen.getByTestId("template-preissue-assumptions"));
    expect(visible("template-preissue-panel-assumptions")).toBe(true);
    first.unmount();

    // Leaving the tab unmounts the walk; a return continues the reading rather
    // than walking back to the first stage that has work.
    render(panel());
    expect(visible("template-preissue-panel-assumptions")).toBe(true);
    expect(visible("template-preissue-panel-pricing")).toBe(false);
  });

  it("keeps each template's reading to that template", () => {
    const first = render(panel());
    fireEvent.click(screen.getByTestId("template-preissue-issue"));
    expect(visible("template-preissue-panel-issue")).toBe(true);
    first.unmount();

    // Another template's page starts that template's own walk, so a rep never
    // lands on a reading they did not choose for this template.
    const other = render(panel({
      template: { ...baseTemplate, id: "template-other" },
      entry: "/wingman/templates/template-other",
    }));
    expect(visible("template-preissue-panel-pricing")).toBe(true);
    other.unmount();

    // And the first template still reopens its own stage.
    render(panel());
    expect(visible("template-preissue-panel-issue")).toBe(true);
  });

  it("writes the stage it moved to into the address, so the reading can be sent", () => {
    render(panel());

    fireEvent.click(screen.getByTestId("template-preissue-assumptions"));

    expect(screen.getByTestId("address").textContent).toBe("/wingman/templates/template-1?stage=assumptions");
  });

  it("opens on the stage an address names, ahead of this browser's reading", () => {
    window.localStorage.setItem(templatePreIssueStageStorageKey(baseTemplate.id), "pricing");

    render(panel({ entry: `/wingman/templates/${baseTemplate.id}?stage=assumptions` }));

    // The reading a colleague was sent outranks where this browser last was.
    expect(visible("template-preissue-panel-assumptions")).toBe(true);
    expect(visible("template-preissue-panel-pricing")).toBe(false);
  });

  it("ignores an address that names no stage of the walk", () => {
    render(panel({ entry: `/wingman/templates/${baseTemplate.id}?stage=cover` }));

    expect(visible("template-preissue-panel-pricing")).toBe(true);
  });

  it("ignores a remembered stage that names no stage of the walk", () => {
    window.localStorage.setItem(templatePreIssueStageStorageKey(baseTemplate.id), "cover page");

    render(panel());

    expect(visible("template-preissue-panel-pricing")).toBe(true);
  });

  it("starts at the issue when nothing is left to clear", () => {
    const template = { ...baseTemplate, validationItems: [] };
    render(panel({ template, pricingSummary: priced }));

    expect(visible("template-preissue-panel-issue")).toBe(true);
    expect(screen.getByTestId("template-preissue-status").textContent).toBe(
      "Every check is clear — ready to issue.",
    );
    expect(screen.getByRole("button", { name: "Export proposal" })).toBeEnabled();
    expect(screen.getByTestId("template-preissue-issue-summary").textContent).toContain("Every line is priced.");
  });
});

describe("template still-to-price restore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("fills the survey lines from the block that reports them, under its own action", () => {
    const onRestoreInstallationRates = vi.fn();
    render(panel({
      pricingSummary: wallSummary,
      installation: wallSchedule,
      pricing: emptyWallPricing,
      rateCard: wallCard,
      onRestoreInstallationRates,
    }));

    // The block that says which lines print as TBC carries the card's one tap,
    // and names it apart from the table's own restore on the same stage.
    const block = screen.getByTestId("template-readiness-unpriced");
    const blockRestore = screen.getByTestId("template-readiness-restore-card-rates");
    expect(block.contains(blockRestore)).toBe(true);
    expect(screen.getByTestId("installation-restore-card-rates")).not.toBeNull();
    expect(blockRestore.textContent).toBe(`Restore ${wallLineIds.length} rates from the GBP card`);

    fireEvent.click(blockRestore);

    // The same map the table's action writes: every survey line the card rates.
    expect(onRestoreInstallationRates).toHaveBeenCalledWith(wallRates);
  });

  it("offers no block restore for a template with no installation scope", () => {
    render(panel({ pricingSummary: unpriced }));

    expect(screen.queryByTestId("template-readiness-restore-card-rates")).toBeNull();
  });
});
