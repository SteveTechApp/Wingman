import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { readProjectStore } from "../data/projectStore";
import { BLUSTREAM_PACIFIC_EMAIL_FIXTURE } from "../lib/documentIngest/blustreamPacific.fixture";
import { IngestPage } from "./IngestPage";

function renderIngestPage() {
  render(
    <MemoryRouter initialEntries={["/wingman/ingest"]}>
      <IngestPage />
    </MemoryRouter>,
  );
}

describe("IngestPage multi-SKU competitor intelligence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the Blustream/Pacific email as a grouped batch analysis", () => {
    renderIngestPage();

    fireEvent.change(screen.getByPlaceholderText(/Paste the email, RFQ text/i), {
      target: { value: BLUSTREAM_PACIFIC_EMAIL_FIXTURE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode pasted request" }));

    expect(screen.getByText("multi_sku_competitor_list")).not.toBeNull();
    expect(screen.getByText("Blustream / Pacific", { selector: "p" })).not.toBeNull();
    expect(screen.getByText("24", { selector: "p" })).not.toBeNull();
    expect(screen.getByText("HDBaseT extension product set")).not.toBeNull();
    expect(screen.getByText("Mirrored HDMI distribution opportunity")).not.toBeNull();
    expect(screen.getAllByText(/Sell-out\/distributor context detected/i).length).toBeGreaterThan(0);

    const skuTable = screen.getByText("Main candidate table").closest("section");
    expect(skuTable).not.toBeNull();
    expect(within(skuTable as HTMLElement).getByText("UEX3C-KIT")).not.toBeNull();
    expect(within(skuTable as HTMLElement).getByText("SP18CS")).not.toBeNull();
    expect(within(skuTable as HTMLElement).getByText("PS122")).not.toBeNull();
    expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(20);

    expect(screen.getByRole("button", { name: /Batch compare selected candidates/ })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Create opportunity from candidates" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Generate sales response" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Generate discovery questions" })).not.toBeNull();
  });

  it("saves competitor intelligence without adding competitor SKUs to product selections or BOM rows", () => {
    renderIngestPage();

    fireEvent.change(screen.getByPlaceholderText(/Paste the email, RFQ text/i), {
      target: { value: BLUSTREAM_PACIFIC_EMAIL_FIXTURE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode pasted request" }));
    fireEvent.click(screen.getByRole("button", { name: "Create opportunity from candidates" }));

    const project = readProjectStore().projects[0];
    expect(project.name).toBe("Pacific Multi-SKU Opportunity");
    expect(project.ingest?.multiSkuIntelligence?.skuCount).toBeGreaterThanOrEqual(24);
    const savedTriage = project.ingest?.multiSkuIntelligence?.triage;
    expect(savedTriage?.batchEligibleRowIds.length).toBeGreaterThan(0);
    expect(savedTriage?.batchEligibleRowIds.every((id) =>
      savedTriage.rows.some((row) => row.id === id && row.batchCompareEligible))).toBe(true);
    expect(savedTriage?.batchEligibleRowIds).not.toContain(savedTriage?.rows.find((row) => row.sku === "PS122")?.id);
    expect(project.productSelections).toBeUndefined();
    expect(project.proposal?.bomRows).toBeUndefined();
    expect(screen.getByText(/Competitor SKUs were not added to the WyreStorm BOM/i)).not.toBeNull();
  });

  it("keeps noise out of the default batch queue and exposes it in a collapsible review table", () => {
    renderIngestPage();

    fireEvent.change(screen.getByPlaceholderText(/Paste the email, RFQ text/i), {
      target: {
        value: `Blustream,HEX100CS-KIT,HDBaseT extender kit
Blustream,C44CS-KIT,4x4 HDBaseT matrix
Blustream,PS122,power supply
Samsung,QM55B,commercial display
Chief,XTM1U,display bracket
Generic 42U equipment rack
CAT6 cable 100m
Unknown,ABC-999,mystery item`,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode pasted request" }));

    expect(screen.getAllByText("wyrestorm_candidate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("architecture_alternative").length).toBeGreaterThan(0);
    expect(screen.getAllByText("accessory_dependency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("unknown_review_required").length).toBeGreaterThan(0);
    expect(screen.queryByText("QM55B")).toBeNull();

    const batchButton = screen.getByRole("button", { name: /Batch compare selected candidates \(2\)/ });
    fireEvent.click(batchButton);
    expect(screen.getByText("Eligible batch compare queue")).not.toBeNull();
    expect(screen.queryByText(/Samsung QM55B —/)).toBeNull();
    expect(screen.queryByText(/Blustream PS122 —/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ignored \/ noisy items/i }));
    expect(screen.getByText("QM55B")).not.toBeNull();
    expect(screen.getByText("XTM1U")).not.toBeNull();
    expect(screen.getAllByText(/Generic 42U equipment rack/i).length).toBeGreaterThan(1);
  });
});
