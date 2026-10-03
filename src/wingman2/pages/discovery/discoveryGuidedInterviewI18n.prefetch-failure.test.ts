import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import {
  isInterviewLanguageLoaded,
  loadInterviewLanguage,
  prefetchInterviewLanguage,
} from "./discoveryGuidedInterviewI18n";

// Simulate a transient fetch failure for the es locale: the first dynamic
// import of the chunk rejects (offline blip during idle time), the second
// succeeds. The mock lives in its own file so it does not affect the other
// prefetch/loader tests.
const state = vi.hoisted(() => ({ importCount: 0 }));

vi.mock("./locales/locale-es", async () => {
  state.importCount += 1;
  if (state.importCount === 1) {
    throw new Error("simulated offline during idle prefetch");
  }
  const mod =
    await vi.importActual<typeof import("./locales/locale-es")>(
      "./locales/locale-es",
    );
  return mod;
});

describe("prefetchInterviewLanguage failure isolation", () => {
  it("leaves the registry untouched when the idle fetch fails, so the later load retries from scratch", async () => {
    expect(isInterviewLanguageLoaded("es")).toBe(false);

    // The prefetch itself resolves immediately (fire-and-forget hint); the
    // import fires on the deferred idle/setTimeout path.
    await prefetchInterviewLanguage("es");

    // Wait for the idle import to have actually fired and failed — it must
    // leave LOADED/LOADING untouched.
    await waitFor(() => expect(state.importCount).toBe(1));
    expect(isInterviewLanguageLoaded("es")).toBe(false);

    // The interview's own load must be a genuinely fresh attempt (a second
    // dynamic import) that succeeds — not a re-return of the cached rejection.
    await expect(loadInterviewLanguage("es")).resolves.toBeTruthy();
    expect(state.importCount).toBe(2);
    expect(isInterviewLanguageLoaded("es")).toBe(true);
  });
});
