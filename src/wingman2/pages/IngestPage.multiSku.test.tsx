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
    expect(screen.getByText("Blustream", { selector: "p" })).not.toBeNull();
    expect(screen.getByText("Pacific", { selector: "p" })).not.toBeNull();
    expect(screen.getByText("24", { selector: "p" })).not.toBeNull();
    expect(screen.getByText("HDBaseT extension product set")).not.toBeNull();
    expect(screen.getByText("Mirrored HDMI distribution opportunity")).not.toBeNull();
    expect(screen.getAllByText(/Sell-out\/distributor context detected/i).length).toBeGreaterThan(0);

    const skuTable = screen.getByText("Extracted competitor SKU table").closest("section");
    expect(skuTable).not.toBeNull();
    expect(within(skuTable as HTMLElement).getByText("UEX3C-KIT")).not.toBeNull();
    expect(within(skuTable as HTMLElement).getByText("SP18CS")).not.toBeNull();
    expect(within(skuTable as HTMLElement).getByText("PS122")).not.toBeNull();
    expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(25);

    expect(screen.getByRole("button", { name: "Batch compare grouped sets" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Create opportunity / save intelligence" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Generate response" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Create discovery questions" })).not.toBeNull();
  });

  it("saves competitor intelligence without adding competitor SKUs to product selections or BOM rows", () => {
    renderIngestPage();

    fireEvent.change(screen.getByPlaceholderText(/Paste the email, RFQ text/i), {
      target: { value: BLUSTREAM_PACIFIC_EMAIL_FIXTURE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode pasted request" }));
    fireEvent.click(screen.getByRole("button", { name: "Create opportunity / save intelligence" }));

    const project = readProjectStore().projects[0];
    expect(project.name).toBe("Pacific Multi-SKU Opportunity");
    expect(project.ingest?.multiSkuIntelligence?.skuCount).toBeGreaterThanOrEqual(24);
    expect(project.productSelections).toBeUndefined();
    expect(project.proposal?.bomRows).toBeUndefined();
    expect(screen.getByText(/Competitor SKUs were not added to the WyreStorm BOM/i)).not.toBeNull();
  });
});
