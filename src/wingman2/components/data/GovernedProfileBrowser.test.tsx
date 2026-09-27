import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GovernedProfileBrowser } from "./GovernedProfileBrowser";

// The GovernedProfileBrowser download handlers (Export CSV and Save Changes ->
// JSON) revoke their blob URLs on a later task so the browser can begin the
// download fetch against a still-live URL. These tests pin that deferral from
// the component: right after the click the URL must be unrevoked, and once the
// task queue drains the exact created URL is revoked.
describe("GovernedProfileBrowser download deferral", () => {
  afterEach(() => {
    // revokeObjectURL is inherited in this environment; remove the own
    // spyable copy installed by each test.
    Reflect.deleteProperty(URL, "revokeObjectURL");
    vi.restoreAllMocks();
  });

  function installBlobSpies(blobUrl: string) {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue(blobUrl);
    const revokeSpy = vi.fn();
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeSpy });
    return { createSpy, revokeSpy };
  }

  it("exports the CSV and revokes the blob URL only after the download task starts", async () => {
    const { createSpy, revokeSpy } = installBlobSpies("blob:wingman-test-governed-csv");
    render(<GovernedProfileBrowser />);

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    // Inside the synchronous click handler the URL must still be live.
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeSpy).not.toHaveBeenCalled();

    // Once the task queue drains, the exact created URL is revoked.
    await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith("blob:wingman-test-governed-csv"));
  });

  it("saves the governed profiles JSON and defers its revoke the same way", async () => {
    const { createSpy, revokeSpy } = installBlobSpies("blob:wingman-test-governed-json");
    render(<GovernedProfileBrowser />);

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeSpy).not.toHaveBeenCalled();

    await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith("blob:wingman-test-governed-json"));
  });

  it("filters from the warning and review-required summary links", () => {
    render(<GovernedProfileBrowser />);

    const statusFilter = screen.getByRole("combobox", { name: "Status filter" }) as HTMLSelectElement;
    const warnings = screen.getByRole("button", { name: /Filter by Warning status/i });
    const reviewRequired = screen.getByRole("button", { name: /Filter by Review required status/i });

    fireEvent.click(warnings);
    expect(statusFilter.value).toBe("verified-with-warning");
    expect(warnings.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(reviewRequired);
    expect(statusFilter.value).toBe("review-required");
    expect(reviewRequired.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(reviewRequired);
    expect(statusFilter.value).toBe("");
    expect(reviewRequired.getAttribute("aria-pressed")).toBe("false");
  });

  it("opens a dedicated record workspace from each row action", () => {
    render(<GovernedProfileBrowser />);

    fireEvent.click(screen.getByRole("button", { name: "Edit AMP-2120" }));
    expect(screen.getByRole("dialog", { name: "AMP-2120" })).not.toBeNull();
    const editor = screen.getByLabelText("Edit AMP-2120 profile");
    fireEvent.change(within(editor).getByLabelText("Role"), { target: { value: "Updated amplifier role" } });
    fireEvent.click(within(editor).getByRole("button", { name: "Apply edit" }));

    expect(screen.getByText("Updated amplifier role")).not.toBeNull();
  });

  it("provides the complete SKU record and validates full-record edits", () => {
    render(<GovernedProfileBrowser />);
    fireEvent.click(screen.getByRole("button", { name: "Edit AMP-2120" }));

    const fullRecord = screen.getByLabelText("Full record JSON for AMP-2120") as HTMLTextAreaElement;
    const record = JSON.parse(fullRecord.value);
    expect(record).toMatchObject({ sku: "AMP-2120", productClass: "AUDIO" });
    expect(Object.keys(record).length).toBeGreaterThan(10);

    record.role = "Full-record amplifier role";
    fireEvent.change(fullRecord, { target: { value: JSON.stringify(record, null, 2) } });
    fireEvent.click(screen.getByRole("button", { name: "Validate full record" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply edit" }));
    expect(screen.getByText("Full-record amplifier role")).not.toBeNull();
  });

  it("formats nested product data as logical form containers and writes it back to JSON", () => {
    render(<GovernedProfileBrowser />);
    fireEvent.click(screen.getByRole("button", { name: "Edit AMP-2120" }));

    fireEvent.change(screen.getByLabelText("Audio capabilities for AMP-2120"), { target: { value: "DSP\nBalanced audio\nPaging mute" } });
    const firstConnector = screen.getAllByLabelText("Connector")[0];
    fireEvent.change(firstConnector, { target: { value: "Updated XLR/TRS" } });

    const record = JSON.parse((screen.getByLabelText("Full record JSON for AMP-2120") as HTMLTextAreaElement).value);
    expect(record.audio).toEqual(["DSP", "Balanced audio", "Paging mute"]);
    expect(record.ports[0].connector).toBe("Updated XLR/TRS");
  });

  it("offers governed choices and Yes, No or N/A controls while preserving the JSON record", () => {
    render(<GovernedProfileBrowser />);
    fireEvent.click(screen.getByRole("button", { name: "Edit AMP-260-DNT" }));

    const role = screen.getByLabelText("Role") as HTMLInputElement;
    expect(role.getAttribute("list")).toContain("governed-role");
    expect(screen.queryByLabelText("Resolution")).toBeNull();
    expect((screen.getByLabelText("Video capabilities for AMP-260-DNT") as HTMLTextAreaElement).disabled).toBe(true);

    const dante = screen.getByRole("combobox", { name: "Features Dante" }) as HTMLSelectElement;
    expect(Array.from(dante.options).map((option) => option.textContent)).toEqual(["Yes", "No", "N/A"]);
    fireEvent.change(dante, { target: { value: "no" } });

    fireEvent.change(screen.getByRole("combobox", { name: "Add Transport" }), { target: { value: "Audio" } });
    fireEvent.click(screen.getByRole("button", { name: "Add port" }));
    expect((screen.getAllByLabelText("Category").at(-1) as HTMLInputElement).value).toBe("audio");

    const record = JSON.parse((screen.getByLabelText("Full record JSON for AMP-260-DNT") as HTMLTextAreaElement).value);
    expect(record.features.dante).toBe(false);
    expect(record.transport).toContain("Audio");
  });

  it("requires confirmation before deleting a row", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<GovernedProfileBrowser />);

    const deleteButton = screen.getByRole("button", { name: "Delete AMP-2120" });
    fireEvent.click(deleteButton);
    expect(screen.getByText("AMP-2120")).not.toBeNull();

    fireEvent.click(deleteButton);
    expect(confirm).toHaveBeenCalledWith("Delete governed profile AMP-2120 from this working set?");
    expect(screen.queryByText("AMP-2120")).toBeNull();
  });

  it("lets the signed-in administrator persist a governed review", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      sku: "APO-COM-MIC",
      verifiedBy: "admin@example.com",
      verifiedAt: "2026-09-25T07:30:00.000Z",
      confirmedFields: ["power"],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    render(<GovernedProfileBrowser reviewer="admin@example.com" />);

    const edit = screen.getByRole("button", { name: "Edit APO-COM-MIC" });
    const row = edit.closest("tr");
    fireEvent.click(edit);
    expect(screen.getByText("Signed as", { exact: false }).textContent).toContain("admin@example.com");
    fireEvent.click(screen.getByRole("button", { name: "Confirm review and mark verified" }));

    await waitFor(() => expect(within(row as HTMLTableRowElement).getByText("Verified")).not.toBeNull());
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({ sku: "APO-COM-MIC", verifiedBy: "admin@example.com", confirmedFields: ["power"] });
  });
});
