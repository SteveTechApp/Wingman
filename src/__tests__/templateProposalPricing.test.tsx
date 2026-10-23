import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { upsertStoredProject } from "../wingman2/data/projectStore";
import { completeProjectServiceRows } from "../wingman2/lib/projectScope";
import { validateProposalExport } from "../wingman2/lib/proposalExportValidation";
import { roomTemplates } from "../wingman2/lib/roomTemplates";
import { templateBomRows, templateProducts } from "../wingman2/lib/templateReviewProposal";
import { defaultWallRequirements } from "../wingman2/lib/videowallOptions";
import { loadTemplateProposalPricing } from "../wingman2/lib/templateProposalPricing";
import { TemplateReviewPage } from "../wingman2/pages/TemplateReviewPage";

// Only the document write and the workspace read are stubbed: the pricing
// panel, its draft and the export are the real modules, because that is the
// path a rep takes to a proposal that quotes a total instead of TBC.
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

vi.mock("../wingman2/data/installationRateCard", async () => {
  const React = await import("react");
  return {
    useInstallationRateCard: rateCardStore.useInstallationRateCard,
    saveInstallationRateCard: rateCardStore.saveInstallationRateCard,
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

vi.mock("../wingman2/lib/proposalDocxExport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../wingman2/lib/proposalDocxExport")>();
  return { ...actual, exportProposalDocx: vi.fn(async () => undefined) };
});

import { exportProposalDocx } from "../wingman2/lib/proposalDocxExport";

/** The stock template whose export the validator will actually allow. */
function exportableTemplate() {
  return roomTemplates.find((template) => {
    const rows = completeProjectServiceRows(template.bom, template.id);
    return validateProposalExport({
      products: templateProducts(rows),
      bomRows: templateBomRows(template, rows),
    }).allowed;
  });
}

/**
 * A wall saved against this template is what gives it installation scope, and
 * the two details are the lines the pricing panel prices.
 */
function seedWallProject(template: NonNullable<ReturnType<typeof exportableTemplate>>) {
  const savedAt = "2026-10-20T09:00:00.000Z";
  upsertStoredProject({
    id: "template-wall-project",
    name: "Template wall",
    owner: "Wingman user",
    stage: "Templates",
    status: "recommended",
    updated: "Just now",
    resumeTo: "/wingman/templates",
    createdAt: savedAt,
    updatedAt: savedAt,
    discoveryBrief: { savedAt, roomModel: { sourceTemplateId: template.id } },
    videowall: {
      savedAt,
      wallType: "lcd",
      templateId: template.id,
      summary: {
        version: 2,
        requirements: {
          ...defaultWallRequirements,
          application: "lcd-direct",
          layout: "independent",
          columns: 2,
          rows: 1,
          sources: 1,
          windows: 1,
          measuredRuns: { "display-1": 3 },
          linkDetails: {
            "display-1": { enclosure: "Back box", termination: "HDMI faceplate" },
            "display-2": { enclosure: "Back box" },
          },
        },
      },
    },
  });
  return savedAt;
}

describe("template proposal pricing", () => {
  beforeEach(() => {
    window.localStorage.clear();
    rateCardStore.reset();
    vi.mocked(exportProposalDocx).mockClear();
  });

  it("prices equipment on the template page and exports those prices", async () => {
    const template = exportableTemplate();
    expect(template).toBeDefined();
    const bomRows = templateBomRows(template!, completeProjectServiceRows(template!.bom, template!.id));
    const sku = bomRows[0].sku;

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template!.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
    const unitPrice = screen.getByLabelText(`Unit price for ${sku}`);
    expect(unitPrice).toHaveValue(null);

    fireEvent.change(unitPrice, { target: { value: "100" } });

    // The price is kept with the template, so the next visit still has it.
    expect(loadTemplateProposalPricing(template!.id).bomUnitPrices[sku]).toBe("100");
    // And the panel says what the document would print now.
    expect(screen.getByTestId("template-pricing-status").textContent).toContain("Equipment £");

    fireEvent.click(screen.getByRole("button", { name: "Export proposal" }));

    await waitFor(() => expect(vi.mocked(exportProposalDocx)).toHaveBeenCalled());
    const wizard = vi.mocked(exportProposalDocx).mock.calls[0][2];
    expect(wizard.bomUnitPrices[sku]).toBe("100");
  });

  it("names the unpriced equipment lines at the readiness check before issue", () => {
    const template = exportableTemplate()!;
    const rows = completeProjectServiceRows(template.bom, template.id);
    const skus = [...new Set(templateBomRows(template, rows).map((row) => row.sku))];

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    // Both the readiness check and the export summary name what would print as
    // TBC, so a rep prices every line before the document is issued.
    const hold = screen.getByTestId("template-readiness-unpriced");
    expect(hold.textContent).toContain(`Still to price (${skus.length})`);
    expect(hold.textContent).toContain(skus[0]);
    expect(hold.textContent).toContain("prints these as TBC and holds the total");
    expect(screen.getByTestId("template-pricing-status").textContent).toContain(`equipment ${skus[0]}`);

    for (const sku of skus) {
      fireEvent.change(screen.getByLabelText(`Unit price for ${sku}`), { target: { value: "10" } });
    }

    // Nothing is unpriced, so the commercial hold goes away.
    expect(screen.queryByTestId("template-readiness-unpriced")).toBeNull();
    expect(screen.getByTestId("template-pricing-status").textContent).toContain("Every line is priced.");
  });

  it("starts installation rates from the saved rate card", async () => {
    const template = exportableTemplate()!;
    const sku = templateBomRows(template, completeProjectServiceRows(template.bom, template.id))[0].sku;
    // The card is the baseline the template's installation lines start at.
    const savedAt = seedWallProject(template);
    rateCardStore.seed({ updatedAt: savedAt, currency: "GBP", rates: { "install-enclosure-back-box": "120" } });

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    // The card prices the enclosure lines on both panels; termination stays for
    // the rep because the card knows no rate for it.
    const backBox = screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    await waitFor(() => expect(backBox.value).toBe("120"));
    expect((screen.getByRole("spinbutton", { name: "Unit rate for Termination — HDMI faceplate" }) as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("installation-rate-card").textContent).toContain("rate card saved 20 Oct 2026 (GBP)");
    // The readiness check names the survey line the card could not price, and
    // drops it as soon as the rep prices it.
    expect(screen.getByTestId("template-readiness-unpriced").textContent).toContain("Termination — HDMI faceplate");
    fireEvent.change(screen.getByRole("spinbutton", { name: "Unit rate for Termination — HDMI faceplate" }), { target: { value: "35" } });
    expect(screen.getByTestId("template-readiness-unpriced").textContent).not.toContain("Termination — HDMI faceplate");

    fireEvent.change(screen.getByLabelText(`Unit price for ${sku}`), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Export proposal" }));

    await waitFor(() => expect(vi.mocked(exportProposalDocx)).toHaveBeenCalled());
    const wizard = vi.mocked(exportProposalDocx).mock.calls[0][2];
    expect(wizard.installationUnitPrices["install-enclosure-back-box"]).toBe("120");
  });

  it("hints a cleared seeded rate and restores it in one tap", async () => {
    const template = exportableTemplate()!;
    const savedAt = seedWallProject(template);
    rateCardStore.seed({ updatedAt: savedAt, currency: "GBP", rates: { "install-enclosure-back-box": "120" } });

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    const backBox = () => screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    await waitFor(() => expect(backBox().value).toBe("120"));

    // Clearing the seeded rate is this proposal's exception: the line is unpriced
    // and the readiness check names it again.
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Display housing — Back box" }));
    expect(backBox().value).toBe("");
    expect(screen.getByTestId("template-readiness-unpriced").textContent).toContain("Display housing — Back box");

    // The card's number stays beside the empty cell as a hint, so the exception
    // is one tap from being undone.
    expect(screen.getByTestId("installation-card-hint-install-enclosure-back-box").textContent).toContain("Rate card: 120");

    fireEvent.click(screen.getByRole("button", { name: "Use rate card rate for Display housing — Back box" }));

    expect(backBox().value).toBe("120");
    expect(screen.queryByTestId("installation-card-hint-install-enclosure-back-box")).toBeNull();
    // Back on the card's rate, the line is priced again and marked as such.
    expect(screen.getByTestId("installation-seeded-install-enclosure-back-box")).toBeTruthy();
    expect(screen.getByTestId("template-readiness-unpriced").textContent).not.toContain("Display housing — Back box");
  });

  it("names the card's currency on a hint when the proposal is priced in another", async () => {
    const template = exportableTemplate()!;
    const savedAt = seedWallProject(template);
    rateCardStore.seed({ updatedAt: savedAt, currency: "GBP", rates: { "install-enclosure-back-box": "120" } });

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    const backBox = () => screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    await waitFor(() => expect(backBox().value).toBe("120"));

    // This quote is issued in USD while the card's numbers are written in GBP.
    fireEvent.change(screen.getByLabelText("Pricing currency"), { target: { value: "USD" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Display housing — Back box" }));

    expect(backBox().value).toBe("");
    expect(screen.getByTestId("installation-card-hint-install-enclosure-back-box").textContent).toContain("Rate card: 120 GBP");

    fireEvent.click(screen.getByRole("button", { name: "Use rate card rate for Display housing — Back box" }));

    // Only the number goes into the cell; the mismatch is still stated beside it
    // so the rep checks the rate before issuing.
    expect(backBox().value).toBe("120");
    expect(screen.getByTestId("installation-rate-card").textContent).toContain("priced in USD");
  });

  it("warns before export when a seeded rate came from a card in another currency", async () => {
    const template = exportableTemplate()!;
    const savedAt = seedWallProject(template);
    rateCardStore.seed({ updatedAt: savedAt, currency: "GBP", rates: { "install-enclosure-back-box": "120" } });

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    const backBox = () => screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    // The card fills the line, and this template is issued in another currency.
    await waitFor(() => expect(backBox().value).toBe("120"));
    fireEvent.change(screen.getByLabelText("Pricing currency"), { target: { value: "USD" } });

    fireEvent.click(screen.getByTestId("template-preissue-assumptions"));

    const warning = screen.getByText(/GBP rate card's number on a USD proposal/).closest("li");
    expect(warning?.textContent).toContain("currency");
    expect(warning?.textContent).toContain("Display housing — Back box");
    expect(warning?.textContent).toContain("Type that rate in USD");
    // The document still issues: the warning is what stops the mismatch being silent.
    expect(screen.getByRole("button", { name: /Export proposal/ })).not.toBeDisabled();

    // Typing this quote's own number clears the flag.
    fireEvent.click(screen.getByTestId("template-preissue-pricing"));
    fireEvent.change(backBox(), { target: { value: "155" } });
    expect(screen.queryByText(/GBP rate card's number on a USD proposal/)).toBeNull();
  });

  it("restores every cleared rate on the template page in one tap", async () => {
    const template = exportableTemplate()!;
    const savedAt = seedWallProject(template);
    // The card prices both survey lines, so both start seeded.
    rateCardStore.seed({
      updatedAt: savedAt,
      currency: "GBP",
      rates: { "install-enclosure-back-box": "120", "install-termination-hdmi-faceplate": "45" },
    });

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    const backBox = () => screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    const faceplate = () => screen.getByRole("spinbutton", { name: "Unit rate for Termination — HDMI faceplate" }) as HTMLInputElement;
    await waitFor(() => expect(backBox().value).toBe("120"));
    expect(faceplate().value).toBe("45");

    // This quote prices neither line, so both cells are cleared.
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Display housing — Back box" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Termination — HDMI faceplate" }));
    expect(backBox().value).toBe("");
    expect(faceplate().value).toBe("");

    // One action fills both, and the readiness check drops them together.
    fireEvent.click(screen.getByRole("button", { name: "Restore 2 rates from the GBP card" }));

    expect(backBox().value).toBe("120");
    expect(faceplate().value).toBe("45");
    expect(screen.queryByTestId("installation-restore-card-rates")).toBeNull();
    const readiness = screen.getByTestId("template-readiness-unpriced").textContent ?? "";
    expect(readiness).not.toContain("Display housing — Back box");
    expect(readiness).not.toContain("Termination — HDMI faceplate");
  });

  it("keeps a cleared rate cleared when the page is reopened, offering the card's number as a hint", async () => {
    const template = exportableTemplate()!;
    const savedAt = seedWallProject(template);
    rateCardStore.seed({
      updatedAt: savedAt,
      currency: "GBP",
      rates: { "install-enclosure-back-box": "120", "install-termination-hdmi-faceplate": "45" },
    });

    const view = () => (
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>
    );
    const backBox = () => screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;

    const { unmount } = render(view());
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
    await waitFor(() => expect(backBox().value).toBe("120"));
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Display housing — Back box" }));
    expect(backBox().value).toBe("");
    unmount();

    render(view());
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    // The clear is this proposal's exception, so the visit does not reprice the
    // line from the card: the cell stays empty and the rate is a hint again.
    await waitFor(() => expect(backBox().value).toBe(""));
    expect(screen.getByTestId("installation-card-hint-install-enclosure-back-box").textContent).toContain("Rate card: 120");
    expect(screen.queryByTestId("installation-seeded-install-enclosure-back-box")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Use rate card rate for Display housing — Back box" }));
    expect(backBox().value).toBe("120");
  });

  it("keeps the prices when the template page is reopened", () => {
    const template = exportableTemplate()!;
    const rows = completeProjectServiceRows(template.bom, template.id);
    const sku = templateBomRows(template, rows)[0].sku;

    const { unmount } = render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
    fireEvent.change(screen.getByLabelText(`Unit price for ${sku}`), { target: { value: "250.50" } });
    unmount();

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));

    expect(screen.getByLabelText(`Unit price for ${sku}`)).toHaveValue(250.5);
  });
});

describe("template page still-to-price restore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    rateCardStore.reset();
    vi.mocked(exportProposalDocx).mockClear();
  });

  it("offers one restore action on the page, in the block that reports the shortfall", async () => {
    const template = exportableTemplate()!;
    const savedAt = seedWallProject(template);
    rateCardStore.seed({
      updatedAt: savedAt,
      currency: "GBP",
      rates: { "install-enclosure-back-box": "120", "install-termination-hdmi-faceplate": "45" },
    });

    render(
      <MemoryRouter initialEntries={[`/wingman/templates/${template.id}`]}>
        <Routes>
          <Route path="/wingman/templates/:templateId" element={<TemplateReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Proposal" }));
    const backBox = () => screen.getByRole("spinbutton", { name: "Unit rate for Display housing — Back box" }) as HTMLInputElement;
    await waitFor(() => expect(backBox().value).toBe("120"));

    // One cleared line is enough to bring the block back, and the block is where
    // the page states the shortfall and prices it.
    fireEvent.click(screen.getByRole("button", { name: "Clear seeded rate for Display housing — Back box" }));
    const blockRestore = screen.getByTestId("template-readiness-restore-card-rates");
    expect(screen.getByTestId("template-readiness-unpriced").contains(blockRestore)).toBe(true);
    // The table below fills the same cells from the same map, so it carries no
    // second copy: two buttons one screen reader reads identically are one
    // action said twice.
    expect(screen.queryByTestId("installation-restore-card-rates")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Restore 1 rate from the GBP card" })).toHaveLength(1);

    fireEvent.click(blockRestore);

    expect(backBox().value).toBe("120");
    expect(screen.queryByTestId("template-readiness-restore-card-rates")).toBeNull();
  });
});
