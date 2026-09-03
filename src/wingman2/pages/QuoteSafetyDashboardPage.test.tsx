import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QuoteSafetyDashboardPage from "./QuoteSafetyDashboardPage";

// QuoteSafetyDashboardPage's Export CSV handler revokes its blob URL on a
// later task so the browser can begin the download fetch against a still-live
// URL. This pins the deferral from the page suite: unrevoked synchronously,
// revoked with the exact created URL once the task queue drains.
describe("QuoteSafetyDashboardPage export deferral", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    Reflect.deleteProperty(URL, "revokeObjectURL");
    vi.restoreAllMocks();
  });

  it("exports the dashboard CSV and revokes the blob URL only after the download task starts", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:wingman-test-quote-safety");
    const revokeSpy = vi.fn();
    // revokeObjectURL is inherited in this environment; install an own,
    // spyable version so the deferred revoke can be observed.
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeSpy });

    render(
      <MemoryRouter initialEntries={["/wingman/quote-safety"]}>
        <QuoteSafetyDashboardPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    // Inside the synchronous click handler the URL must still be live.
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeSpy).not.toHaveBeenCalled();

    // Once the task queue drains, the exact created URL is revoked.
    await waitFor(() => expect(revokeSpy).toHaveBeenCalledWith("blob:wingman-test-quote-safety"));
  });
});
