import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
});
