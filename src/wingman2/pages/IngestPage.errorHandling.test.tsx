import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { readProjectStore } from "../data/projectStore";
import { BLUSTREAM_PACIFIC_EMAIL_FIXTURE } from "../../__tests__/fixtures/documentIngest/blustreamPacific.fixture";

vi.mock("../lib/documentExtract", () => ({
  extractDocuments: vi.fn().mockRejectedValue(new Error("mammoth failed to parse the file")),
}));

import { IngestPage } from "./IngestPage";

function renderIngestPage() {
  render(
    <MemoryRouter initialEntries={["/wingman/ingest"]}>
      <IngestPage />
    </MemoryRouter>,
  );
}

describe("IngestPage error handling", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows an error instead of hanging when file extraction throws", async () => {
    renderIngestPage();

    const fileInput = document.querySelector('input[type="file"]:not([accept*="image"])') as HTMLInputElement;
    const file = new File(["not real content"], "brief.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText("Wingman could not complete the decode.")).not.toBeNull();
    expect(await screen.findByText(/Could not read the uploaded files: mammoth failed to parse the file/)).not.toBeNull();
  });

  it("warns instead of silently dropping the analysis when there is no active project", () => {
    renderIngestPage();

    fireEvent.change(screen.getByPlaceholderText(/Paste the email, RFQ text/i), {
      target: { value: BLUSTREAM_PACIFIC_EMAIL_FIXTURE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Decode pasted request" }));

    expect(screen.getByText("Not saved to a project.")).not.toBeNull();
    expect(readProjectStore().projects.every((project) => project.isDemo)).toBe(true);
  });
});
